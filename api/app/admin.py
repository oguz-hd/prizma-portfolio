import json
from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlmodel import Session, SQLModel, delete, select

from app import media as media_files
from app.auth import get_current_admin
from app.content import LOCALES, PARAGRAPH_SEPARATOR, build_content
from app.db import SessionDep
from app.models import (
    Link,
    Media,
    Milestone,
    Profile,
    Project,
    Section,
    SectionMedia,
    SiteSettings,
    SkillGroup,
    Translation,
)
from app.publish import publish
from app.schemas import (
    BUILTIN_KINDS,
    GalleryIn,
    LinkCreate,
    LinkIn,
    LocalizedList,
    LocalizedText,
    MediaAltIn,
    MediaOut,
    MilestoneCreate,
    MilestoneIn,
    MilestoneKind,
    MilestoneOrderIn,
    OrderIn,
    ProfileIn,
    ProjectCreate,
    ProjectIn,
    SectionCreate,
    SectionIn,
    SettingsIn,
    SiteContentOut,
    SkillGroupCreate,
    SkillGroupIn,
    TimelineItemCreate,
)

"""
Yönetim uç noktaları (Faz 7a) — paneli (Faz 7b) besliyor.

Hepsi JWT ister (router düzeyinde `get_current_admin`). Her yazma aynı yolu izler:
veritabanı → commit → publish() → /data/content.json güncel (docs/ARCHITECTURE.md § 3).

Okuma: `GET /api/admin/content` — herkese açık içerikle aynı şekil, artı gizli
bölümler, yayında olmayan projeler ve medya kitaplığı (Faz 9). Yazmalar 204 döner;
panel kaydettikten sonra içeriği yeniden çeker.

⚠️ Sıralama yolları (`…/order`) kimlikli yollardan ÖNCE tanımlı: FastAPI yolları
sırayla eşliyor, sonra tanımlansa "order" bir kayıt kimliği sanılırdı (schemas.py
→ Slug bu adı yasaklıyor).
"""

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])

NO_CONTENT = status.HTTP_204_NO_CONTENT

#: Sırası olan kayıtlar — hepsinde `id` ve `order` var.
type Ordered = SkillGroup | Milestone | Link | Section | Project


# ── Ortak ─────────────────────────────────────────────────────────────────────


def _save(session: Session) -> None:
    session.commit()
    publish(session)


def _write_texts(
    session: Session, entity: str, entity_id: str, **fields: LocalizedText | LocalizedList | None
) -> None:
    """
    Alanların çevirilerini baştan yazar. Boş dil hiç yazılmıyor — okurken yokluğu
    boş metin sayılıyor (content.py → Translations), yani `None` = alan yok.
    """
    for field, value in fields.items():
        session.exec(
            delete(Translation).where(
                Translation.entity == entity,
                Translation.entity_id == entity_id,
                Translation.field == field,
            )
        )
        if value is None:
            continue
        for locale in LOCALES:
            text = getattr(value, locale)
            if isinstance(text, list):  # paragraflar → tek metin (models.py → Translation)
                text = PARAGRAPH_SEPARATOR.join(text)
            if text:
                session.add(
                    Translation(
                        entity=entity, entity_id=entity_id, field=field, locale=locale, value=text
                    )
                )


def _get[M: SQLModel](session: Session, model: type[M], item_id: str) -> M:
    row = session.get(model, item_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"'{item_id}' bulunamadı")
    return row


def _ensure_new(session: Session, model: type[SQLModel], item_id: str) -> None:
    if session.get(model, item_id) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"'{item_id}' zaten var")


def _next_order(rows: Sequence[Ordered]) -> int:
    """Yeni kayıt listenin sonuna."""
    return max((r.order for r in rows), default=0) + 1


def _reorder(session: Session, rows: Sequence[Ordered], ids: list[str]) -> None:
    by_id = {r.id: r for r in rows}
    # Panel eski bir listeyle gelirse (başka sekmede ekleme/silme) kayıt kaybolmasın.
    if sorted(ids) != sorted(by_id):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Sıra listesi güncel değil: kayıtların tamamı, her biri bir kez olmalı",
        )
    for position, item_id in enumerate(ids, start=1):
        by_id[item_id].order = position
    _save(session)


def _delete(session: Session, model: type[SQLModel], entity: str, item_id: str) -> None:
    session.delete(_get(session, model, item_id))
    session.exec(
        delete(Translation).where(Translation.entity == entity, Translation.entity_id == item_id)
    )
    _save(session)


# ── Ayarlar ve profil (tek satır) ─────────────────────────────────────────────


@router.put("/settings", status_code=NO_CONTENT)
def update_settings(data: SettingsIn, session: SessionDep) -> None:
    row = session.get(SiteSettings, "settings") or SiteSettings()
    row.preset = data.preset
    session.add(row)
    _write_texts(
        session, "settings", "settings",
        metaTitle=data.meta_title, metaDescription=data.meta_description,
    )
    _save(session)


