import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models.enums import UserStatus


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None
    type: Optional[str] = None


class LoginRequest(BaseModel):
    phone: str = Field(..., example="+79180000001")
    password: str = Field(..., example="Manager2026!")


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class PermissionRead(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RoleRead(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: Optional[str] = None
    is_system: bool
    permissions: List[PermissionRead] = []

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=200)
    phone: str = Field(..., min_length=10, max_length=20)
    email: Optional[EmailStr] = None
    status: UserStatus = UserStatus.active


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    role_codes: List[str] = Field(default=["administrator"])


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    status: Optional[UserStatus] = None
    password: Optional[str] = None
    role_codes: Optional[List[str]] = None


class UserRead(UserBase):
    id: uuid.UUID
    last_login_at: Optional[datetime] = None
    created_at: datetime
    roles: List[RoleRead] = []
    teacher_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(from_attributes=True)
