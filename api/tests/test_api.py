import io
import json
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

T = lambda tr, en=None: {"tr": tr, "en": en or tr}  # noqa: E731


def published(data_dir: str) -> dict:
    """Ziyaretçinin gördüğü: Caddy'nin sunduğu content.json."""
    return json.loads((Path(data_dir) / "content.json").read_text(encoding="utf-8"))


def section(content: dict, sid: str) -> dict | None:
    return next((s for s in content["sections"] if s["id"] == sid), None)


# ── Kimlik ───────────────────────────────────────────────────────────────────


def test_admin_requires_token(client: TestClient) -> None:
    assert client.get("/api/admin/content").status_code == 401
    assert client.post("/api/admin/sections", json={}).status_code == 401


def test_wrong_password(client: TestClient) -> None:
    ip = {"X-Forwarded-For": "203.0.113.1"}
    r = client.post("/api/auth/login", headers=ip, json={"email": "admin@localhost", "password": "yanlis"})
    assert r.status_code == 401


def test_login_is_throttled_per_ip(client: TestClient) -> None:
    """5 hatalı denemeden sonra doğru parola bile 429 — tahmin yavaşlasın; başka IP etkilenmez."""
    bad = {"email": "admin@localhost", "password": "yanlis"}
    good = {"email": "admin@localhost", "password": "degistir"}
    ip = {"X-Forwarded-For": "203.0.113.9"}
    for _ in range(5):
        assert client.post("/api/auth/login", headers=ip, json=bad).status_code == 401
    r = client.post("/api/auth/login", headers=ip, json=good)
    assert r.status_code == 429 and int(r.headers["Retry-After"]) > 0
    other = {"X-Forwarded-For": "203.0.113.10"}
    assert client.post("/api/auth/login", headers=other, json=good).status_code == 200


# ── Hazır içerik ve göç ──────────────────────────────────────────────────────


def test_seeded_sections_have_kinds(client: TestClient, data_dir: str) -> None:
    kinds = {s["id"]: s["kind"] for s in published(data_dir)["sections"]}
    assert kinds == {"hakkimda": "about", "deneyim": "experience", "iletisim": "contact"}


def test_builtin_section_cannot_be_deleted_but_can_be_hidden(
    client: TestClient, auth: dict, data_dir: str
) -> None:
    assert client.delete("/api/admin/sections/hakkimda", headers=auth).status_code == 409
    body = {"heading": T("Hakkımda", "About"), "visible": False}
    assert client.put("/api/admin/sections/hakkimda", json=body, headers=auth).status_code == 204
    assert section(published(data_dir), "hakkimda") is None
    admin = client.get("/api/admin/content", headers=auth).json()
    assert section(admin, "hakkimda")["visible"] is False
    body["visible"] = True
    client.put("/api/admin/sections/hakkimda", json=body, headers=auth)
    assert section(published(data_dir), "hakkimda") is not None


# ── Yeni bölümler ────────────────────────────────────────────────────────────


def test_text_section_lifecycle(client: TestClient, auth: dict, data_dir: str) -> None:
    body = {"id": "hobiler", "kind": "text", "heading": T("Hobiler", "Hobbies"),
            "body": {"tr": ["Teleskop."], "en": ["Telescope."]}}
    assert client.post("/api/admin/sections", json=body, headers=auth).status_code == 204
    assert client.post("/api/admin/sections", json=body, headers=auth).status_code == 409
    s = section(published(data_dir), "hobiler")
    assert s["kind"] == "text" and s["body"]["en"] == ["Telescope."]
    assert client.delete("/api/admin/sections/hobiler", headers=auth).status_code == 204
    assert section(published(data_dir), "hobiler") is None


def test_new_section_goes_before_contact(client: TestClient, auth: dict, data_dir: str) -> None:
    client.post("/api/admin/sections", headers=auth,
                json={"id": "araya", "kind": "text", "heading": T("Araya")})
    ids = [s["id"] for s in published(data_dir)["sections"]]
    assert ids[-1] == "iletisim" and ids[-2] == "araya"
    client.delete("/api/admin/sections/araya", headers=auth)


