import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select

from app import admin, auth, content
from app.auth import verify_password
from app.config import INSECURE_DEFAULT_PASSWORD, INSECURE_DEFAULT_SECRET, get_settings
from app.db import engine, init_db
from app.limits import BodyLimit
from app.models import AdminUser
from app.publish import publish
from app.seed import seed

logger = logging.getLogger("uvicorn.error")

#: HS256 için en az 256 bit — `openssl rand -hex 32` 64 karakter verir.
MIN_SECRET_LENGTH = 32
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    init_db()
    with Session(engine) as session:
        if seed(session):
            logger.info("Veritabanı boştu, başlangıç içeriğiyle dolduruldu.")
        # Güvenlik kontrolünden ÖNCE: API güvensiz varsayılanlar yüzünden açılmasa
        # da site (Caddy) güncel içerikle ayakta kalsın — kapanan yalnızca panel.
        publish(session)
        if not settings.debug:
            refuse_insecure_defaults(session)
    yield


def refuse_insecure_defaults(session: Session) -> None:
    """
    Üretimde bilinen varsayılanlarla AÇILMA — uyarmak yetmiyor.

    ⚠️ Parola, ortam değişkenine değil VERİTABANINDAKİ hash'e karşı kontrol
    ediliyor: tohumlama yalnızca boş veritabanında çalışıyor, yani `.env`'e
    sonradan güçlü bir parola yazmak mevcut hesabı değiştirmiyor. Hesap hâlâ
    'degistir'i kabul ediyorsa panel herkese açık demektir.
    """
    problems: list[str] = []
    if settings.jwt_secret == INSECURE_DEFAULT_SECRET:
        problems.append("JWT_SECRET varsayılan değerde (token'lar taklit edilebilir)")
    elif len(settings.jwt_secret) < MIN_SECRET_LENGTH:
        # HS256 anahtarı kısaysa çevrimdışı kaba kuvvetle bulunur (güvenlik taraması).
        problems.append(f"JWT_SECRET {MIN_SECRET_LENGTH} karakterden kısa")
    admins = session.exec(select(AdminUser)).all()
    if any(verify_password(INSECURE_DEFAULT_PASSWORD, a.password_hash) for a in admins):
        problems.append("admin hesabı varsayılan parolayı kabul ediyor")
    if problems:
        raise RuntimeError(
            "Üretimde güvensiz varsayılanlar: " + "; ".join(problems) + ". "
            ".env → JWT_SECRET ve ADMIN_PASSWORD verin; hesap zaten oluşmuşsa "
            "parolayı değiştirin ya da veritabanını sıfırlayın (docs/CALISTIRMA.md)."
        )


app = FastAPI(
    title="prizma-portfolio API",
    description=(
        "Oğuz Han Duran'ın kişisel sitesinin içerik ve yönetim API'si.\n\n"
        "`GET /api/content` tüm siteyi tek JSON olarak döndürür — ziyaretçi tarafı "
        "veritabanını hiç görmez."
    ),
    version="0.1.0",
    lifespan=lifespan,
    # Yayında API belgeleri kapalı: uç noktaların haritasını dışarıya vermesin.
    # (Caddy /docs'u zaten API'ye yönlendirmiyor; bu ikinci kat.) Geliştirmede açık.
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

# Gövde sınırı ve token'sız erken ret — gövde okunmadan (limits.py).
app.add_middleware(BodyLimit)

app.include_router(content.router)
app.include_router(auth.router)
app.include_router(admin.router)

# Yüklenen görseller. Yayında bu adresi Caddy volume'dan sunuyor (Caddyfile → /uploads),
# istek API'ye hiç gelmiyor; bu bağlama geliştirme içindir (site ve panelin Vite'ı
# /uploads'ı buraya yönlendiriyor).
app.mount("/uploads", StaticFiles(directory=settings.data_dir / "uploads", check_dir=False))


@app.get("/api/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}