@router.put("/profile", status_code=NO_CONTENT)
def update_profile(data: ProfileIn, session: SessionDep) -> None:
    row = session.get(Profile, "profile") or Profile(name=data.name)
    row.name = data.name
    session.add(row)
    _write_texts(
        session, "profile", "profile",
        title=data.title, location=data.location, tagline=data.tagline, bio=data.bio,
    )
    _save(session)


# ── Yetenekler ────────────────────────────────────────────────────────────────


def _apply_skill(session: Session, row: SkillGroup, data: SkillGroupIn) -> None:
    row.items = json.dumps(data.items, ensure_ascii=False)
    session.add(row)
    _write_texts(session, "skill", row.id, group=data.group, note=data.note)
    _save(session)


@router.post("/skills", status_code=NO_CONTENT)
def create_skill(data: SkillGroupCreate, session: SessionDep) -> None:
    _ensure_new(session, SkillGroup, data.id)
    order = _next_order(session.exec(select(SkillGroup)).all())
    _apply_skill(session, SkillGroup(id=data.id, items="[]", order=order), data)


@router.put("/skills/order", status_code=NO_CONTENT)
def order_skills(data: OrderIn, session: SessionDep) -> None:
    _reorder(session, session.exec(select(SkillGroup)).all(), data.ids)


@router.put("/skills/{skill_id}", status_code=NO_CONTENT)
def update_skill(skill_id: str, data: SkillGroupIn, session: SessionDep) -> None:
    _apply_skill(session, _get(session, SkillGroup, skill_id), data)


@router.delete("/skills/{skill_id}", status_code=NO_CONTENT)
def delete_skill(skill_id: str, session: SessionDep) -> None:
    _delete(session, SkillGroup, "skill", skill_id)


# ── Deneyim ve eğitim (tek tablo, `kind`) ────────────────────────────────────


def _milestones(session: Session, kind: MilestoneKind) -> Sequence[Milestone]:
    return session.exec(
        select(Milestone).where(Milestone.kind == kind, Milestone.section_id == None)  # noqa: E711
    ).all()


def _apply_milestone(session: Session, row: Milestone, data: MilestoneIn) -> None:
    row.org = data.org
    row.period = data.period
    session.add(row)
    _write_texts(session, "milestone", row.id, role=data.role, note=data.note)
    _save(session)


@router.post("/milestones", status_code=NO_CONTENT)
def create_milestone(data: MilestoneCreate, session: SessionDep) -> None:
    _ensure_new(session, Milestone, data.id)
    order = _next_order(_milestones(session, data.kind))
    row = Milestone(id=data.id, kind=data.kind, org=data.org, order=order)
    _apply_milestone(session, row, data)


@router.put("/milestones/order", status_code=NO_CONTENT)
def order_milestones(data: MilestoneOrderIn, session: SessionDep) -> None:
    _reorder(session, _milestones(session, data.kind), data.ids)


@router.put("/milestones/{milestone_id}", status_code=NO_CONTENT)
def update_milestone(milestone_id: str, data: MilestoneIn, session: SessionDep) -> None:
    """Tür (`kind`) değişmez — deneyimden eğitime taşımak: sil + oluştur."""
    _apply_milestone(session, _get(session, Milestone, milestone_id), data)


@router.delete("/milestones/{milestone_id}", status_code=NO_CONTENT)
def delete_milestone(milestone_id: str, session: SessionDep) -> None:
    _delete(session, Milestone, "milestone", milestone_id)


# ── Bağlantılar ───────────────────────────────────────────────────────────────


def _apply_link(session: Session, row: Link, data: LinkIn) -> None:
    row.href = data.href
    row.icon = data.icon
    session.add(row)
    _write_texts(session, "link", row.id, label=data.label)
    _save(session)


@router.post("/links", status_code=NO_CONTENT)
def create_link(data: LinkCreate, session: SessionDep) -> None:
    _ensure_new(session, Link, data.id)
    order = _next_order(session.exec(select(Link)).all())
    _apply_link(session, Link(id=data.id, href=data.href, order=order), data)


@router.put("/links/order", status_code=NO_CONTENT)
def order_links(data: OrderIn, session: SessionDep) -> None:
    _reorder(session, session.exec(select(Link)).all(), data.ids)


@router.put("/links/{link_id}", status_code=NO_CONTENT)
def update_link(link_id: str, data: LinkIn, session: SessionDep) -> None:
    _apply_link(session, _get(session, Link, link_id), data)


@router.delete("/links/{link_id}", status_code=NO_CONTENT)
def delete_link(link_id: str, session: SessionDep) -> None:
    _delete(session, Link, "link", link_id)


