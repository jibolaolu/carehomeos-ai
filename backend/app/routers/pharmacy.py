from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.pharmacy_integration import PharmacyIntegration
from app.services.pharmacy_stub_service import PharmacyStubService

router = APIRouter(prefix="/pharmacy", tags=["pharmacy"])


class PharmacyIntegrationCreate(BaseModel):
    pharmacy_name: str
    integration_type: str = Field(..., pattern="^(titan|rxweb|custom)$")
    api_endpoint: str | None = None
    auto_sync_enabled: bool = False
    sync_frequency_minutes: int = 60
    prescription_alerts_enabled: bool = True
    blister_pack_reconciliation_enabled: bool = False
    configuration: dict[str, Any] | None = None


class PharmacyIntegrationUpdate(BaseModel):
    pharmacy_name: str | None = None
    api_endpoint: str | None = None
    auto_sync_enabled: bool | None = None
    sync_frequency_minutes: int | None = None
    prescription_alerts_enabled: bool | None = None
    blister_pack_reconciliation_enabled: bool | None = None
    configuration: dict[str, Any] | None = None
    status: str | None = None


class PrescriptionAlertConfig(BaseModel):
    alert_types: list[str] = Field(default_factory=list)
    thresholds: dict[str, Any] | None = None


class BlisterPackReconcileRequest(BaseModel):
    resident_id: str | None = None
    medications_checked: list[dict[str, Any]] = Field(default_factory=list)
    notes: str | None = None


@router.get("/integrations")
async def list_pharmacy_integrations(
    care_home_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    result = await db.execute(
        select(PharmacyIntegration).where(PharmacyIntegration.care_home_id == care_home_id)
    )
    integrations = result.scalars().all()
    return [_serialize(i) for i in integrations]


@router.post("/integrations", status_code=status.HTTP_201_CREATED)
async def create_pharmacy_integration(
    care_home_id: str,
    payload: PharmacyIntegrationCreate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    integration = PharmacyIntegration(
        care_home_id=care_home_id,
        pharmacy_name=payload.pharmacy_name,
        integration_type=payload.integration_type,
        status="pending",
        api_endpoint=payload.api_endpoint,
        auto_sync_enabled=payload.auto_sync_enabled,
        sync_frequency_minutes=str(payload.sync_frequency_minutes),
        prescription_alerts_enabled=payload.prescription_alerts_enabled,
        blister_pack_reconciliation_enabled=payload.blister_pack_reconciliation_enabled,
        configuration=str(payload.configuration) if payload.configuration else None,
    )
    db.add(integration)
    await db.commit()
    await db.refresh(integration)
    return _serialize(integration)


@router.get("/medications")
async def get_pharmacy_medications(
    care_home_id: str,
    integration_id: str | None = None,
) -> dict[str, Any]:
    """Get medications from pharmacy integration (stub)."""
    medications = PharmacyStubService.get_medications(care_home_id)
    return {
        "care_home_id": care_home_id,
        "integration_id": integration_id,
        "medications": medications,
        "source": "stub",
    }


@router.post("/sync")
async def trigger_pharmacy_sync(
    care_home_id: str,
    integration_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(
        select(PharmacyIntegration).where(
            PharmacyIntegration.id == integration_id,
            PharmacyIntegration.care_home_id == care_home_id,
        )
    )
    integration = result.scalar_one_or_none()
    if integration is None:
        raise HTTPException(status_code=404, detail="Integration not found")

    sync_result = PharmacyStubService.sync_medications(
        care_home_id=care_home_id,
        integration_type=integration.integration_type,
    )
    integration.last_sync_at = datetime.now(timezone.utc)
    integration.last_sync_status = sync_result["status"]
    integration.medications_synced_count = str(sync_result["medications_synced"])
    await db.commit()
    return sync_result


@router.post("/prescription-alerts")
async def configure_prescription_alerts(
    care_home_id: str,
    integration_id: str,
    payload: PrescriptionAlertConfig,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(
        select(PharmacyIntegration).where(
            PharmacyIntegration.id == integration_id,
            PharmacyIntegration.care_home_id == care_home_id,
        )
    )
    integration = result.scalar_one_or_none()
    if integration is None:
        raise HTTPException(status_code=404, detail="Integration not found")

    integration.prescription_alerts_enabled = True
    await db.commit()

    alerts = PharmacyStubService.get_prescription_alerts(care_home_id)
    return {
        "care_home_id": care_home_id,
        "integration_id": integration_id,
        "alert_types": payload.alert_types,
        "thresholds": payload.thresholds,
        "active_alerts": alerts,
    }


@router.post("/blister-pack/reconcile")
async def reconcile_blister_pack(
    care_home_id: str,
    payload: BlisterPackReconcileRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    status_result = PharmacyStubService.get_blister_pack_status(care_home_id)
    return {
        "care_home_id": care_home_id,
        "reconciliation_status": "completed",
        "resident_id": payload.resident_id,
        "medications_checked": payload.medications_checked,
        "discrepancies": status_result.get("discrepancies", []),
        "notes": payload.notes,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }


def _serialize(i: PharmacyIntegration) -> dict[str, Any]:
    return {
        "id": i.id,
        "care_home_id": i.care_home_id,
        "pharmacy_name": i.pharmacy_name,
        "integration_type": i.integration_type,
        "status": i.status,
        "api_endpoint": i.api_endpoint,
        "last_sync_at": i.last_sync_at.isoformat() if i.last_sync_at else None,
        "last_sync_status": i.last_sync_status,
        "last_sync_error": i.last_sync_error,
        "auto_sync_enabled": i.auto_sync_enabled,
        "sync_frequency_minutes": int(i.sync_frequency_minutes) if i.sync_frequency_minutes else 60,
        "medications_synced_count": int(i.medications_synced_count) if i.medications_synced_count else 0,
        "prescription_alerts_enabled": i.prescription_alerts_enabled,
        "blister_pack_reconciliation_enabled": i.blister_pack_reconciliation_enabled,
        "configuration": i.configuration,
        "created_at": i.created_at.isoformat() if i.created_at else None,
        "updated_at": i.updated_at.isoformat() if i.updated_at else None,
    }
