from fastapi import APIRouter
from app.api.v1.endpoints import (
    academic,
    auth,
    balance,
    clients,
    payments,
    salary,
    schedule,
    system,
    teachers,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(clients.router)
api_router.include_router(teachers.router)
api_router.include_router(academic.router)
api_router.include_router(schedule.router)
api_router.include_router(payments.router)
api_router.include_router(balance.router)
api_router.include_router(salary.router)
api_router.include_router(system.router)