def test_reserved_and_builtin_kinds_rejected(client: TestClient, auth: dict) -> None:
    ust = {"id": "ust", "kind": "text", "heading": T("Üst")}
    assert client.post("/api/admin/sections", json=ust, headers=auth).status_code == 409
    about = {"id": "ikinci", "kind": "about", "heading": T("İkinci")}
    assert client.post("/api/admin/sections", json=about, headers=auth).status_code == 422


def test_announcement_fields(client: TestClient, auth: dict, data_dir: str) -> None:
    body = {"id": "duyuru", "kind": "announcement", "heading": T("Duyuru", "News"),
            "link": {"label": T("Kayıt", "Sign up"), "href": "https://ornek.dev"},
            "startsOn": "2026-10-01", "endsOn": "2026-10-31"}
    assert client.post("/api/admin/sections", json=body, headers=auth).status_code == 204
    s = section(published(data_dir), "duyuru")
    assert s["link"] == {"label": T("Kayıt", "Sign up"), "href": "https://ornek.dev"}
    assert (s["startsOn"], s["endsOn"]) == ("2026-10-01", "2026-10-31")
    bad = {**body, "endsOn": "2026-09-01"}
    del bad["id"], bad["kind"]
    assert client.put("/api/admin/sections/duyuru", json=bad, headers=auth).status_code == 422
    # Diğer türlerde bağlantı/tarih yok.
    text = {"heading": T("Hakkımda", "About"), "startsOn": "2026-10-01"}
    assert client.put("/api/admin/sections/hakkimda", json=text, headers=auth).status_code == 422
    client.delete("/api/admin/sections/duyuru", headers=auth)


def test_timeline_items(client: TestClient, auth: dict, data_dir: str) -> None:
    client.post("/api/admin/sections", headers=auth,
                json={"id": "oduller", "kind": "timeline", "heading": T("Ödüller", "Awards")})
    for i in ("odul-a", "odul-b"):
        r = client.post("/api/admin/sections/oduller/items", headers=auth,
                        json={"id": i, "org": "Kurum", "role": T(i), "period": "2025"})
        assert r.status_code == 204
    r = client.put("/api/admin/sections/oduller/items/order", headers=auth,
                   json={"ids": ["odul-b", "odul-a"]})
    assert r.status_code == 204
    s = section(published(data_dir), "oduller")
    assert [m["id"] for m in s["items"]] == ["odul-b", "odul-a"]
    # Profilin deneyim/eğitim listesine karışmıyor.
    exp = published(data_dir)["profile"]["experience"]
    assert all(m["id"] not in ("odul-a", "odul-b") for m in exp)
    # Silinen bölüm maddelerini de götürür.
    client.delete("/api/admin/sections/oduller", headers=auth)
    r = client.post("/api/admin/milestones", headers=auth, json={
        "id": "odul-a", "kind": "experience", "org": "X", "role": T("Y"),
    })
    assert r.status_code == 204, "silinen bölümün maddesi kimliği tutmaya devam ediyor"
    client.delete("/api/admin/milestones/odul-a", headers=auth)


# ── Medya ────────────────────────────────────────────────────────────────────


def _jpeg_with_gps(width: int = 2400, height: int = 1600) -> bytes:
    image = Image.new("RGB", (width, height), (40, 120, 200))
    exif = Image.Exif()
    exif[0x010F] = "Telefon"  # Make
    exif[0x8825] = {1: "N", 2: (38.0, 25.0, 0.0), 3: "E", 4: (27.0, 8.0, 0.0)}  # GPS
    out = io.BytesIO()
    image.save(out, "JPEG", exif=exif)
    return out.getvalue()


def _upload(client: TestClient, auth: dict, data: bytes, name: str = "foto.jpg"):
    return client.post("/api/admin/media", headers=auth, files={"file": (name, data, "image/jpeg")})


def test_upload_strips_exif_and_makes_webp(client: TestClient, auth: dict, data_dir: str) -> None:
    r = _upload(client, auth, _jpeg_with_gps())
    assert r.status_code == 201, r.text
    media = r.json()
    assert (media["width"], media["height"]) == (2400, 1600)
    assert media["widths"] == [640, 1280, 1920]
    for w in media["widths"]:
        path = Path(data_dir) / "uploads" / f"{media['id']}-{w}.webp"
        with Image.open(path) as im:
            assert im.format == "WEBP" and im.width == w
            assert not im.getexif(), "EXIF (GPS dahil) yayınlanan dosyada kalmamalı"
    assert client.delete(f"/api/admin/media/{media['id']}", headers=auth).status_code == 204
    assert not list((Path(data_dir) / "uploads").glob(f"{media['id']}-*"))


