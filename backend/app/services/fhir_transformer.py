from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Any

from fhir.resources.bundle import Bundle, BundleEntry
from fhir.resources.medicationrequest import MedicationRequest
from fhir.resources.observation import Observation
from fhir.resources.patient import Patient
from fhir.resources.reference import Reference

from app.models.medication import Medication
from app.models.resident import Resident
from app.models.vital_signs import VitalSigns


def _generate_id() -> str:
    return str(uuid.uuid4())


def _to_fhir_datetime(dt: datetime | date | str | None) -> str | None:
    if isinstance(dt, datetime):
        return dt.isoformat()
    if isinstance(dt, date):
        return dt.isoformat()
    return dt


def resident_to_fhir_patient(resident: Resident) -> dict[str, Any]:
    """Transform a Resident model into a FHIR R4 Patient resource."""
    patient = Patient(
        id=_generate_id(),
        identifier=[
            {
                "system": "https://fhir.nhs.uk/Id/nhs-number",
                "value": resident.nhs_number,
            }
        ]
        if resident.nhs_number
        else None,
        name=[
            {
                "use": "official",
                "family": resident.last_name,
                "given": [resident.first_name],
                "prefix": [resident.title] if resident.title else None,
            }
        ],
        gender=resident.gender.lower() if resident.gender else "unknown",
        birthDate=_to_fhir_datetime(resident.date_of_birth),
        address=[
            {
                "text": f"Room {resident.room}",
            }
        ]
        if resident.room
        else None,
        generalPractitioner=[
            Reference(
                display=resident.gp_practice_name,
            )
        ]
        if resident.gp_practice_name
        else None,
    )
    return patient.dict(exclude_none=True)


def vital_signs_to_fhir_observation(vs: VitalSigns) -> dict[str, Any]:
    """Transform VitalSigns into a FHIR R4 Observation resource."""
    components = []

    if vs.systolic_bp is not None and vs.diastolic_bp is not None:
        components.append(
            {
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "8480-6",
                            "display": "Systolic blood pressure",
                        }
                    ]
                },
                "valueQuantity": {
                    "value": vs.systolic_bp,
                    "unit": "mmHg",
                    "system": "http://unitsofmeasure.org",
                    "code": "mm[Hg]",
                },
            }
        )
        components.append(
            {
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "8462-4",
                            "display": "Diastolic blood pressure",
                        }
                    ]
                },
                "valueQuantity": {
                    "value": vs.diastolic_bp,
                    "unit": "mmHg",
                    "system": "http://unitsofmeasure.org",
                    "code": "mm[Hg]",
                },
            }
        )

    if vs.pulse_rate is not None:
        components.append(
            {
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "8867-4",
                            "display": "Heart rate",
                        }
                    ]
                },
                "valueQuantity": {
                    "value": vs.pulse_rate,
                    "unit": "beats/min",
                    "system": "http://unitsofmeasure.org",
                    "code": "/min",
                },
            }
        )

    if vs.respiration_rate is not None:
        components.append(
            {
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "9279-1",
                            "display": "Respiratory rate",
                        }
                    ]
                },
                "valueQuantity": {
                    "value": vs.respiration_rate,
                    "unit": "breaths/min",
                    "system": "http://unitsofmeasure.org",
                    "code": "/min",
                },
            }
        )

    if vs.spo2_percent is not None:
        components.append(
            {
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "2708-6",
                            "display": "Oxygen saturation in Arterial blood",
                        }
                    ]
                },
                "valueQuantity": {
                    "value": vs.spo2_percent,
                    "unit": "%",
                    "system": "http://unitsofmeasure.org",
                    "code": "%",
                },
            }
        )

    if vs.temperature_celsius is not None:
        try:
            temp_val = float(vs.temperature_celsius)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            temp_val = None
        if temp_val is not None:
            components.append(
                {
                    "code": {
                        "coding": [
                            {
                                "system": "http://loinc.org",
                                "code": "8310-5",
                                "display": "Body temperature",
                            }
                        ]
                    },
                    "valueQuantity": {
                        "value": temp_val,
                        "unit": "C",
                        "system": "http://unitsofmeasure.org",
                        "code": "Cel",
                    },
                }
            )

    observation = Observation(
        id=_generate_id(),
        status="final",
        category=[
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "vital-signs",
                        "display": "Vital Signs",
                    }
                ]
            }
        ],
        code={
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": "85354-9",
                    "display": "Vital signs panel",
                }
            ]
        },
        subject=Reference(display=f"Resident/{vs.resident_id}"),
        effectiveDateTime=_to_fhir_datetime(vs.recorded_at),
        component=components if components else None,
        note=[{"text": vs.notes}] if vs.notes else None,
    )
    return observation.dict(exclude_none=True)


def medication_to_fhir_medication_request(med: Medication) -> dict[str, Any]:
    """Transform Medication into a FHIR R4 MedicationRequest resource."""
    mr = MedicationRequest(
        id=_generate_id(),
        status="active" if med.status == "active" else "stopped",
        intent="order",
        medicationCodeableConcept={
            "text": med.name,
        },
        subject=Reference(display=f"Resident/{med.resident_id}"),
        authoredOn=_to_fhir_datetime(med.prescribed_date),
        requester={
            "display": med.prescribed_by,
        },
        dosageInstruction=[
            {
                "text": med.instructions or med.frequency,
                "route": {
                    "text": med.route,
                },
                "doseAndRate": [
                    {
                        "doseQuantity": {
                            "value": med.prescribed_dose,
                        }
                    }
                ]
                if med.prescribed_dose
                else None,
            }
        ],
        note=[{"text": med.side_effects_to_monitor}] if med.side_effects_to_monitor else None,
    )
    return mr.dict(exclude_none=True)


def create_fhir_bundle(
    resources: list[dict[str, Any]],
    bundle_type: str = "collection",
) -> dict[str, Any]:
    """Create a FHIR Bundle from a list of resource dicts."""
    entries = []
    for resource in resources:
        entry = BundleEntry(
            resource=resource,
            fullUrl=f"urn:uuid:{resource.get('id', _generate_id())}",
        )
        entries.append(entry.dict(exclude_none=True))

    bundle = Bundle(
        id=_generate_id(),
        type=bundle_type,
        timestamp=datetime.now(timezone.utc).isoformat(),
        entry=entries,
    )
    return bundle.dict(exclude_none=True)
