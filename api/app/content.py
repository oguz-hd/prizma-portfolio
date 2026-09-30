import json
from html import escape

from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from sqlmodel import Session, select

from app.db import SessionDep
from app.models import (
    AdminUser,  # noqa: F401  (SQLModel tablo kaydı için import ediliyor)
    Link,
    Milestone,
    Profile,
    Project,
    Section,
    SiteSettings,
    SkillGroup,
    Translation,
)
from app.schemas import (
    LinkOut,
    LocalizedList,
    LocalizedText,
    MilestoneOut,
    ProfileOut,
    ProjectOut,
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


def build_content(session: Session) -> SiteContentOut:
    """Veritabanındaki satırları ön yüzün beklediği tek JSON'a çevirir."""
    tr = Translations(session)

    settings_row = session.get(SiteSettings, "settings") or SiteSettings()
    profile_row = session.get(Profile, "profile") or Profile(name="")

    def milestones(kind: str) -> list[MilestoneOut]:
        rows = session.exec(
            select(Milestone).where(Milestone.kind == kind).order_by(Milestone.order)
        ).all()
        return [
            MilestoneOut(
                id=m.id,
                org=m.org,
                role=tr.text("milestone", m.id, "role"),
                period=m.period,
                note=tr.maybe_text("milestone", m.id, "note"),
                order=m.order,
            )
            for m in rows
        ]

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
        )
        # Yayında olmayanlar public uç noktada görünmez.
        for p in session.exec(
            select(Project).where(Project.published).order_by(Project.order)
        ).all()
    ]

    sections = [
        SectionOut(
            id=s.id,
            slug=s.slug,
            heading=tr.text("section", s.id, "heading"),
            nav_label=tr.maybe_text("section", s.id, "nav_label"),
            body=tr.paragraphs("section", s.id, "body"),
            order=s.order,
        )
        for s in session.exec(select(Section).order_by(Section.order)).all()
    ]

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
