from __future__ import annotations

from enum import Enum


class AuditPlanStatus(str, Enum):
    draft = "draft"
    scheduled = "scheduled"
    active = "active"
    closed = "closed"
    canceled = "canceled"


class AuditScopeType(str, Enum):
    location = "location"
    department = "department"
    custom = "custom"


class AuditSessionStatus(str, Enum):
    draft = "draft"
    in_progress = "in_progress"
    reconciling = "reconciling"
    awaiting_approval = "awaiting_approval"
    approved = "approved"
    applied = "applied"
    closed = "closed"
    canceled = "canceled"


class DiscrepancyType(str, Enum):
    missing = "missing"
    misplaced = "misplaced"
    unexpected = "unexpected"
    duplicate = "duplicate"
    unknown_barcode = "unknown_barcode"


class ResolutionStatus(str, Enum):
    open = "open"
    resolved = "resolved"
    ignored = "ignored"


class AuditActionType(str, Enum):
    move = "move"
    assign_responsible = "assign_responsible"
    clear_responsible = "clear_responsible"


class AuditActionStatus(str, Enum):
    pending = "pending"
    sent = "sent"
    done = "done"
    failed = "failed"


class AuditItemResultStatus(str, Enum):
    missing = "missing"
    found = "found"
    found_in_place = "found_in_place"
