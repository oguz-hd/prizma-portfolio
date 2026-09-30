from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

"""
★ Bu dosya bir SÖZLEŞME.

Buradaki şekil, ön yüzdeki `web/src/content/types.ts` → `RawSiteContent` ile
BİREBİR aynı olmak zorunda. Site mount'tan önce `content.json`'ı (bu şeklin
dökümü, publish.py) çekip doğrudan kullanıyor — arada dönüştürme yok.

Alan adları JavaScript tarafında camelCase (`metaTitle`), Python tarafında
snake_case. `alias_generator` ikisini birbirine çeviriyor; `populate_by_name`
sayesinde Python tarafında doğal adlarla yazılabiliyor.
"""


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class LocalizedText(CamelModel):
    """`Localized<string>` karşılığı."""

    tr: str = ""
    en: str = ""


class LocalizedList(CamelModel):
    """`Localized<string[]>` karşılığı — paragraf dizileri (bio, description, body)."""

    tr: list[str] = []
    en: list[str] = []


class SiteSettingsOut(CamelModel):
    preset: str
    meta_title: LocalizedText
    meta_description: LocalizedText


class SkillGroupOut(CamelModel):
    id: str
    group: LocalizedText
    items: list[str]
    note: LocalizedText | None = None


class MilestoneOut(CamelModel):
    id: str
    org: str
    role: LocalizedText
    period: str
    note: LocalizedText | None = None
    order: int


class ProfileOut(CamelModel):
    name: str
    title: LocalizedText
    location: LocalizedText
    tagline: LocalizedText
    bio: LocalizedList
    skills: list[SkillGroupOut]
    experience: list[MilestoneOut]
    education: list[MilestoneOut]


class LinkOut(CamelModel):
    id: str
    label: LocalizedText
    href: str
    icon: str
    order: int


class ProjectOut(CamelModel):
    id: str
    slug: str
    title: LocalizedText
    summary: LocalizedText
    description: LocalizedList
    tech: list[str]
    # Çevrilmez — URL yapısal veri (models.py'deki nota bak). Alias'la camelCase'e
    # dönüyor: repoUrl / liveUrl, ön yüzdeki RawProject ile aynı adlar.
    repo_url: str | None = None
    live_url: str | None = None
    order: int
    published: bool


class SectionOut(CamelModel):
    id: str
    slug: str
    heading: LocalizedText
    nav_label: LocalizedText | None = None
    body: LocalizedList
    order: int


class SiteContentOut(CamelModel):
    """`GET /api/content` — tüm site, tek JSON (docs/ARCHITECTURE.md § 3)."""

    settings: SiteSettingsOut
    profile: ProfileOut
    links: list[LinkOut]
    projects: list[ProjectOut]
    sections: list[SectionOut]


# ── Kimlik doğrulama ────────────────────────────────────────────────────────


class LoginIn(CamelModel):
    email: str
    password: str


class TokenOut(CamelModel):
    access_token: str
    token_type: str = "bearer"


class AdminOut(CamelModel):
    id: int
    email: str
