"""
İstek gövdesi sınırı — gövde OKUNMADAN önce.

Neden ara katman: FastAPI yükleme gövdesini (multipart) uç noktanın bağımlılıklarından,
yani KİMLİK DENETİMİNDEN önce okuyor; token'sız biri de sunucuya dosya yazdırabiliyordu.
Caddy'nin `request_body max_size`'ı tek başına yetmiyordu: gövdeyi 16 MB'da kesiyor ama
API beyan edilen uzunluğu beklemeye devam ediyor, bağlantı yanıtsız asılı kalıyordu.

  1. Yönetim uçlarında geçerli bir Bearer token yoksa (başlık yok, imza ya da süre hatalı) → 401,
     gövdeye dokunmadan. Yalnızca başlığın varlığına bakmak yetmiyordu: sahte `Bearer x` ile 15 MB
     okutulup sonra reddediliyordu. Parola izi ve hesap kontrolü yine uç noktada.
  2. Content-Length sınırın üstündeyse → 413, gövdeye dokunmadan.
  3. Uzunluk beyan edilmemişse (chunked) okunan bayt sayılıyor; aşınca 413.
"""

import json

import jwt
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.config import get_settings

settings = get_settings()



MAX_BODY = 16 * 1024 * 1024  # yükleme 15 MB (media.py) + çok parçalı formun payı
PROTECTED = ("/api/admin/", "/api/auth/me", "/api/auth/password")


TOO_LARGE = "İstek gövdesi en fazla 16 MB olabilir"


async def _reply(send: Send, status: int, detail: str) -> None:
    body = json.dumps({"detail": detail}, ensure_ascii=False).encode()
    await send({
        "type": "http.response.start",
        "status": status,
        "headers": [
            (b"content-type", b"application/json; charset=utf-8"),
            (b"content-length", str(len(body)).encode()),
        ],
    })
    await send({"type": "http.response.body", "body": body})


def _valid_bearer(value: bytes) -> bool:
    scheme, _, token = value.decode("latin-1").partition(" ")
    if scheme.lower() != "bearer" or not token:
        return False
    try:
        jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        return False
    return True


class BodyLimit:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope["headers"])
        path: str = scope["path"]
        if path.startswith(PROTECTED) and not _valid_bearer(headers.get(b"authorization", b"")):
            await _reply(send, 401, "Oturum gerekli")
            return

        length = headers.get(b"content-length")
        if length is not None and length.isdigit() and int(length) > MAX_BODY:
            await _reply(send, 413, TOO_LARGE)
            return

        received = 0
        started = False
        refused = False

        async def counted() -> Message:
            # Sınır aşılınca yanıtı ara katman verir; uygulamaya "istemci koptu" denir ki
            # okumayı bıraksın (hata fırlatılsa FastAPI onu 400'e çeviriyordu).
            nonlocal received, refused
            if refused:
                return {"type": "http.disconnect"}
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > MAX_BODY:
                    refused = True
                    if not started:
                        await _reply(send, 413, TOO_LARGE)
                    return {"type": "http.disconnect"}
            return message

        async def tracked(message: Message) -> None:
            nonlocal started
            if refused:
                return  # yanıt zaten verildi; uygulamanınki yutulur
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        await self.app(scope, counted, tracked)