# ── Okuma ─────────────────────────────────────────────────────────────────────


@router.get("/content", response_model_exclude_none=True)
def read_admin_content(session: SessionDep) -> SiteContentOut:
    """Panelin içeriği: herkese açık olanın tamamı + gizliler + medya kitaplığı."""
    return build_content(session, admin=True)


# ── Bölümler ──────────────────────────────────────────────────────────────────
# Hazır türler (about, experience, contact) silinmez, gizlenir; panelden eklenen
# türler (schemas.py → AddableKind) silinir. Bileşeni tür seçiyor (web/src/App.tsx).

#: Sitede başka bir öğenin kimliği: girişin slaytı `#ust` (Hero.tsx).
RESERVED_SECTION_IDS = {"ust"}


def _apply_section(session: Session, row: Section, data: SectionIn) -> None:
    announcement = row.kind == "announcement"
    if not announcement and (data.link or data.starts_on or data.ends_on):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Bağlantı ve yayın tarihleri yalnızca duyuru bölümünde",
        )
    if data.visible is not None:
        row.visible = data.visible
    if announcement:
        row.link_href = data.link.href if data.link else None
        row.starts_on = data.starts_on.isoformat() if data.starts_on else None
        row.ends_on = data.ends_on.isoformat() if data.ends_on else None
    session.add(row)
    _write_texts(
        session, "section", row.id,
        heading=data.heading, nav_label=data.nav_label, body=data.body,
        link_label=data.link.label if data.link else None,
    )
    _save(session)


def _section_of_kind(session: Session, section_id: str, kind: str) -> Section:
    row = _get(session, Section, section_id)
    if row.kind != kind:
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail=f"'{section_id}' bir {kind} bölümü değil"
        )
    return row


@router.post("/sections", status_code=NO_CONTENT)
def create_section(data: SectionCreate, session: SessionDep) -> None:
    if data.id in RESERVED_SECTION_IDS:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"'{data.id}' ayrılmış bir ad")
    _ensure_new(session, Section, data.id)
    order = _next_order(session.exec(select(Section)).all())
    row = Section(id=data.id, slug=data.id, kind=data.kind, order=order)
    _apply_section(session, row, data)


@router.put("/sections/order", status_code=NO_CONTENT)
def order_sections(data: OrderIn, session: SessionDep) -> None:
    _reorder(session, session.exec(select(Section)).all(), data.ids)


@router.put("/sections/{section_id}", status_code=NO_CONTENT)
def update_section(section_id: str, data: SectionIn, session: SessionDep) -> None:
    _apply_section(session, _get(session, Section, section_id), data)


@router.delete("/sections/{section_id}", status_code=NO_CONTENT)
def delete_section(section_id: str, session: SessionDep) -> None:
    row = _get(session, Section, section_id)
    if row.kind in BUILTIN_KINDS:
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="Hazır bölümler silinmez — gizleyebilirsin"
        )
    # Bağlı kayıtlar: zaman çizelgesi maddeleri ve galeri satırları (+ çevirileri).
    for m in _items(session, section_id):
        session.delete(m)
        session.exec(delete(Translation).where(
            Translation.entity == "milestone", Translation.entity_id == m.id
        ))
    _clear_gallery(session, section_id)
    _delete(session, Section, "section", section_id)


# ── Zaman çizelgesi bölümünün maddeleri (milestones, section_id) ─────────────


def _items(session: Session, section_id: str) -> Sequence[Milestone]:
    return session.exec(select(Milestone).where(Milestone.section_id == section_id)).all()


def _item(session: Session, section_id: str, item_id: str) -> Milestone:
    row = _get(session, Milestone, item_id)
    if row.section_id != section_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"'{item_id}' bu bölümde yok")
    return row


@router.post("/sections/{section_id}/items", status_code=NO_CONTENT)
def create_item(section_id: str, data: TimelineItemCreate, session: SessionDep) -> None:
    _section_of_kind(session, section_id, "timeline")
    _ensure_new(session, Milestone, data.id)
    row = Milestone(
        id=data.id, kind="timeline", section_id=section_id, org=data.org,
        order=_next_order(_items(session, section_id)),
    )
    _apply_milestone(session, row, data)


@router.put("/sections/{section_id}/items/order", status_code=NO_CONTENT)
def order_items(section_id: str, data: OrderIn, session: SessionDep) -> None:
    _section_of_kind(session, section_id, "timeline")
    _reorder(session, _items(session, section_id), data.ids)


@router.put("/sections/{section_id}/items/{item_id}", status_code=NO_CONTENT)
def update_item(section_id: str, item_id: str, data: MilestoneIn, session: SessionDep) -> None:
    _apply_milestone(session, _item(session, section_id, item_id), data)