def test_small_image_keeps_own_width(client: TestClient, auth: dict) -> None:
    media = _upload(client, auth, _jpeg_with_gps(500, 300)).json()
    assert media["widths"] == [500]
    client.delete(f"/api/admin/media/{media['id']}", headers=auth)


def test_rejects_non_images(client: TestClient, auth: dict) -> None:
    assert _upload(client, auth, b"<svg></svg>", "x.jpg").status_code == 422
    gif = io.BytesIO()
    Image.new("RGB", (10, 10)).save(gif, "GIF")
    assert _upload(client, auth, gif.getvalue(), "x.gif").status_code == 422


def test_gallery_and_media_in_use(client: TestClient, auth: dict, data_dir: str) -> None:
    a = _upload(client, auth, _jpeg_with_gps(800, 600)).json()["id"]
    b = _upload(client, auth, _jpeg_with_gps(800, 600)).json()["id"]
    alt = {"alt": T("Teleskop", "Telescope")}
    assert client.put(f"/api/admin/media/{a}", json=alt, headers=auth).status_code == 204
    client.post("/api/admin/sections", headers=auth,
                json={"id": "galeri", "kind": "gallery", "heading": T("Galeri", "Gallery")})
    items = {"items": [{"mediaId": b}, {"mediaId": a, "caption": T("Gece", "Night")}]}
    assert client.put("/api/admin/sections/galeri/media", json=items, headers=auth).status_code == 204
    s = section(published(data_dir), "galeri")
    assert [m["id"] for m in s["media"]] == [b, a]
    assert s["media"][1]["alt"] == T("Teleskop", "Telescope")
    assert s["media"][1]["caption"] == T("Gece", "Night")
    # Kullanılan görsel silinmez; galeri gidince silinir.
    r = client.delete(f"/api/admin/media/{a}", headers=auth)
    assert r.status_code == 409 and "galeri" in r.json()["detail"]
    dup = {"items": [{"mediaId": a}, {"mediaId": a}]}
    assert client.put("/api/admin/sections/galeri/media", json=dup, headers=auth).status_code == 422
    client.delete("/api/admin/sections/galeri", headers=auth)
    for m in (a, b):
        assert client.delete(f"/api/admin/media/{m}", headers=auth).status_code == 204


def test_gallery_only_for_gallery_sections(client: TestClient, auth: dict) -> None:
    r = client.put("/api/admin/sections/hakkimda/media", json={"items": []}, headers=auth)
    assert r.status_code == 409


# ── Projeler ─────────────────────────────────────────────────────────────────


def test_projects_crud_and_unpublished(client: TestClient, auth: dict, data_dir: str) -> None:
    body = {"id": "yeni-proje", "title": T("Yeni"), "summary": T("Özet", "Summary"),
            "tech": ["React"], "repoUrl": "https://github.com/x/y", "published": False}
    assert client.post("/api/admin/projects", json=body, headers=auth).status_code == 204
    assert all(p["id"] != "yeni-proje" for p in published(data_dir)["projects"])
    admin = client.get("/api/admin/content", headers=auth).json()
    assert any(p["id"] == "yeni-proje" for p in admin["projects"])
    bad = {**body, "repoUrl": "javascript:alert(1)"}
    del bad["id"]
    assert client.put("/api/admin/projects/yeni-proje", json=bad, headers=auth).status_code == 422
    cover = _upload(client, auth, _jpeg_with_gps(800, 600)).json()["id"]
    body2 = {k: v for k, v in body.items() if k != "id"} | {"published": True, "coverMediaId": cover}
    assert client.put("/api/admin/projects/yeni-proje", json=body2, headers=auth).status_code == 204
    p = next(p for p in published(data_dir)["projects"] if p["id"] == "yeni-proje")
    assert p["cover"]["id"] == cover
    assert client.delete(f"/api/admin/media/{cover}", headers=auth).status_code == 409
    assert client.delete("/api/admin/projects/yeni-proje", headers=auth).status_code == 204
    assert client.delete(f"/api/admin/media/{cover}", headers=auth).status_code == 204


# ── Güvenlik taraması (Oturum 6) ─────────────────────────────────────────────


