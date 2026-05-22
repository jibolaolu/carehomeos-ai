# NHS GP Connect Integration Pathway

## CareHomeOS — NHS Digital Integration Roadmap

---

## 1. Overview

GP Connect integration enables CareHomeOS to:
- Access resident GP records (medications, allergies, conditions)
- Push care notes and incidents back to GP systems
- Receive hospital admission/discharge alerts (NEMS)
- Verify NHS numbers against PDS

## 2. Integration Components

### 2.1 PDS (Personal Demographics Service)
**Status**: Planned Q1 2027

- NHS number verification on resident admission
- Demographics validation
- Required: DSP Toolkit, DCB0129

### 2.2 GP Connect Access Record Structured
**Status**: Planned Q1-Q2 2027

- Pull medications from GP record
- Pull allergies and adverse reactions
- Pull active problems/conditions
- Pull immunisations
- Required: GP Connect conformance assessment

### 2.3 GP Connect Send Document
**Status**: Planned Q2 2027

- Push structured care notes to GP
- Push incident reports to GP
- Push medication administration records
- Required: Document sharing agreement

### 2.4 NEMS (National Events Management Service)
**Status**: Planned Q2 2027

- Receive hospital admission alerts
- Receive discharge summaries
- Required: MESH mailbox setup

## 3. Approval Pathway

### Phase 1: Foundation (Q3 2026)
- [ ] Complete DSP Toolkit registration
- [ ] Submit DCB0129 clinical safety case
- [ ] Complete IG Toolkit assessment
- [ ] Register as NHS Digital supplier

### Phase 2: Conformance (Q4 2026)
- [ ] Pass GP Connect conformance assessment
- [ ] Complete technical accreditation
- [ ] Sign data sharing agreement
- [ ] Obtain production credentials

### Phase 3: Go-Live (Q1-Q2 2027)
- [ ] Pilot with 3 GP practices
- [ ] Monitor data quality
- [ ] Resolve integration issues
- [ ] Scale to all customers

## 4. Technical Requirements

### 4.1 Security
- TLS 1.3 for all communications
- JWT tokens with NHS Digital signing
- Role-based access to GP data
- Audit logging of all PDS/GP Connect access

### 4.2 FHIR Mapping
| CareHomeOS Entity | FHIR Resource |
|------------------|---------------|
| Resident | Patient |
| Medication | MedicationRequest |
| Allergy | AllergyIntolerance |
| Care Note | DocumentReference |
| Incident | DocumentReference |
| Vital Signs | Observation |

### 4.3 Error Handling
- Retry logic with exponential backoff
- Dead letter queue for failed messages
- Alert on integration failures
- Manual fallback procedures

## 5. Business Case

### 5.1 Benefits
- Eliminate manual medication transcription errors
- Real-time GP notification of incidents
- Reduced hospital readmissions through better information sharing
- Improved CQC ratings through integrated care evidence

### 5.2 Revenue Impact
- Unlock NHS-funded placement contracts
- Access ICS digital transformation budgets
- NHS England framework eligibility
- Estimated revenue impact: £2-5M annually

## 6. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| NHS approval delays | 6-12 months | Start parallel, use middleware broker |
| GP system variability | Integration complexity | Support EMIS and SystmOne |
| Data quality issues | Clinical risk | Validation rules, manual review |
| API rate limits | Performance | Caching, batch processing |
