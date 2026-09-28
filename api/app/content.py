import json

from fastapi import APIRouter
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


router = APIRouter(prefix="/api", tags=["content"])


@router.get("/content")
def read_content(session: SessionDep) -> SiteContentOut:
    """
    Tüm site içeriği, tek JSON.

    Public ve önbelleklenebilir. Ziyaretçi tarafı veritabanını hiç görmez —
    Faz 6'da ön yüz yalnızca bunu çekecek (docs/ARCHITECTURE.md § 3).
    """
    return build_content(session)
