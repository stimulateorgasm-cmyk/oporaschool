"""
Telegram-бот для приёма заявок с сайта Опора.
FastAPI сервер, проксируется через Caddy на /api/*
"""
import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="Opora Bot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://opora.school", "https://opora.molvamarketing.com"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

BOT_TOKEN = os.environ.get("BOT_TOKEN", "8954735990:AAE8rx1FlcY3Xk-cew8Bw6li2VJYGZc6uCo")
CHAT_IDS = os.environ.get("CHAT_IDS", "").split(",")  # через запятую

TELEGRAM_API = f"https://api.telegram.org/bot{BOT_TOKEN}"


class LeadForm(BaseModel):
    name: str
    phone: str
    subject: str
    comment: str = ""


class ReviewForm(BaseModel):
    name: str
    className: str = "Общий отзыв"
    text: str


def escape_html(text: str) -> str:
    """Экранирование для Telegram HTML parse_mode"""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


async def send_to_telegram(text: str):
    """Отправка сообщения во все указанные чаты"""
    if not CHAT_IDS or CHAT_IDS == [""]:
        print("[WARN] CHAT_IDS не настроены, сообщение не отправлено")
        return
    async with httpx.AsyncClient(timeout=10) as client:
        for chat_id in CHAT_IDS:
            if not chat_id.strip():
                continue
            try:
                r = await client.post(
                    f"{TELEGRAM_API}/sendMessage",
                    json={
                        "chat_id": chat_id.strip(),
                        "text": text,
                        "parse_mode": "HTML",
                    },
                )
                if r.status_code != 200:
                    print(f"[ERROR] Telegram send to {chat_id}: {r.text}")
            except Exception as e:
                print(f"[ERROR] Telegram send to {chat_id}: {e}")


@app.post("/api/lead")
async def new_lead(form: LeadForm):
    """Новая заявка с сайта"""
    text = (
        f"📥 <b>Новая заявка с сайта Опора</b>\n\n"
        f"👤 <b>Имя:</b> {escape_html(form.name)}\n"
        f"📞 <b>Телефон:</b> {escape_html(form.phone)}\n"
        f"📚 <b>Предмет:</b> {escape_html(form.subject)}\n"
        f"💬 <b>Комментарий:</b> {escape_html(form.comment) if form.comment else 'нет'}"
    )
    await send_to_telegram(text)
    return {"status": "ok"}


@app.post("/api/review")
async def new_review(form: ReviewForm):
    """Новый отзыв с сайта (на модерацию)"""
    text = (
        f"⭐ <b>Новый отзыв на сайте Опора</b>\n\n"
        f"👤 <b>Имя:</b> {escape_html(form.name)}\n"
        f"📚 <b>Курс:</b> {escape_html(form.className)}\n"
        f"💬 <b>Текст:</b> {escape_html(form.text)}\n\n"
        f"⚠️ Требуется модерация в админ-панели"
    )
    await send_to_telegram(text)
    return {"status": "ok"}


@app.get("/api/health")
async def health():
    return {"status": "ok", "chats": len([c for c in CHAT_IDS if c.strip()])}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8010)
