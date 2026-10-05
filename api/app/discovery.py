from datetime import UTC, datetime
from html import escape

from app.schemas import LocalizedList, LocalizedText, SiteContentOut

"""
Keşif dosyaları (yayın kontrol listesi, 05.10.2026) — arama motorları ve dil modelleri için.

    robots.txt    her zaman; alan adı varsa Sitemap satırıyla
    sitemap.xml   yalnızca alan adı varsa (mutlak adres zorunlu)
    llms.txt      sitenin düz metin özeti (llmstxt.org) — JS çalıştırmayan okuyucu
                  için; slaytlar tek sayfada olduğundan asıl içerik ancak böyle okunur

publish.py hepsini content.json'la birlikte yazar, Caddy /data'dan sunar. İngilizce:
site İngilizce açılıyor (web/src/i18n/types.ts → DEFAULT_LOCALE), kart da öyle.
"""

LOCALE = "en"


def _t(value: LocalizedText | None) -> str:
    if value is None:
        return ""
    return getattr(value, LOCALE) or value.tr


def _p(value: LocalizedList) -> list[str]:
    return getattr(value, LOCALE) or value.tr


def render_robots(site_url: str | None) -> str:
    # Panel X-Robots-Tag: noindex ile dizine girmiyor (Caddyfile); burada Disallow
    # edilmiyor: engellenen sayfa taranamaz, noindex'i de görülemez.
    lines = ["User-agent: *", "Allow: /"]
    if site_url:
        lines += ["", f"Sitemap: {site_url}/sitemap.xml"]
    return "\n".join(lines) + "\n"


def render_sitemap(site_url: str) -> str:
    # Tek adres: slaytlar #hash'te, arama motoru onları ayrı sayfa saymaz.
    day = datetime.now(UTC).date().isoformat()
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"  <url><loc>{escape(site_url)}/</loc><lastmod>{day}</lastmod></url>\n"
        "</urlset>\n"
    )


def render_llms(content: SiteContentOut, site_url: str | None) -> str:
    p = content.profile
    out: list[str] = [f"# {p.name}", ""]
    summary = " · ".join(x for x in (_t(p.title), _t(p.location)) if x)
    if summary:
        out += [f"> {summary}", ""]
    if tagline := _t(p.tagline):
        out += [tagline, ""]
    for para in _p(p.bio):
        out += [para, ""]

    if p.skills:
        out += ["## Skills", ""]
        out += [f"- {_t(s.group)}: {', '.join(s.items)}" for s in p.skills]
        out.append("")

    for heading, items in (("Experience", p.experience), ("Education", p.education)):
        if items:
            out += [f"## {heading}", ""]
            out += [
                f"- {_t(m.role)}, {m.org}" + (f" ({m.period})" if m.period else "") for m in items
            ]
            out.append("")

    if content.projects:
        out += ["## Projects", ""]
        for pr in content.projects:
            line = f"- {_t(pr.title)}: {_t(pr.summary)}"
            urls = [u for u in (pr.live_url, pr.repo_url) if u]
            if urls:
                line += " — " + ", ".join(urls)
            out.append(line)
        out.append("")

    # Panelden eklenen serbest metin ve duyuru bölümleri; hazır bölümlerin metni
    # zaten yukarıda (profil), galeri yalnızca görsel.
    for s in content.sections:
        if s.kind in ("text", "announcement") and (body := _p(s.body)):
            out += [f"## {_t(s.heading)}", "", *[x for para in body for x in (para, "")]]

    if content.links:
        out += ["## Links", ""]
        out += [f"- [{_t(link.label)}]({link.href})" for link in content.links]
        out.append("")

    if site_url:
        out += [f"Website: {site_url}/", ""]
    return "\n".join(out).rstrip() + "\n"
