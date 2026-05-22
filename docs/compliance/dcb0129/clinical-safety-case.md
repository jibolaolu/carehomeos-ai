# Clinical Safety Case — CareHomeOS

## Document Reference: DCB0129-CSC-001
## Version: 1.0
## Date: 2026-05-22

---

## 1. Executive Summary

CareHomeOS is an AI-assisted care home management platform. This clinical safety case demonstrates that clinical risks have been identified, assessed, and managed to acceptable levels.

## 2. System Description

### 2.1 Purpose
- AI-assisted care note generation and structuring
- Clinical deterioration detection and alerting
- Falls risk assessment
- Medication safety checks
- CQC compliance support

### 2.2 Users
- Care workers (frontline data entry)
- Senior carers (clinical oversight)
- Care home managers (operational oversight)
- Family members (read-only access)

### 2.3 Clinical Environment
- Residential care homes
- Nursing homes
- 24/7 operational environment
- High staff turnover (23-25% annually)

## 3. Hazard Identification

| Hazard ID | Hazard Description | Severity | Likelihood | Risk Level |
|-----------|-------------------|----------|------------|------------|
| H001 | AI-generated care note contains incorrect clinical information | High | Low | Medium |
| H002 | Deterioration alert missed or false negative | Critical | Low | Medium |
| H003 | Falls risk score underestimates actual risk | High | Medium | High |
| H004 | Drug interaction check misses contraindication | Critical | Low | Medium |
| H005 | CQC evidence incorrectly tagged | Medium | Low | Low |
| H006 | Offline data lost during sync failure | Medium | Low | Low |
| H007 | Wrong resident selected for care note | High | Medium | High |

## 4. Risk Controls

### 4.1 H001 - AI Care Note Accuracy
- **Control**: Quality gate checks all AI output
- **Control**: Human approval required before finalising
- **Control**: Confidence scoring on AI predictions
- **Control**: Fallback to template-based notes if AI uncertain
- **Residual Risk**: Low

### 4.2 H002 - Deterioration Detection
- **Control**: Multi-parameter analysis (not single signal)
- **Control**: Graded alerts (watch/medium/high/critical)
- **Control**: Mandatory escalation pathway
- **Control**: Daily scheduled scan + real-time triggers
- **Residual Risk**: Low

### 4.3 H003 - Falls Risk
- **Control**: Daily automated scoring
- **Control**: Trend analysis over 7 days
- **Control**: Override capability for clinical judgment
- **Control**: Alert on score increase >1 level
- **Residual Risk**: Medium

### 4.4 H004 - Drug Interactions
- **Control**: AI cross-reference with BNF
- **Control**: Mandatory second checker for controlled drugs
- **Control**: Alert on high-risk combinations
- **Control**: Link to GP prescribing record
- **Residual Risk**: Low

### 4.5 H007 - Wrong Resident Selection
- **Control**: Photo verification on resident selection
- **Control**: Barcode/RFID scanning option
- **Control**: Confirmation prompt before saving
- **Control**: Audit trail of all actions
- **Residual Risk**: Low

## 5. Safety Justification

The CareHomeOS platform implements multiple layers of safety controls:

1. **Deterministic fallbacks**: All AI features have rule-based fallbacks
2. **Human-in-the-loop**: Critical decisions require human approval
3. **Audit trails**: Complete logging of all clinical actions
4. **Regular review**: Clinical safety case reviewed annually
5. **Incident reporting**: Structured incident capture with AI analysis

## 6. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Clinical Safety Officer | TBC | | |
| Medical Advisor | TBC | | |
| CEO | TBC | | |
