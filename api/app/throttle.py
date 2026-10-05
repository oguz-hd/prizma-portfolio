import threading
import time
from collections import deque

from fastapi import HTTPException, Request, status

"""
Giriş denemesi sınırı (yayına hazırlık, Oturum 6) — parola tahminini yavaşlatır.

Aynı IP'den `MAX_FAILURES` hatalı denemeden sonra pencere dolana kadar 429 +
Retry-After. Başarılı giriş o IP'nin sayacını siler. Bellekte: tek süreç (fastapi run,
tek işçi) ve tek admin için yeterli; API yeniden başlarsa sayaç sıfırlanır — argon2
zaten her denemeyi ~50-100 ms'ye mal ediyor, bu ikinci kat.

IP: yayında istek Caddy'den gelir, `request.client` Caddy'nin adresidir. Caddy dışarıdan
gelen X-Forwarded-For'a güvenmiyor (trusted_proxies tanımsız), başlığı kendisi yazıyor —
ilk değer gerçek istemci. Geliştirmede başlık yoksa doğrudan bağlanan adres.
"""

MAX_FAILURES = 5
WINDOW_SECONDS = 15 * 60

_lock = threading.Lock()
_failures: dict[str, deque[float]] = {}


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "?"


def _recent(ip: str, now: float) -> deque[float]:
    times = _failures.setdefault(ip, deque())
    while times and now - times[0] > WINDOW_SECONDS:
        times.popleft()
    return times


def check(ip: str) -> None:
    """Sınır dolduysa 429 — parola hiç doğrulanmadan (argon2'yi de boşa çalıştırmasın)."""
    now = time.monotonic()
    with _lock:
        times = _recent(ip, now)
        if not times:
            # Penceresi dolmuş IP sözlükte kalmasın: adres değiştirerek deneyen biri
            # her adresle bir girdi bırakıp belleği şişirebiliyordu (kod incelemesi, 05.10.2026).
            _failures.pop(ip, None)
            return
        if len(times) < MAX_FAILURES:
            return
        retry = int(WINDOW_SECONDS - (now - times[0])) + 1
    raise HTTPException(
        status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"Çok fazla hatalı deneme — {max(1, round(retry / 60))} dakika sonra yeniden dene",
        headers={"Retry-After": str(retry)},
    )


#: Bu kadar IP birikince süresi dolmuşlar toplu silinir (bir kez deneyip dönmeyenler).
SWEEP_AT = 1000


def failed(ip: str) -> None:
    now = time.monotonic()
    with _lock:
        _recent(ip, now).append(now)
        if len(_failures) > SWEEP_AT:
            for key in [k for k, t in _failures.items() if now - t[-1] > WINDOW_SECONDS]:
                del _failures[key]


def succeeded(ip: str) -> None:
    with _lock:
        _failures.pop(ip, None)