@router.delete("/sections/{section_id}/items/{item_id}", status_code=NO_CONTENT)
def delete_item(section_id: str, item_id: str, session: SessionDep) -> None:
    _item(session, section_id, item_id)
    _delete(session, Milestone, "milestone", item_id)


# ── Galeri bölümünün görselleri ──────────────────────────────────────────────


def _clear_gallery(session: Session, section_id: str) -> None:
    session.exec(delete(SectionMedia).where(SectionMedia.section_id == section_id))
    session.exec(delete(Translation).where(
        Translation.entity == "section_media",
        Translation.entity_id.startswith(f"{section_id}:"),  # type: ignore[union-attr]
    ))


@router.put("/sections/{section_id}/media", status_code=NO_CONTENT)
def set_gallery(section_id: str, data: GalleryIn, session: SessionDep) -> None:
    """Liste baştan yazılır: sıra, ekleme, çıkarma tek istekte."""
    _section_of_kind(session, section_id, "gallery")
    ids = [item.media_id for item in data.items]
    if len(set(ids)) != len(ids):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Aynı görsel iki kez")
    for media_id in ids:
        _get(session, Media, media_id)
    _clear_gallery(session, section_id)
    for position, item in enumerate(data.items, start=1):
        session.add(SectionMedia(section_id=section_id, media_id=item.media_id, order=position))
        _write_texts(
            session, "section_media", f"{section_id}:{item.media_id}", caption=item.caption
        )
    _save(session)


# ── Projeler ─────────────────────────────────────────────────────────────────
# Kayıtlar her zaman yönetilir; sitede yalnızca bir "projects" bölümü varsa görünür.


def _apply_project(session: Session, row: Project, data: ProjectIn) -> None:
    if data.cover_media_id:
        _get(session, Media, data.cover_media_id)
    row.tech = json.dumps(data.tech, ensure_ascii=False)
    row.repo_url = data.repo_url
    row.live_url = data.live_url
    row.published = data.published
    row.cover_media_id = data.cover_media_id
    session.add(row)
    _write_texts(
        session, "project", row.id,
        title=data.title, summary=data.summary, description=data.description,
    )
    _save(session)


@router.post("/projects", status_code=NO_CONTENT)
def create_project(data: ProjectCreate, session: SessionDep) -> None:
    _ensure_new(session, Project, data.id)
    order = _next_order(session.exec(select(Project)).all())
    _apply_project(session, Project(id=data.id, slug=data.id, tech="[]", order=order), data)


@router.put("/projects/order", status_code=NO_CONTENT)
def order_projects(data: OrderIn, session: SessionDep) -> None:
    _reorder(session, session.exec(select(Project)).all(), data.ids)


@router.put("/projects/{project_id}", status_code=NO_CONTENT)
def update_project(project_id: str, data: ProjectIn, session: SessionDep) -> None:
    _apply_project(session, _get(session, Project, project_id), data)


@router.delete("/projects/{project_id}", status_code=NO_CONTENT)
def delete_project(project_id: str, session: SessionDep) -> None:
    _delete(session, Project, "project", project_id)


# ── Medya ────────────────────────────────────────────────────────────────────
# Dosya işleri media.py'de (WebP'ye çevirme, EXIF/GPS silme); burada kayıt ve kullanım.


@router.post("/media", status_code=status.HTTP_201_CREATED)
def upload_media(file: UploadFile, session: SessionDep) -> MediaOut:
    # `def` (async değil): Pillow ağır iş — iş parçacığı havuzunda çalışsın, olay
    # döngüsünü tutmasın. Sınırın bir bayt fazlası okunuyor: büyükse store() reddediyor.
    row = media_files.store(file.file.read(media_files.MAX_BYTES + 1))
    session.add(row)
    _save(session)
    return MediaOut(
        id=row.id, width=row.width, height=row.height, widths=json.loads(row.widths),
        alt=LocalizedText(),
    )


@router.put("/media/{media_id}", status_code=NO_CONTENT)
def update_media(media_id: str, data: MediaAltIn, session: SessionDep) -> None:
    _get(session, Media, media_id)
    _write_texts(session, "media", media_id, alt=data.alt)
    _save(session)


@router.delete("/media/{media_id}", status_code=NO_CONTENT)
def delete_media(media_id: str, session: SessionDep) -> None:
    row = _get(session, Media, media_id)
    galleries = session.exec(select(SectionMedia).where(SectionMedia.media_id == media_id)).all()
    covers = session.exec(select(Project).where(Project.cover_media_id == media_id)).all()
    used = [f"galeri '{g.section_id}'" for g in galleries] + [f"proje '{p.id}'" for p in covers]
    if used:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Kullanılıyor: " + ", ".join(used))
    _delete(session, Media, "media", media_id)
    media_files.remove_files(row)
