import enum


class UserStatus(str, enum.Enum):
    active = "active"
    blocked = "blocked"
    archived = "archived"


class ClientStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    completed = "completed"
    archived = "archived"


class ChildStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    completed = "completed"
    archived = "archived"


class TeacherStatus(str, enum.Enum):
    active = "active"
    vacation = "vacation"
    inactive = "inactive"
    archived = "archived"


class LessonStatus(str, enum.Enum):
    scheduled = "scheduled"
    completed = "completed"
    absent = "absent"
    cancelled = "cancelled"
    moved = "moved"


class AttendanceStatus(str, enum.Enum):
    unknown = "unknown"
    present = "present"
    absent = "absent"
    cancelled_by_client = "cancelled_by_client"
    cancelled_by_center = "cancelled_by_center"


class LessonPaymentStatus(str, enum.Enum):
    unpaid = "unpaid"
    paid = "paid"
    partial = "partial"
    covered_by_package = "covered_by_package"


class LessonFormat(str, enum.Enum):
    individual = "individual"
    group = "group"


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    card = "card"
    bank_transfer = "bank_transfer"
    online = "online"
    other = "other"


class BalanceTransactionType(str, enum.Enum):
    purchase = "purchase"
    consumption = "consumption"
    refund = "refund"
    correction_plus = "correction_plus"
    correction_minus = "correction_minus"
    transfer_in = "transfer_in"
    transfer_out = "transfer_out"
    expire = "expire"


class SalaryPaymentStatus(str, enum.Enum):
    active = "active"
    reversed = "reversed"


class MessageStatus(str, enum.Enum):
    created = "created"
    queued = "queued"
    sent = "sent"
    delivered = "delivered"
    failed = "failed"
    cancelled = "cancelled"


class MailingStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    processing = "processing"
    completed = "completed"
    cancelled = "cancelled"
    failed = "failed"
