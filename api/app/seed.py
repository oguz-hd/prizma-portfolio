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
İlk açılış verisi — kaynağı `web/src/content/site.ts`.

⚠️ Bu bir GÖÇ değil, TOHUM. Veritabanı boşsa doldurur, doluysa hiç dokunmaz.
Yoksa panelden (Faz 7) yapılan her düzenleme yeniden başlatmada silinirdi.

⚠️ Metinler hâlâ taslak — kullanıcıyla gözden geçirilecek (docs/BRIEF.md § 5).
Gözden geçirme panel geldikten sonra olursa buradaki kopya bayatlar; o yüzden
o iş panelden önce yapılmalı.
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
    rows.append(SiteSettings(id="settings", preset="tayf"))
    rows += _t(
        "settings", "settings", "metaTitle",
        "Oğuz Han Duran — Full-stack geliştirici",
        "Oğuz Han Duran — Full-stack developer",
    )
    rows += _t(
        "settings", "settings", "metaDescription",
        "React, FastAPI ve .NET ile uçtan uca ürünler kuran full-stack geliştirici. İzmir.",
        "Full-stack developer building end-to-end products with React, FastAPI and .NET. "
        "İzmir, Türkiye.",
    )

    # ── Profil ──────────────────────────────────────────────────────────────
    rows.append(Profile(id="profile", name="Oğuz Han Duran"))
    rows += _t("profile", "profile", "title", "Full-stack geliştirici", "Full-stack developer")
    rows += _t("profile", "profile", "location", "İzmir", "İzmir, Türkiye")
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
    # Oturum 15'te sadeleşti — gerekçe web/src/content/site.ts'te. İki kopya
    # Faz 6'ya kadar elle eşit tutuluyor.
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
                ".NET Core 8 üzerinde kuruldu, veriler MSSQL'de tutuluyor.",
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
    # İletişim'deki müsaitlik cümlesi bilerek burada — iş bulununca panelden
    # silinecek bir satır, koda gömülü bir dize değil.
    # Projeler bölümü kullanıcı isteğiyle kalktı (Oturum 2); proje KAYITLARI
    # duruyor — bölüm geri eklenirse ön yüzde bileşeni hazır.
    for sid, slug, order, heading, body in [
        ("hakkimda", "hakkimda", 1, ("Hakkımda", "About"), None),
        ("deneyim", "deneyim", 2, ("Deneyim ve Eğitim", "Experience & Education"), None),
        ("iletisim", "iletisim", 3, ("İletişim", "Contact"),
         ("Mezun oldum, şu an yeni bir rol arıyorum. Uçtan uca sorumluluk aldığım "
          "— arayüzü de servisi de yazdığım — işler ilgimi çekiyor.",
          "I’ve graduated and I’m looking for a new role. I’m drawn to work where "
          "I own things end to end — writing both the interface and the service.")),
    ]:
        rows.append(Section(id=sid, slug=slug, order=order))
        rows += _t("section", sid, "heading", heading[0], heading[1])
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
