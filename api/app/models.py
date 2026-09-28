from sqlmodel import Field, SQLModel

"""
Veritabanı şeması — docs/ARCHITECTURE.md § 5 içerik modelinin karşılığı.

★ İki dillilik `translations` tablosuyla çözülüyor. Yapısal veri (slug, href,
tech, sıra) burada, yalnızca DÜZYAZI çeviri tablosunda. Aynı URL'yi iki dilde
tutmak kaymaya davetiye çıkarır — biri güncellenir, diğeri unutulur.

Kimlikler `str` ve iş anlamı taşıyor ('projeler', 'otopark'), otomatik artan sayı
değil. Sebebi: ön yüzdeki `site.ts` de aynı kimlikleri kullanıyor, `slug`lar URL'de
görünüyor ve panelden içerik taşınırken kimliğin sabit kalması gerekiyor.
"""


class Translation(SQLModel, table=True):
    """
    (entity, entity_id, field, locale) → value

    ⚠️ Dizi alanları (`bio`, `description`, `body`) burada TEK metin olarak durur;
    paragraflar boş satırla ayrılır ve okunurken bölünür. JSON gömmek yerine bu
    seçildi çünkü panelde (Faz 7) bu alanlar bir textarea olacak — yazarın
    gördüğü şeyle saklanan şey aynı olmalı.
    """

    __tablename__ = "translations"

    id: int | None = Field(default=None, primary_key=True)
    entity: str = Field(index=True)
    entity_id: str = Field(index=True)
    field: str
    locale: str = Field(index=True)
    value: str


class SiteSettings(SQLModel, table=True):
    __tablename__ = "site_settings"

    id: str = Field(default="settings", primary_key=True)
    # Tema ön ayarı. Renkler ön yüzdeki presets.ts'te yaşıyor — panel buradan
    # yalnızca hangi ön ayarın seçili olduğunu değiştiriyor (ARCHITECTURE § 4).
    preset: str = "tayf"


class Profile(SQLModel, table=True):
    """Tek satır. Çevrilen alanları (title, location, tagline, bio) çeviri tablosunda."""

    __tablename__ = "profile"

    id: str = Field(default="profile", primary_key=True)
    name: str


class SkillGroup(SQLModel, table=True):
    __tablename__ = "skills"

    id: str = Field(primary_key=True)
    # Teknoloji adları çevrilmez (React her dilde React) — JSON dizi olarak.
    items: str
    order: int = 0


class Milestone(SQLModel, table=True):
    """
    Deneyim ve eğitim aynı şekle sahip → tek tablo, `kind` ile ayrılıyor.
    Ön yüzde de tek bileşen render ediyor (docs/ARCHITECTURE.md § 5).
    """

    __tablename__ = "milestones"

    id: str = Field(primary_key=True)
    kind: str = Field(index=True)  # "experience" | "education"
    org: str
    period: str = ""
    order: int = 0


class Link(SQLModel, table=True):
    __tablename__ = "links"

    id: str = Field(primary_key=True)
    href: str
    icon: str = ""
    order: int = 0


class Project(SQLModel, table=True):
    __tablename__ = "projects"

    id: str = Field(primary_key=True)
    slug: str = Field(index=True)
    tech: str  # JSON dizi — çevrilmez
    repo_url: str | None = None
    live_url: str | None = None
    order: int = 0
    published: bool = True


class Section(SQLModel, table=True):
    __tablename__ = "sections"

    id: str = Field(primary_key=True)
    slug: str = Field(index=True)
    order: int = 0


class AdminUser(SQLModel, table=True):
    """Tek kullanıcı, hash'li parola. Rol sistemi yok (ARCHITECTURE § 2)."""

    __tablename__ = "admin_user"

    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
