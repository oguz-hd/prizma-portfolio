from sqlmodel import Field, SQLModel

"""
Veritabanı şeması — docs/ARCHITECTURE.md § 5 içerik modelinin karşılığı.

★ İki dillilik `translations` tablosuyla çözülüyor. Yapısal veri (slug, href,
tech, sıra) burada, yalnızca DÜZYAZI çeviri tablosunda. Aynı URL'yi iki dilde
tutmak kaymaya davetiye çıkarır — biri güncellenir, diğeri unutulur.

Kimlikler `str` ve iş anlamı taşıyor ('projeler', 'otopark'), otomatik artan sayı
değil. Sebebi: ön yüz bölümleri `slug`la eşliyor (web/src/App.tsx), `slug`lar
URL'de görünüyor ve panelden içerik taşınırken kimliğin sabit kalması gerekiyor.
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
    # "experience" | "education" (profil) · "timeline" (zaman çizelgesi bölümü, Faz 9)
    kind: str = Field(index=True)
    org: str
    period: str = ""
    order: int = 0
    # Zaman çizelgesi bölümünün maddesiyse o bölüm; profilin maddelerinde boş.
    section_id: str | None = Field(default=None, index=True)


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
    cover_media_id: str | None = None


class Section(SQLModel, table=True):
    """
    Bölüm = sitede bir slayt. `kind` hangi bileşenin çizeceğini söyler (Faz 9;
    eskiden eşleme slug'a göre kodda elleydi). Hazır türler (about, experience,
    contact) silinmez, gizlenir; panelden eklenenler silinebilir — schemas.py.
    Çevrilen alanlar: heading, nav_label, body, link_label (duyuru).
    """

    __tablename__ = "sections"

    id: str = Field(primary_key=True)
    slug: str = Field(index=True)
    order: int = 0
    kind: str = "text"
    visible: bool = True
    # Duyuru: isteğe bağlı bağlantı ve yayın aralığı (ISO tarih, gün dahil).
    # Aralık SİTEDE değerlendiriliyor — yayın her gün yeniden yapılmıyor.
    link_href: str | None = None
    starts_on: str | None = None
    ends_on: str | None = None


class Media(SQLModel, table=True):
    """
    Yüklenen görsel (Faz 9, media.py). Dosyalar `/data/uploads/{id}-{genişlik}.webp`;
    orijinal SAKLANMIYOR (EXIF/GPS içerir). `alt` çeviri tablosunda.
    """

    __tablename__ = "media"

    id: str = Field(primary_key=True)
    width: int
    height: int
    # Üretilen genişlikler, küçükten büyüğe — JSON dizi.
    widths: str
    bytes: int
    created_at: str


class SectionMedia(SQLModel, table=True):
    """Galeri bölümünün görselleri ve sırası. Altyazı çeviri tablosunda (`section_media`)."""

    __tablename__ = "section_media"

    section_id: str = Field(primary_key=True)
    media_id: str = Field(primary_key=True, index=True)
    order: int = 0


class AdminUser(SQLModel, table=True):
    """Tek kullanıcı, hash'li parola. Rol sistemi yok (ARCHITECTURE § 2)."""

    __tablename__ = "admin_user"

    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
