import json

from sqlmodel import Session, select

from app.auth import hash_password
from app.config import get_settings
from app.models import (
    AdminUser,
    Link,
    Milestone,
    Profile,
    Project,
    Section,
    SiteSettings,
    SkillGroup,
    Translation,
)

"""
İlk açılış verisi — sitenin içeriğinin ilk hâli.

Faz 6'dan beri içeriğin tek kaynağı veritabanı: `web/src/content/site.ts` silindi
(silinmeden önce bu dosyanın çıktısıyla alan alan karşılaştırıldı, birebir aynıydı).
Sonraki her düzenleme panelden — buradaki metinler yalnızca BOŞ bir veritabanını
(ilk kurulum, `down -v`) doldurur.

⚠️ Bu bir GÖÇ değil, TOHUM. Veritabanı boşsa doldurur, doluysa hiç dokunmaz.
Yoksa panelden (Faz 7) yapılan her düzenleme yeniden başlatmada silinirdi.
"""

P = "\n\n"  # paragraf ayracı (models.py → Translation'daki nota bak)


def _t(entity: str, entity_id: str, field: str, tr: str, en: str) -> list[Translation]:
    return [
        Translation(entity=entity, entity_id=entity_id, field=field, locale="tr", value=tr),
        Translation(entity=entity, entity_id=entity_id, field=field, locale="en", value=en),
    ]


