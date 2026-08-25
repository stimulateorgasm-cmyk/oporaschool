import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.rbac import get_current_user, require_roles
from app.models.attachment import Attachment
from app.models.auth import User
from app.schemas.attachment import AttachmentRead

router = APIRouter(prefix="/attachments", tags=["Вложения"])

# Разрешённые сущности-владельцы вложения
ALLOWED_OWNER_TYPES = {"parent", "child", "teacher", "lesson"}

# Расширение файла по MIME-типу (для безопасного имени на диске)
MIME_EXT = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}


def _full_path(storage_path: str) -> str:
    return os.path.join(settings.UPLOAD_DIR, storage_path)


@router.post("", response_model=AttachmentRead, summary="Загрузить вложение (PDF/JPEG/PNG/WORD)")
async def upload_attachment(
    file: UploadFile = File(...),
    owner_type: str = Form(..., description="parent | child | teacher | lesson"),
    owner_id: uuid.UUID = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["administrator", "manager"])),
):
    if owner_type not in ALLOWED_OWNER_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимый тип владельца. Допустимые: {', '.join(sorted(ALLOWED_OWNER_TYPES))}",
        )
    if file.content_type not in settings.ALLOWED_ATTACHMENT_MIME:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недопустимый тип файла. Разрешены: PDF, JPEG, PNG, WORD (doc/docx)",
        )

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Файл слишком большой. Максимум {settings.MAX_UPLOAD_SIZE_MB} МБ",
        )
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Файл пустой",
        )

    # id задаём явно, чтобы имя файла на диске совпадало с id записи
    attachment = Attachment(
        id=uuid.uuid4(),
        owner_type=owner_type,
        owner_id=owner_id,
        filename=file.filename or "file",
        mime_type=file.content_type,
        size_bytes=len(content),
        created_by=current_user.id,
    )
    ext = MIME_EXT.get(file.content_type, "")
    attachment.storage_path = f"{attachment.id}{ext}"

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(_full_path(attachment.storage_path), "wb") as f:
        f.write(content)

    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)
    return attachment


@router.get("", response_model=List[AttachmentRead], summary="Список вложений владельца")
async def list_attachments(
    owner_type: str = Query(...),
    owner_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Attachment)
        .where(
            Attachment.owner_type == owner_type,
            Attachment.owner_id == owner_id,
            Attachment.deleted_at.is_(None),
        )
        .order_by(Attachment.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{attachment_id}/download", summary="Скачать вложение")
async def download_attachment(
    attachment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    att = await db.get(Attachment, attachment_id)
    if not att or att.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Вложение не найдено")

    full_path = _full_path(att.storage_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Файл не найден на диске")

    return FileResponse(full_path, media_type=att.mime_type, filename=att.filename)


@router.delete("/{attachment_id}", summary="Удалить вложение (Руководитель/Администратор)")
async def delete_attachment(
    attachment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["administrator", "manager"])),
):
    att = await db.get(Attachment, attachment_id)
    if not att or att.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Вложение не найдено")

    att.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "success", "message": "Вложение удалено"}