def test_unauthenticated_upload_is_rejected_before_body(client: TestClient) -> None:
    """Token'sız yükleme gövde okunmadan reddedilir (FastAPI gövdeyi kimlikten önce okuyordu)."""
    r = client.post("/api/admin/media", files={"file": ("a.jpg", b"x" * 1024, "image/jpeg")})
    assert r.status_code == 401


def test_oversized_body_is_413(client: TestClient, auth: dict) -> None:
    big = b"x" * (16 * 1024 * 1024 + 10)
    r = client.post("/api/admin/media", headers=auth, files={"file": ("a.jpg", big, "image/jpeg")})
    assert r.status_code == 413


def test_oversized_chunked_body_is_413(client: TestClient, auth: dict) -> None:
    """Uzunluk beyan edilmeden (chunked) gönderilen büyük gövde de sayılıp kesilir."""
    def chunks():
        for _ in range(17):
            yield b"x" * (1024 * 1024)
    r = client.post("/api/admin/sections", headers={**auth, "content-type": "application/json"}, content=chunks())
    assert r.status_code == 413


def test_pixel_bomb_between_limits_is_rejected(client: TestClient, auth: dict) -> None:
    """40-80 MP arası: Pillow yalnızca uyarıyor — biz başlıktan reddediyoruz."""
    out = io.BytesIO()
    Image.new("1", (7100, 7100)).save(out, "PNG")  # 50 MP, birkaç KB
    r = _upload(client, auth, out.getvalue(), "bomba.png")
    assert r.status_code == 422 and "megapiksel" in r.json()["detail"]


def test_xmp_location_is_not_published(client: TestClient, auth: dict, data_dir: str) -> None:
    """GPS yalnızca EXIF'te değil XMP'de de olabilir — yayınlanan WebP'de hiçbiri olmamalı."""
    xmp = (b'<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
           b'<rdf:Description xmlns:exif="http://ns.adobe.com/exif/1.0/" exif:GPSLatitude="38,25.0N"/>'
           b"</rdf:RDF></x:xmpmeta>")
    out = io.BytesIO()
    Image.new("RGB", (900, 600), (10, 20, 30)).save(out, "JPEG", xmp=xmp)
    assert b"GPSLatitude" in out.getvalue(), "örnek dosya XMP taşımıyor — test geçersiz"
    media = _upload(client, auth, out.getvalue()).json()
    for w in media["widths"]:
        raw = (Path(data_dir) / "uploads" / f"{media['id']}-{w}.webp").read_bytes()
        assert b"GPSLatitude" not in raw and b"xmpmeta" not in raw
    client.delete(f"/api/admin/media/{media['id']}", headers=auth)


# ── Keşif dosyaları (discovery.py) ──────────────────────────────────────────


def test_discovery_files_without_domain(client: TestClient, data_dir: str) -> None:
    # Testte DOMAIN yok: robots ve llms yazılır, mutlak adres isteyenler yazılmaz.
    root = Path(data_dir)
    robots = (root / "robots.txt").read_text(encoding="utf-8")
    assert "Allow: /" in robots and "Sitemap" not in robots
    assert not (root / "sitemap.xml").exists()
    llms = (root / "llms.txt").read_text(encoding="utf-8")
    assert llms.startswith(f"# {published(data_dir)['profile']['name']}")
    assert "canonical" not in (root / "meta.html").read_text(encoding="utf-8")


def test_site_url_from_domain() -> None:
    from app.config import Settings

    assert Settings(domain="oguzhd.com").site_url == "https://oguzhd.com"
    assert Settings(domain="https://oguzhd.com/").site_url == "https://oguzhd.com"
    assert Settings(domain=":80").site_url is None
    assert Settings(domain="").site_url is None


def test_discovery_with_domain(client: TestClient) -> None:
    from sqlmodel import Session

    from app.content import build_content, render_meta
    from app.db import engine
    from app.discovery import render_llms, render_robots, render_sitemap

    with Session(engine) as s:
        content = build_content(s)
    url = "https://oguzhd.com"
    assert f"Sitemap: {url}/sitemap.xml" in render_robots(url)
    assert f"<loc>{url}/</loc>" in render_sitemap(url)
    assert f'<link rel="canonical" href="{url}/" />' in render_meta(content, url)
    assert f"Website: {url}/" in render_llms(content, url)
