import json
from html import escape

from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from sqlmodel import Session, select

from app.db import SessionDep
from app.models import (
    AdminUser,  # noqa: F401  (SQLModel tablo kaydı için import ediliyor)
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
from app.schemas import (
    LinkOut,
    LocalizedList,
    LocalizedText,
    MediaOut,
    MilestoneOut,
    ProfileOut,
    ProjectOut,
    SectionLinkOut,
    SectionMediaOut,
    SectionOut,
    SiteContentOut,
    SiteSettingsOut,
    SkillGroupOut,
)

LOCALES = ("tr", "en")

# Paragraf dizisi olarak saklanan alanlar. Çeviri tablosunda tek metin olarak
# durur, boş satırla bölünür (models.py → Translation'daki nota bak).
PARAGRAPH_SEPARATOR = "\n\n"


class Translations:
    """
    Çeviri tablosunu TEK sorguda okuyup bellekte indeksler.

    ⚠️ Alternatif her alan için ayrı sorgu atmaktı — bu sayfada ~40 çevrilen alan
    var, yani 40 sorgu. `GET /api/content` sitenin en sık çağrılan uç noktası
    (docs/ARCHITECTURE.md § 3: "hız pazarlık konusu değil"), N+1 sorguya
    tahammülü yok.
    """

    def __init__(self, session: Session) -> None:
        self._rows: dict[tuple[str, str, str], dict[str, str]] = {}
        for t in session.exec(select(Translation)).all():
            self._rows.setdefault((t.entity, t.entity_id, t.field), {})[t.locale] = t.value

    def text(self, entity: str, entity_id: str, field: str) -> LocalizedText:
        row = self._rows.get((entity, entity_id, field), {})
        return LocalizedText(**{loc: row.get(loc, "") for loc in LOCALES})

    def maybe_text(self, entity: str, entity_id: str, field: str) -> LocalizedText | None:
        """Opsiyonel alanlar (`note`) — hiç çevirisi yoksa None döner, boş kabuk değil."""
        row = self._rows.get((entity, entity_id, field), {})
        if not any(row.get(loc) for loc in LOCALES):
            return None
        return LocalizedText(**{loc: row.get(loc, "") for loc in LOCALES})

    def paragraphs(self, entity: str, entity_id: str, field: str) -> LocalizedList:
        row = self._rows.get((entity, entity_id, field), {})
        return LocalizedList(
            **{
                loc: [p.strip() for p in row.get(loc, "").split(PARAGRAPH_SEPARATOR) if p.strip()]
                for loc in LOCALES
            }
        )


def build_content(session: Session, *, admin: bool = False) -> SiteContentOut:
    """
    Veritabanındaki satırları ön yüzün beklediği tek JSON'a çevirir.

    `admin=True` → panelin çıktısı (GET /api/admin/content): gizli bölümler, yayında
    olmayan projeler, her bölümün `visible`'ı ve medya kitaplığı da var. Herkese açık
    çıktıda (content.json) bunlar yok.
    """
    tr = Translations(session)

    settings_row = session.get(SiteSettings, "settings") or SiteSettings()
    profile_row = session.get(Profile, "profile") or Profile(name="")

    def milestone_out(m: Milestone) -> MilestoneOut:
        return MilestoneOut(
            id=m.id,
            org=m.org,
            role=tr.text("milestone", m.id, "role"),
            period=m.period,
            note=tr.maybe_text("milestone", m.id, "note"),
            order=m.order,
        )

    all_milestones = session.exec(select(Milestone).order_by(Milestone.order)).all()

    def milestones(kind: str) -> list[MilestoneOut]:
        return [milestone_out(m) for m in all_milestones if m.kind == kind and not m.section_id]

    media_rows = {m.id: m for m in session.exec(select(Media).order_by(Media.created_at)).all()}

    def media_out(media_id: str | None) -> MediaOut | None:
        m = media_rows.get(media_id or "")
        if m is None:
            return None
        return MediaOut(
            id=m.id, width=m.width, height=m.height, widths=json.loads(m.widths),
            alt=tr.text("media", m.id, "alt"),
        )

    skills = [
        SkillGroupOut(
            id=s.id,
            group=tr.text("skill", s.id, "group"),
            items=json.loads(s.items),
            note=tr.maybe_text("skill", s.id, "note"),
        )
        for s in session.exec(select(SkillGroup).order_by(SkillGroup.order)).all()
    ]

    links = [
        LinkOut(
            id=link.id,
            label=tr.text("link", link.id, "label"),
            href=link.href,
            icon=link.icon,
            order=link.order,
        )
        for link in session.exec(select(Link).order_by(Link.order)).all()
    ]

    project_query = select(Project).order_by(Project.order)
    if not admin:
        # Yayında olmayanlar herkese açık içerikte görünmez.
        project_query = project_query.where(Project.published)
    projects = [
        ProjectOut(
            id=p.id,
            slug=p.slug,
            title=tr.text("project", p.id, "title"),
            summary=tr.text("project", p.id, "summary"),
            description=tr.paragraphs("project", p.id, "description"),
            tech=json.loads(p.tech),
            repo_url=p.repo_url,
            live_url=p.live_url,
            order=p.order,
            published=p.published,
            cover=media_out(p.cover_media_id),
        )
        for p in session.exec(project_query).all()
    ]

    gallery: dict[str, list[SectionMediaOut]] = {}
    for row in session.exec(select(SectionMedia).order_by(SectionMedia.order)).all():
        m = media_out(row.media_id)
        if m:
            key = f"{row.section_id}:{row.media_id}"
            gallery.setdefault(row.section_id, []).append(
                SectionMediaOut(**m.model_dump(), caption=tr.maybe_text("section_media", key, "caption"))
            )

    def section_out(s: Section) -> SectionOut:
        link_label = tr.maybe_text("section", s.id, "link_label")
        return SectionOut(
            id=s.id,
            slug=s.slug,
            kind=s.kind,
            heading=tr.text("section", s.id, "heading"),
            nav_label=tr.maybe_text("section", s.id, "nav_label"),
            body=tr.paragraphs("section", s.id, "body"),
            order=s.order,
            visible=s.visible if admin else None,
            items=(
                [milestone_out(m) for m in all_milestones if m.section_id == s.id]
                if s.kind == "timeline" else None
            ),
            media=gallery.get(s.id, []) if s.kind == "gallery" else None,
            link=(
                SectionLinkOut(label=link_label, href=s.link_href)
                if s.kind == "announcement" and s.link_href and link_label else None
            ),
            starts_on=s.starts_on if s.kind == "announcement" else None,
            ends_on=s.ends_on if s.kind == "announcement" else None,
        )

    section_query = select(Section).order_by(Section.order)
    if not admin:
        section_query = section_query.where(Section.visible)
    sections = [section_out(s) for s in session.exec(section_query).all()]

    return SiteContentOut(
        settings=SiteSettingsOut(
            preset=settings_row.preset,
            meta_title=tr.text("settings", "settings", "metaTitle"),
            meta_description=tr.text("settings", "settings", "metaDescription"),
        ),
        profile=ProfileOut(
            name=profile_row.name,
            title=tr.text("profile", "profile", "title"),
            location=tr.text("profile", "profile", "location"),
            tagline=tr.text("profile", "profile", "tagline"),
            bio=tr.paragraphs("profile", "profile", "bio"),
            skills=skills,
            experience=milestones("experience"),
            education=milestones("education"),
        ),
        links=links,
        projects=projects,
        sections=sections,
        media=[m for mid in media_rows if (m := media_out(mid))] if admin else None,
    )


def render_meta(content: SiteContentOut) -> str:
    """
    Paylaşım kartı ve arama sonucu etiketleri — içerikten.

    Sosyal ağların ve arama motorlarının tarayıcıları JS çalıştırmaz: etiketler
    statik HTML'de olmak zorunda. Yayında Caddy bunu index.html'e gömüyor
    (`meta.html`, Caddyfile → templates); geliştirmede Vite `/api/meta`'dan çekiyor
    (web/vite.config.ts). İçerikten bağımsız etiketler (og:type, og:locale)
    index.html'de sabit.

    ⚠️ `og:image` henüz YOK: paylaşım görseli sitenin kendi ekran görüntüsü olacak,
    tasarım oturunca çekilecek (`web/public/og.png`, 1200×630). Gelince index.html'e
    og:image + boyutları eklenir ve kart `summary_large_image` olur. Alan adı belli
    olunca adres mutlak olmalı — bazı platformlar göreli görseli okumaz.
    """
    # Site İngilizce açılır (web/src/i18n/types.ts → DEFAULT_LOCALE, Oturum 3);
    # kart da o dilde. Dil değişince sekme başlığını App güncelliyor.
    title = escape(content.settings.meta_title.en)
    desc = escape(content.settings.meta_description.en)
    # index.html'deki yerinin girintisiyle (4 boşluk) — kaynak görünümü düzgün kalsın.
    return "\n    ".join(
        [
            f"<title>{title}</title>",
            f'<meta name="description" content="{desc}" />',
            f'<meta property="og:title" content="{title}" />',
            f'<meta property="og:description" content="{desc}" />',
        ]
    )


router = APIRouter(prefix="/api", tags=["content"])


# response_model_exclude_none: opsiyonel alanlar (`note`, `navLabel`) yoksa hiç
# yazılmıyor — content.json ile birebir aynı şekil (publish.py).
@router.get("/content", response_model_exclude_none=True)
def read_content(session: SessionDep) -> SiteContentOut:
    """
    Tüm site içeriği, tek JSON — `/data/content.json`'ın canlı hâli.

    Yayında ziyaretçi bunu değil, Caddy'nin sunduğu dosyayı okuyor (veritabanı
    sorgusu yok, docs/ARCHITECTURE.md § 3). Geliştirmede Vite `/content.json`'ı
    buraya yönlendiriyor (web/vite.config.ts).
    """
    return build_content(session)


@router.get("/meta", response_class=HTMLResponse)
def read_meta(session: SessionDep) -> str:
    """`/data/meta.html`'in canlı hâli — geliştirmede Vite index.html'e gömüyor."""
    return render_meta(build_content(session))
