import hashlib
from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlmodel import select

from app import throttle
from app.config import get_settings
from app.db import SessionDep
from app.models import AdminUser
from app.schemas import AdminOut, LoginIn, PasswordChangeIn, TokenOut

"""
Tek admin kullanıcı, JWT ile giriş (docs/ARCHITECTURE.md § 2).
Rol sistemi yok — çok kullanıcı olmadığı için karmaşıklığa gerek yok.
"""

settings = get_settings()

# argon2 varsayılan; pwdlib passlib'in güncel halefi.
password_hash = PasswordHash.recommended()

bearer_scheme = HTTPBearer(auto_error=False)

# Kullanıcı yokken de doğrulanacak sahte hash — bkz. `login`.
_DUMMY_HASH = password_hash.hash("zamanlama-esitleme-icin-sahte-parola")


def hash_password(raw: str) -> str:
    return password_hash.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    return password_hash.verify(raw, hashed)


def _password_mark(password_hash: str) -> str:
    """
    Token'ın taşıdığı parola izi: parola değişince o ana kadar verilen bütün
    token'lar geçersiz olsun (parola çalındıysa değiştirmek içerideki oturumu da
    düşürmeli). İz hash'ten türüyor — şemaya sütun eklemek gerekmiyor; argon2 her
    hash'e yeni tuz kattığı için aynı parola yeniden verilse bile iz değişir.
    """
    return hashlib.sha256(password_hash.encode()).hexdigest()[:16]


def create_access_token(user: AdminUser) -> str:
    expires = datetime.now(UTC) + timedelta(minutes=settings.access_token_ttl_minutes)
    return jwt.encode(
        {"sub": user.email, "pwd": _password_mark(user.password_hash), "exp": expires},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def get_current_admin(
    session: SessionDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> AdminUser:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz ya da süresi dolmuş oturum",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.PyJWTError:
        raise unauthorized from None

    email = payload.get("sub")
    if not email:
        raise unauthorized

    user = session.exec(select(AdminUser).where(AdminUser.email == email)).first()
    if user is None or payload.get("pwd") != _password_mark(user.password_hash):
        raise unauthorized
    return user


CurrentAdminDep = Annotated[AdminUser, Depends(get_current_admin)]

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(data: LoginIn, session: SessionDep, request: Request) -> TokenOut:
    # Parola tahminine karşı: aynı IP'den çok hatalı deneme → 429 (throttle.py).
    ip = throttle.client_ip(request)
    throttle.check(ip)
    user = session.exec(select(AdminUser).where(AdminUser.email == data.email)).first()

    # ⚠️ Kullanıcı yoksa da parola GERÇEKTEN doğrulanıyor (sahte hash'e karşı) ve
    # aynı hata dönüyor: "bu e-posta kayıtlı mı?" bilgisi ne içerikten ne de
    # SÜREDEN sızmasın. Eskiden kullanıcı yoksa argon2 hiç çalışmıyordu; kayıtsız
    # e-posta anında, kayıtlı e-posta ~50-100 ms sonra reddediliyordu.
    valid = verify_password(data.password, user.password_hash if user else _DUMMY_HASH)
    if user is None or not valid:
        throttle.failed(ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta ya da parola hatalı",
        )

    throttle.succeeded(ip)
    return TokenOut(access_token=create_access_token(user))


@router.get("/me")
def read_me(admin: CurrentAdminDep) -> AdminOut:
    return AdminOut(id=admin.id or 0, email=admin.email)


@router.put("/password")
def change_password(
    data: PasswordChangeIn, admin: CurrentAdminDep, session: SessionDep
) -> TokenOut:
    """
    Parolayı değiştirir ve YENİ bir token döndürür: eski token'lar — bu isteği
    yapan dahil — parola iziyle birlikte geçersiz oluyor (`_password_mark`).

    ⚠️ `.env`'deki ADMIN_PASSWORD'u değiştirmek hesabı değiştirmez (tohumlama
    yalnızca boş veritabanında çalışır) — parola buradan değişir.
    """
    if not verify_password(data.current_password, admin.password_hash):
        # 401 değil: oturum geçerli, yanlış olan formdaki parola. 401 panelde
        # "oturum düştü" diye girişe atardı.
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mevcut parola hatalı")
    admin.password_hash = hash_password(data.new_password)
    session.add(admin)
    session.commit()
    return TokenOut(access_token=create_access_token(admin))
