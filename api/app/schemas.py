import re
from datetime import date
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)
from pydantic.alias_generators import to_camel

from app.config import INSECURE_DEFAULT_PASSWORD

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


#: Tema ön ayarları — web/src/theme/types.ts → `PresetId` ile aynı liste. Renkler
#: ön yüzde (presets.ts); veritabanı yalnızca hangisinin seçili olduğunu tutuyor.
PresetId = Literal["aurora", "tayf", "yildiz", "turbo"]


class SiteSettingsOut(CamelModel):
    preset: PresetId
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
    cover: "MediaOut | None" = None


#: Bölüm türleri (Faz 9) — hangi bileşen çizer. web/src/content/types.ts → SectionKind.
#: Hazırlar (about, experience, contact) silinmez, gizlenir; diğerleri panelden eklenir.
SectionKind = Literal[
    "about", "experience", "contact", "text", "timeline", "projects", "announcement", "gallery"
]
AddableKind = Literal["text", "timeline", "projects", "announcement", "gallery"]
BUILTIN_KINDS = frozenset({"about", "experience", "contact"})


class MediaOut(CamelModel):
    """
    Yüklenen görsel. Dosyası `/uploads/{id}-{w}.webp`, `widths`'teki her genişlik için
    (küçükten büyüğe) — site `srcset`'i buradan kuruyor (media.py).
    """

    id: str
    width: int
    height: int
    widths: list[int]
    alt: LocalizedText


class SectionMediaOut(MediaOut):
    caption: LocalizedText | None = None


class SectionLinkOut(CamelModel):
    label: LocalizedText
    href: str


class SectionOut(CamelModel):
    id: str
    slug: str
    kind: SectionKind
    heading: LocalizedText
    nav_label: LocalizedText | None = None
    body: LocalizedList
    order: int
    # Yalnızca panelin çıktısında (gizliler herkese açık içerikte hiç yok).
    visible: bool | None = None
    # Türe göre — boşsa yazılmaz (exclude_none).
    items: list[MilestoneOut] | None = None  # timeline
    media: list[SectionMediaOut] | None = None  # gallery
    link: SectionLinkOut | None = None  # announcement
    starts_on: str | None = None  # announcement, ISO tarih (gün dahil)
    ends_on: str | None = None


class SiteContentOut(CamelModel):
    """`GET /api/content` — tüm site, tek JSON (docs/ARCHITECTURE.md § 3)."""

    settings: SiteSettingsOut
    profile: ProfileOut
    links: list[LinkOut]
    projects: list[ProjectOut]
    sections: list[SectionOut]
    # Yalnızca panelin çıktısında: medya kitaplığı (GET /api/admin/content).
    media: list[MediaOut] | None = None


# ── Yönetim girdileri (Faz 7, admin.py) ──────────────────────────────────────
#
# Girdi = çıktının şekli: panel aynı kaydın iki dilini yan yana düzenliyor
# (docs/ARCHITECTURE.md § 5). Kimlik (`id`) ve sıra (`order`) yalnızca oluştururken
# / sıralarken verilir; güncellemede adresten gelir.
#
# Doğrulamanın ölçüsü sitenin kendisi: yarım çevrilmiş bir alan, dil değişince
# sitede boş bir satır demek — o yüzden iki dil birlikte dolu ya da birlikte boş.


def _required(v: LocalizedText) -> LocalizedText:
    v = LocalizedText(tr=v.tr.strip(), en=v.en.strip())
    if not v.tr or not v.en:
        raise ValueError("iki dil de doldurulmalı (tr, en)")
    return v


def _optional(v: LocalizedText | None) -> LocalizedText | None:
    """Opsiyonel alan (`note`, `navLabel`): iki dil de boşsa alan hiç yok."""
    if v is None:
        return None
    v = LocalizedText(tr=v.tr.strip(), en=v.en.strip())
    if not v.tr and not v.en:
        return None
    if not v.tr or not v.en:
        raise ValueError("ya iki dil de doldurulmalı ya da ikisi de boş bırakılmalı")
    return v


def _split(paragraphs: list[str]) -> list[str]:
    """
    Boş satır paragraf ayracı (models.py → Translation): bir paragrafın içindeki
    boş satır, okunurken zaten iki paragraf olurdu — saklamadan önce ayrılıyor.
    """
    return [p.strip() for chunk in paragraphs for p in re.split(r"\n\s*\n", chunk) if p.strip()]


def _paragraphs(v: LocalizedList) -> LocalizedList:
    v = LocalizedList(tr=_split(v.tr), en=_split(v.en))
    if bool(v.tr) != bool(v.en):
        raise ValueError("ya iki dil de doldurulmalı ya da ikisi de boş bırakılmalı")
    return v


def _required_paragraphs(v: LocalizedList) -> LocalizedList:
    v = _paragraphs(v)
    if not v.tr:
        raise ValueError("iki dil de doldurulmalı (tr, en)")
    return v


def _not_reserved(v: str) -> str:
    # `PUT /api/admin/{kaynak}/order` sıralama adresi; bu kimlikli bir kayıt
    # hiç güncellenemezdi (admin.py'de sıralama yolu önce tanımlı).
    if v == "order":
        raise ValueError("'order' ayrılmış bir ad")
    return v


