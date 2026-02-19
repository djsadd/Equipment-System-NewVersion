from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models import AuditPlan
from app.schemas import AuditPlanCreate, AuditPlanUpdate


def list_plans(db: Session, *, limit: int = 100, offset: int = 0) -> list[AuditPlan]:
    stmt: Select[tuple[AuditPlan]] = select(AuditPlan).order_by(AuditPlan.id.desc())
    stmt = stmt.limit(max(1, min(limit, 500))).offset(max(0, offset))
    return db.execute(stmt).scalars().all()


def get_plan(plan_id: int, db: Session) -> AuditPlan:
    plan = db.get(AuditPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="plan_not_found")
    return plan


def create_plan(payload: AuditPlanCreate, *, created_by: int, db: Session) -> AuditPlan:
    plan = AuditPlan(
        title=payload.title,
        scope_type=payload.scope_type,
        scope_payload=payload.scope_payload,
        start_date=payload.start_date,
        end_date=payload.end_date,
        created_by=created_by,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


def update_plan(plan_id: int, payload: AuditPlanUpdate, db: Session) -> AuditPlan:
    plan = get_plan(plan_id, db)
    patch = payload.model_dump(exclude_unset=True)
    for key, value in patch.items():
        setattr(plan, key, value)
    db.commit()
    db.refresh(plan)
    return plan

