import json
from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, SQLModel, delete, select

from app.auth import get_current_admin
from app.content import LOCALES, PARAGRAPH_SEPARATOR
from app.db import SessionDep
from app.models import Link, Milestone, Profile, Section, SiteSettings, SkillGroup, Translation
from app.publish import publish
from app.schemas import (
    LinkCreate,
    LinkIn,
    LocalizedList,
    LocalizedText,
    MilestoneCreate,
    MilestoneIn,
    MilestoneKind,
    MilestoneOrderIn,
    OrderIn,
    ProfileIn,
    SectionIn,
    SettingsIn,
    SkillGroupCreate,
    SkillGroupIn,
)

"""
Yönetim uç noktaları (Faz 7a) — paneli (Faz 7b) besliyor.

Hepsi JWT ister (router düzeyinde `get_current_admin`). Her yazma aynı yolu izler:
veritabanı → commit → publish() → /data/content.json güncel (docs/ARCHITECTURE.md § 3).

Okuma için ayrı uç nokta yok: panel `GET /api/content`'i kullanıyor — aynı veri,
aynı şekil. Yazmalar 204 döner; panel kaydettikten sonra içeriği yeniden çeker.

Projeler burada YOK: Projeler slaytı kalktı (Oturum 2), kayıtlar veritabanında
duruyor. Slayt geri gelirse uç noktaları da o zaman (CLAUDE.md kural 12).

⚠️ Sıralama yolları (`…/order`) kimlikli yollardan ÖNCE tanımlı: FastAPI yolları
sırayla eşliyor, sonra tanımlansa "order" bir kayıt kimliği sanılırdı (schemas.py
→ Slug bu adı yasaklıyor).
"""

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])

NO_CONTENT = status.HTTP_204_NO_CONTENT

#: Sırası olan kayıtlar — hepsinde `id` ve `order` var.
type Ordered = SkillGroup | Milestone | Link | Section


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
    return session.exec(select(Milestone).where(Milestone.kind == kind)).all()


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


# ── Bölümler (yalnızca düzenleme + sıra) ─────────────────────────────────────
# Oluşturma/silme yok: bölüm ↔ bileşen eşlemesi kodda (web/src/App.tsx),
# panelden eklenen bölüm sitede görünmezdi (docs/ARCHITECTURE.md § 8).


@router.put("/sections/order", status_code=NO_CONTENT)
def order_sections(data: OrderIn, session: SessionDep) -> None:
    _reorder(session, session.exec(select(Section)).all(), data.ids)


@router.put("/sections/{section_id}", status_code=NO_CONTENT)
def update_section(section_id: str, data: SectionIn, session: SessionDep) -> None:
    row = _get(session, Section, section_id)
    _write_texts(
        session, "section", row.id, heading=data.heading, nav_label=data.nav_label, body=data.body
    )
    _save(session)
