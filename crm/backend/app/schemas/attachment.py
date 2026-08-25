import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AttachmentRead(BaseModel):
    id: uuid.UUID
    owner_type: str
    owner_id: uuid.UUID
    filename: str
    mime_type: str
    size_bytes: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
