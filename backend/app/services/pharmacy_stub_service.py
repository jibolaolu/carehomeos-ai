from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.models.pharmacy_integration import PharmacyIntegration


class PharmacyStubService:
    """Stub service for pharmacy integrations."""

    @staticmethod
    def get_medications(care_home_id: str, integration_id: str | None = None) -> dict[str, Any]:
        """Get medications from pharmacy integration (stub)."""
        return get_pharmacy_medications_stub(care_home_id, integration_id or "stub-integration")

    @staticmethod
    def sync_medications(care_home_id: str, integration_type: str) -> dict[str, Any]:
        """Sync medications from pharmacy (stub)."""
        integration = PharmacyIntegration(
            care_home_id=care_home_id,
            pharmacy_name="Stub Pharmacy",
            integration_type=integration_type,
        )
        result = sync_pharmacy_stub(integration)
        return {
            "status": result["status"],
            "medications_synced": result["medications_count"],
            "synced_at": result["synced_at"].isoformat() if isinstance(result["synced_at"], datetime) else result["synced_at"],
            "details": result["details"],
        }

    @staticmethod
    def get_prescription_alerts(care_home_id: str) -> list[dict[str, Any]]:
        """Get prescription change alerts (stub)."""
        return get_prescription_change_alerts_stub(care_home_id)

    @staticmethod
    def get_blister_pack_status(care_home_id: str) -> dict[str, Any]:
        """Get blister pack reconciliation status (stub)."""
        return {
            "care_home_id": care_home_id,
            "status": "matched",
            "reconciliation_id": "recon-001",
            "reconciled_at": datetime.now(timezone.utc).isoformat(),
        }


def get_pharmacy_medications_stub(care_home_id: str, integration_id: str) -> dict[str, Any]:
    """Stub: Return mock pharmacy medication data."""
    return {
        "care_home_id": care_home_id,
        "integration_id": integration_id,
        "medications": [
            {
                "id": "pharm-med-001",
                "name": "Paracetamol",
                "generic_name": "Acetaminophen",
                "strength": "500mg",
                "form": "Tablet",
                "quantity_dispensed": 100,
                "dispensed_date": "2026-05-15",
                "expiry_date": "2027-05-15",
                "pharmacy_reference": "RX-2026-001",
                "prescriber": "Dr. Smith",
            },
            {
                "id": "pharm-med-002",
                "name": "Amoxicillin",
                "generic_name": "Amoxicillin",
                "strength": "250mg",
                "form": "Capsule",
                "quantity_dispensed": 21,
                "dispensed_date": "2026-05-18",
                "expiry_date": "2027-05-18",
                "pharmacy_reference": "RX-2026-002",
                "prescriber": "Dr. Jones",
            },
        ],
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "source": "Titan Dispensing System (stub)",
    }


def sync_pharmacy_stub(integration: PharmacyIntegration) -> dict[str, Any]:
    """Stub: Simulate pharmacy sync."""
    return {
        "status": "success",
        "medications_count": 2,
        "synced_at": datetime.now(timezone.utc),
        "details": [
            {"action": "added", "medication": "Paracetamol 500mg"},
            {"action": "updated", "medication": "Amoxicillin 250mg"},
        ],
    }


def reconcile_blister_pack_stub(payload: dict[str, Any]) -> dict[str, Any]:
    """Stub: Simulate blister pack reconciliation."""
    return {
        "reconciliation_id": "recon-001",
        "status": "matched",
        "expected_medications": payload.get("expected", []),
        "actual_medications": payload.get("actual", []),
        "discrepancies": [],
        "reconciled_at": datetime.now(timezone.utc).isoformat(),
        "signed_off_by": payload.get("signed_off_by"),
    }


def get_prescription_change_alerts_stub(care_home_id: str) -> list[dict[str, Any]]:
    """Stub: Return mock prescription change alerts."""
    return [
        {
            "id": "alert-001",
            "type": "dose_changed",
            "medication_name": "Paracetamol",
            "old_dose": "500mg",
            "new_dose": "1000mg",
            "changed_by": "Dr. Smith",
            "changed_at": "2026-05-20T10:00:00Z",
            "resident_id": "res-001",
            "requires_mar_update": True,
        }
    ]