def seed(session: Session) -> bool:
    """Veritabanı boşsa doldurur. Doldurduysa True döner."""
    if session.exec(select(Profile)).first() is not None:
        return False

    settings = get_settings()
    rows: list[object] = []

    # ── Ayarlar ─────────────────────────────────────────────────────────────
    # Seçilen palet — docs/DESIGN.md § E
    rows.append(SiteSettings(id="settings", preset="tayf"))
    # Sekme adı yalnızca isim (kullanıcı isteği, Oturum 3).
    rows += _t(
        "settings", "settings", "metaTitle",
        "Oğuz Han Duran",
        "Oğuz Han Duran",
    )
    rows += _t(
        "settings", "settings", "metaDescription",
        "React, FastAPI ve .NET ile arayüz ve servis yazan yazılım geliştirici. İzmir.",
        "Software developer writing interfaces and services with React, FastAPI and .NET. "
        "İzmir, Türkiye.",
    )

    # ── Profil ──────────────────────────────────────────────────────────────
    rows.append(Profile(id="profile", name="Oğuz Han Duran"))
    # Oturum 3: "Full-stack" kullanıcıya fazla iddialı geldi.
    rows += _t("profile", "profile", "title", "Yazılım geliştirici", "Software developer")
    rows += _t("profile", "profile", "location", "İzmir", "İzmir, Türkiye")
    # ⚠️ Girişte artık GÖSTERİLMİYOR (kullanıcı isteği, Oturum 2: "mottoyu
    # kaldırmalıyız"). Alan sözleşmede (types.ts ↔ schemas.py) kaldığı için duruyor.
    rows += _t(
        "profile", "profile", "tagline",
        "E-postayla dönen işleri tek ekrana indiriyorum — arayüzünden veritabanına kadar.",
        "I bring work that runs over email into a single screen — from the interface down to "
        "the database.",
    )
    rows += _t(
        "profile", "profile", "bio",
        # Mezuniyet paragrafı kullanıcı isteğiyle çıktı (Oturum 2) — bilgi
        # Deneyim ve Eğitim slaytında, eğitim kaydının notunda duruyor.
        P.join([
            "İşin iki ucunu da seviyorum: React ve Vue ile arayüz, FastAPI ve .NET Core ile "
            "servis, MySQL ve MSSQL ile veri. Bir ürünün nasıl göründüğü kadar nasıl ayakta "
            "durduğu da ilgimi çekiyor.",
            "Boş vakitlerimde spor yapıyor, müzik dinliyor ve teleskopla gözlem yapıyorum. Bu "
            "sitenin renkleri de oradan geliyor — bir yıldızın ne olduğunu ışığını tayfına "
            "ayırarak anlarsınız.",
        ]),
        P.join([
            "I like both ends of the job: interfaces with React and Vue, services with FastAPI "
            "and .NET Core, data with MySQL and MSSQL. How a product holds up interests me as "
            "much as how it looks.",
            "Outside work I train, listen to music, and observe through a telescope. This site "
            "gets its colours from that last one — you learn what a star is by splitting its "
            "light into a spectrum.",
        ]),
    )

    # ── Yetenekler ──────────────────────────────────────────────────────────
    # Teknoloji adları çevrilmez — React her dilde React; açıklama `note`'a gider.
    # trex-portfolio Oturum 15'te sadeleşti (~20 → 10): yalnızca projelerde ve
    # deneyimde kanıtlanan teknolojiler. curious.page: "içerik > teknoloji listesi".
    # Sıra bio'nun cümlesini izliyor: arayüz → servis → veri. Çıkanlar: C, Django,
    # Node.js, Express, JavaScript (TypeScript kapsıyor), Flutter, SQLite, Redis,
    # RabbitMQ, Git.
    skills = [
        ("frontend", ["React.js", "TypeScript", "Vue.js"], "Ön yüz", "Front end", None),
        ("backend", ["FastAPI", "Python", ".NET Core 8"], "Servis", "Back end", None),
        ("data", ["MySQL", "MSSQL", "Docker"], "Veri ve altyapı", "Data & infrastructure", None),
        ("ai", ["LSTM"], "Yapay zekâ", "Machine learning",
         ("Zaman serisi analizi", "Time series analysis")),
    ]
    for i, (sid, items, g_tr, g_en, note) in enumerate(skills, start=1):
        rows.append(SkillGroup(id=sid, items=json.dumps(items, ensure_ascii=False), order=i))
        rows += _t("skill", sid, "group", g_tr, g_en)
        if note:
            rows += _t("skill", sid, "note", note[0], note[1])

    # ── Deneyim ve eğitim ───────────────────────────────────────────────────
    milestones = [
        ("ege-iskur", "experience", "Ege Üniversitesi Bergama MYO", "2025 — 2026", 1,
         ("İşkur kursiyeri", "İşkur trainee"), None),
        ("lion-staj", "experience", "Lion Bilişim / İstanbul Altın Rafinerisi", "2025", 2,
         ("Stajyer geliştirici", "Developer intern"), None),
        ("lion-parttime", "experience", "Lion Bilişim / İstanbul Altın Rafinerisi",
         "2022 — 2023", 3, ("Yarı zamanlı geliştirici", "Part-time developer"), None),
        ("ege", "education", "Ege Üniversitesi Bergama MYO", "05.2026", 1,
         ("Bilgisayar Programcılığı", "Computer Programming"),
         ("GNO 3.85/4 · Bölüm birincisi, okul ikincisi",
          "GPA 3.85/4 · 1st in department, 2nd in school")),
        ("lise", "education", "Eskişehir Beylikova Fen Lisesi", "", 2,
         ("Fen Lisesi", "Science High School"), None),
    ]
    for mid, kind, org, period, order, role, note in milestones:
        rows.append(Milestone(id=mid, kind=kind, org=org, period=period, order=order))
        rows += _t("milestone", mid, "role", role[0], role[1])
        if note:
            rows += _t("milestone", mid, "note", note[0], note[1])

    # ── Linkler ─────────────────────────────────────────────────────────────
    links = [
        ("email", "mailto:drn4902@gmail.com", "mail", 1, ("E-posta", "Email")),
        ("github", "https://github.com/oguz-hd", "github", 2, ("GitHub", "GitHub")),
        ("linkedin", "https://linkedin.com/in/oguz-han-duran", "linkedin", 3,
         ("LinkedIn", "LinkedIn")),
    ]
    for lid, href, icon, order, label in links:
        rows.append(Link(id=lid, href=href, icon=icon, order=order))
        rows += _t("link", lid, "label", label[0], label[1])

    # ── Projeler ────────────────────────────────────────────────────────────
    # curious.page kuralı 2: 3-5 proje, bağlamıyla (problem, yığın, demo).
    projects = [
        (
            "proje-portali", "universite-proje-portali",
            ["React.js", "FastAPI", "MySQL", "Python"], 1,
            ("Üniversite Proje Portalı", "University Project Portal"),
            ("Öğrenci projelerinin toplandığı, danışman onayından geçtiği web portalı.",
             "A web portal where student projects are submitted and pass through advisor approval."),
            (P.join([
                "Bölümdeki proje teslimleri e-posta ve USB üzerinden yürüyordu; hangi sürümün "
                "son sürüm olduğu kimsenin elinde değildi.",
                "Portal, projeyi öğrenciden alıp danışman onay akışına sokuyor ve tek bir yerde "
                "arşivliyor. Ön yüz React, servis FastAPI, veri MySQL.",
            ]),
             P.join([
                "Project submissions ran over email and USB sticks; nobody could tell which "
                "version was the final one.",
                "The portal takes the project from the student, moves it through advisor "
                "approval, and archives everything in one place. React front end, FastAPI "
                "service, MySQL storage.",
            ])),
        ),
        (
            "otopark", "otopark-yonetim-sistemi", [".NET Core 8", "C#", "MSSQL"], 2,
            ("Otopark Yönetim Sistemi", "Car Park Management System"),
            ("Giriş-çıkış takibi, doluluk ve ücretlendirme için masaüstü yönetim uygulaması.",
             "Desktop application for entry/exit tracking, occupancy and billing."),
            (P.join([
                "Plaka bazlı giriş-çıkış kaydı, anlık doluluk görünümü ve süreye göre otomatik "
                "ücretlendirme.",
                ".NET Core 8 üzerinde kuruldu, veriler MSSQL’de tutuluyor.",
            ]),
             P.join([
                "Plate-based entry and exit records, live occupancy view, and automatic "
                "time-based billing.",
                "Built on .NET Core 8 with MSSQL for storage.",
            ])),
        ),
        (
            "restoran", "restoran-yonetim-sistemi", [".NET Core 8", "C#", "MSSQL"], 3,
            ("Restoran Yönetim Sistemi", "Restaurant Management System"),
            ("Masa, sipariş ve adisyon akışını tek ekranda toplayan yönetim uygulaması.",
             "Management application bringing tables, orders and checks into one screen."),
            (P.join([
                "Masa durumu, sipariş girişi ve adisyon kapatma tek akışta. Mutfak ve kasa aynı "
                "veriyi görüyor.",
                "Otopark sistemiyle aynı zemin: .NET Core 8 + MSSQL.",
            ]),
             P.join([
                "Table status, order entry and check closing in a single flow. Kitchen and till "
                "read the same data.",
                "Same foundation as the car park system: .NET Core 8 + MSSQL.",
            ])),
        ),
    ]
    for pid, slug, tech, order, title, summary, description in projects:
        rows.append(
            Project(
                id=pid, slug=slug, tech=json.dumps(tech, ensure_ascii=False),
                order=order, published=True,
            )
        )
        rows += _t("project", pid, "title", title[0], title[1])
        rows += _t("project", pid, "summary", summary[0], summary[1])
        rows += _t("project", pid, "description", description[0], description[1])

    # ── Bölümler ────────────────────────────────────────────────────────────
    # `body` = başlığın altına düşen serbest metin. Hakkımda ve Deneyim'de boş:
    # içerikleri bileşenlerde (bio, zaman çizelgesi, linkler) üretiliyor.
    # İletişim'in müsaitlik cümlesi kullanıcı isteğiyle kalktı (Oturum 4).
    # Projeler bölümü kullanıcı isteğiyle kalktı (Oturum 2); proje KAYITLARI
    # duruyor — panelden "Projeler" türünde bölüm eklenince sitede görünür (Faz 9).
    # `nav_label` = üst menüdeki kısa ad; yoksa menü başlığı kullanır.
    # `kind`: hangi bileşen çizer (Faz 9) — bu üçü hazır tür, silinmez.
    for sid, slug, kind, order, heading, nav_label, body in [
        ("hakkimda", "hakkimda", "about", 1, ("Hakkımda", "About"), None, None),
        ("deneyim", "deneyim", "experience", 2, ("Deneyim ve Eğitim", "Experience & Education"),
         ("Deneyim", "Experience"), None),
        ("iletisim", "iletisim", "contact", 3, ("İletişim", "Contact"), None, None),
    ]:
        rows.append(Section(id=sid, slug=slug, kind=kind, order=order))
        rows += _t("section", sid, "heading", heading[0], heading[1])
        if nav_label:
            rows += _t("section", sid, "nav_label", nav_label[0], nav_label[1])
        if body:
            rows += _t("section", sid, "body", body[0], body[1])

    # ── Admin ───────────────────────────────────────────────────────────────
    rows.append(
        AdminUser(
            email=settings.admin_email,
            password_hash=hash_password(settings.admin_password),
        )
    )

    session.add_all(rows)
    session.commit()
    return True
