import uuid
from typing import Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.system import AuditLog


class AuditService:
    @staticmethod
    async def log_action(
        db: AsyncSession,
        action: str,
        entity_type: str,
        entity_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        metadata: Optional[dict] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        log_entry = AuditLog(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            old_values=old_values,
            new_values=new_values,
            metadata_=metadata,
            ip_address=ip_address,
        )
        db.add(log_entry)
        return log_entry
