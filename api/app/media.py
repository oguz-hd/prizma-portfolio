import io
import json
import secrets
from datetime import UTC, datetime
from pathlib import Path

from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError

from app.config import get_settings
from app.models import Media

"""
Görsel yükleme (Faz 9) — dosyayı web'e hazır WebP'lere çevirir.

    yükleme ──Pillow──> /data/uploads/{id}-640.webp, -1280, -1920 (orijinalden küçük olanlar)

★ Orijinal SAKLANMIYOR ve EXIF hiç yazılmıyor: telefon fotoğrafları çekildiği yerin
GPS konumunu taşır; yayınlanan bir görselde bu, ev adresini vermek demek. Yönlendirme
(EXIF Orientation) önce piksellere uygulanıyor (`exif_transpose`), sonra etiket atılıyor.

Biçim dosya adından değil İÇERİKTEN anlaşılıyor (Pillow açabiliyor mu, ne açtı).
Caddy dosyaları `/uploads/` altında sunuyor (Caddyfile); ziyaretçi API'ye hiç gitmiyor.
"""

settings = get_settings()

MAX_BYTES = 15 * 1024 * 1024
#: Sıkıştırma bombası: küçük dosya, devasa piksel. ⚠️ Pillow'un kendi sınırı yalnızca
#: 2 KATINI aşınca hata veriyor, arası uyarıyla açılıyordu (40-80 MP → yüzlerce MB bellek;
#: güvenlik taraması) — sınır aşağıda başlıktan, piksel açılmadan uygulanıyor.
MAX_PIXELS = 40_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS
#: Açılış çözücüleri. Telefon JPEG'leri (portre, HDR) birden çok kare taşır: JPEG çözücüsü açar,
#: sonra `image.format` "MPO" olur, o yüzden ACCEPTED'a ayrıca girer.
FORMATS = ["JPEG", "PNG", "WEBP"]
ACCEPTED = {*FORMATS, "MPO"}
#: WebP kenar sınırı; uzun ekran görüntüleri bunu aşabilir.
WEBP_MAX_SIDE = 16383
#: Üretilen genişlikler — site `srcset` ile ekrana uygun olanı seçiyor.
WIDTHS = (640, 1280, 1920)
QUALITY = 82


def uploads_dir() -> Path:
    path = settings.data_dir / "uploads"
    path.mkdir(parents=True, exist_ok=True)
    return path


def file_name(media_id: str, width: int) -> str:
    return f"{media_id}-{width}.webp"


def _bad(detail: str) -> HTTPException:
    return HTTPException(422, detail=detail)


def store(data: bytes) -> Media:
    """Görseli doğrula, WebP'lere çevir, diske yaz. Veritabanı satırını döner (eklenmemiş)."""
    if len(data) > MAX_BYTES:
        raise HTTPException(413, detail="Görsel en fazla 15 MB olabilir")
    try:
        # `formats`: yalnızca bu çözücüler çalışır (EPS/PSD/TIFF… açılmasın).
        image = Image.open(io.BytesIO(data), formats=FORMATS)  # yalnızca başlık okunuyor
        kind = image.format
        if image.width * image.height > MAX_PIXELS:
            raise _bad("Görsel çok büyük: en fazla 40 megapiksel")
        image.load()
    except (
        UnidentifiedImageError,
        Image.DecompressionBombError,
        OSError,
        ValueError,
        SyntaxError,
        EOFError,
    ) as err:
        raise _bad("Görsel okunamadı (JPEG, PNG ya da WebP olmalı)") from err
    if kind not in ACCEPTED:
        raise _bad("Yalnızca JPEG, PNG ve WebP kabul ediliyor")

    image = ImageOps.exif_transpose(image)
    # Saydamlık korunur (PNG/WebP); diğerleri RGB. Palet/CMYK vb. düzleşir.
    image = image.convert("RGBA" if image.mode in ("RGBA", "LA", "P") else "RGB")

    media_id = secrets.token_hex(6)
    widths = [w for w in WIDTHS if w < image.width] or [image.width]
    if image.width > widths[-1] and len(widths) < len(WIDTHS):
        widths.append(image.width)  # orijinal büyük ama en büyük basamaktan küçük
    if max(round(image.height * w / image.width) for w in widths) > WEBP_MAX_SIDE:
        raise _bad(f"Görsel çok uzun: yükseklik en fazla {WEBP_MAX_SIDE} piksel olabilir")
    folder = uploads_dir()
    written: list[Path] = []
    try:
        for w in widths:
            h = round(image.height * w / image.width)
            resized = image if w == image.width else image.resize((w, h), Image.Resampling.LANCZOS)
            target = folder / file_name(media_id, w)
            written.append(target)
            # exif verilmiyor → yazılmıyor.
            resized.save(target, "WEBP", quality=QUALITY, method=6)
    except (ValueError, OSError) as err:
        for path in written:  # satır yazılmadığı için yarım dosyalar sonsuza dek artık kalırdı
            path.unlink(missing_ok=True)
        raise _bad("Görsel dönüştürülemedi") from err

    return Media(
        id=media_id,
        width=image.width,
        height=image.height,
        widths=json.dumps(widths),
        bytes=sum((folder / file_name(media_id, w)).stat().st_size for w in widths),
        created_at=datetime.now(UTC).isoformat(timespec="seconds"),
    )


def remove_files(media: Media) -> None:
    for w in json.loads(media.widths):
        (uploads_dir() / file_name(media.id, w)).unlink(missing_ok=True)