def _safe_href(v: str) -> str:
    # `javascript:` gibi şemalar bağlantıyı koda çevirir — yalnızca bilinenler.
    if not re.fullmatch(r"(https?://|mailto:)\S+", v):
        raise ValueError("bağlantı https://, http:// ya da mailto: ile başlamalı, boşluk içermemeli")
    return v


RequiredText = Annotated[LocalizedText, AfterValidator(_required)]
OptionalText = Annotated[LocalizedText | None, AfterValidator(_optional)]
Paragraphs = Annotated[LocalizedList, AfterValidator(_paragraphs)]
RequiredParagraphs = Annotated[LocalizedList, AfterValidator(_required_paragraphs)]
NonEmpty = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]

#: Kayıt kimliği: küçük harf, rakam, tire ('lion-staj'). Adreste ve ön yüzde anahtar.
Slug = Annotated[
    str,
    StringConstraints(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=64),
    AfterValidator(_not_reserved),
]
Href = Annotated[str, StringConstraints(strip_whitespace=True), AfterValidator(_safe_href)]

#: Deneyim ve eğitim aynı tablo (models.py → Milestone), `kind` ayırıyor.
MilestoneKind = Literal["experience", "education"]


class SettingsIn(CamelModel):
    # Yalnızca listedeki ön ayarlar — serbest renk yok (docs/ARCHITECTURE.md § 4).
    preset: PresetId
    meta_title: RequiredText
    meta_description: RequiredText


class ProfileIn(CamelModel):
    name: NonEmpty
    title: RequiredText
    location: RequiredText
    # Sitede gösterilmiyor (Oturum 2) ama sözleşmede — olduğu gibi geri gönderilir.
    tagline: LocalizedText
    bio: RequiredParagraphs


class SkillGroupIn(CamelModel):
    group: RequiredText
    # Teknoloji adları çevrilmez (React her dilde React); açıklama `note`'a.
    items: Annotated[list[NonEmpty], Field(min_length=1)]
    note: OptionalText = None


class SkillGroupCreate(SkillGroupIn):
    id: Slug


class MilestoneIn(CamelModel):
    org: NonEmpty
    role: RequiredText
    # Serbest metin, çevrilmez ('2025 — 2026', '05.2026'); boş olabilir.
    period: Annotated[str, StringConstraints(strip_whitespace=True)] = ""
    note: OptionalText = None


class MilestoneCreate(MilestoneIn):
    id: Slug
    kind: MilestoneKind


class LinkIn(CamelModel):
    label: RequiredText
    href: Href
    icon: str = ""


class LinkCreate(LinkIn):
    id: Slug


class SectionLinkIn(CamelModel):
    label: RequiredText
    href: Href


class SectionIn(CamelModel):
    heading: RequiredText
    nav_label: OptionalText = None
    body: Paragraphs = LocalizedList()
    # Verilmezse değişmez (eski panel bu alanı göndermiyordu).
    visible: bool | None = None
    # Yalnızca duyuru (admin.py diğer türlerde reddediyor).
    link: SectionLinkIn | None = None
    starts_on: date | None = None
    ends_on: date | None = None

    @model_validator(mode="after")
    def _range(self) -> "SectionIn":
        if self.starts_on and self.ends_on and self.ends_on < self.starts_on:
            raise ValueError("bitiş tarihi başlangıçtan önce olamaz")
        return self


class SectionCreate(SectionIn):
    id: Slug
    kind: AddableKind


class TimelineItemCreate(MilestoneIn):
    """Zaman çizelgesi bölümünün maddesi — deneyim/eğitimle aynı alanlar."""

    id: Slug


class GalleryItemIn(CamelModel):
    media_id: str
    caption: OptionalText = None


class GalleryIn(CamelModel):
    """Galerinin görselleri, istenen sırayla — liste baştan yazılır."""

    items: list[GalleryItemIn]


class ProjectIn(CamelModel):
    title: RequiredText
    summary: RequiredText
    description: Paragraphs = LocalizedList()
    # Teknoloji adları çevrilmez.
    tech: list[NonEmpty] = []
    repo_url: Href | None = None
    live_url: Href | None = None
    published: bool = True
    cover_media_id: str | None = None


class ProjectCreate(ProjectIn):
    id: Slug


class MediaAltIn(CamelModel):
    alt: OptionalText = None


class OrderIn(CamelModel):
    """Yeni sıra: kayıtların TAMAMI, birer kez, istenen sırayla."""

    ids: list[str]


class MilestoneOrderIn(OrderIn):
    kind: MilestoneKind


# ── Kimlik doğrulama ────────────────────────────────────────────────────────


class LoginIn(CamelModel):
    email: str
    password: str


def _not_default(v: str) -> str:
    # Varsayılan parolayı kabul eden hesapla API üretimde açılmıyor (main.py).
    if v == INSECURE_DEFAULT_PASSWORD:
        raise ValueError("varsayılan parola kullanılamaz")
    return v


class PasswordChangeIn(CamelModel):
    current_password: str
    new_password: Annotated[str, Field(min_length=10), AfterValidator(_not_default)]


class TokenOut(CamelModel):
    access_token: str
    token_type: str = "bearer"


class AdminOut(CamelModel):
    id: int
    email: str


ProjectOut.model_rebuild()
