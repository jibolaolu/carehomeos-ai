# G-Cloud 14 Service Description — CareHomeOS

## Supplier: EagleSolutionz Ltd
## Service Name: CareHomeOS
## Lot: Cloud Software

---

## 1. Service Overview

CareHomeOS is a cloud-native, AI-powered care home management platform designed for UK CQC-registered care homes. It replaces paper-based and legacy digital systems with an integrated platform covering clinical care, compliance, operations, and family communication.

## 2. Service Capabilities

### 2.1 Clinical Care
- AI-assisted care note generation (voice-to-text, multi-language)
- Electronic Medication Administration Records (eMAR)
- Clinical deterioration detection and alerting
- Falls risk assessment and prevention
- Nursing home clinical tools (wound care, NEWS2, fluid balance)

### 2.2 Compliance
- CQC evidence automation (34 Quality Statements)
- One-click inspection pack generation
- AI mock inspection assessment
- Regulation 17 improvement tracking
- 40+ audit templates

### 2.3 Operations
- Staff rostering and shift management
- Training compliance tracking
- Incident reporting and analysis
- Financial management and invoicing
- Group-level reporting and BI

### 2.4 Family Communication
- Mobile family app (iOS/Android)
- AI-generated daily updates
- Direct messaging
- Visit booking
- Photo sharing

## 3. Technical Architecture

- **Cloud Provider**: AWS (EU-West-2, London)
- **Backend**: Python FastAPI, PostgreSQL, Redis
- **Frontend**: Next.js React dashboard
- **Mobile**: React Native/Expo (iOS, Android, Web)
- **AI**: Multi-LLM routing (Claude, GPT-4o, Gemini)
- **Security**: ISO 27001 aligned, Cyber Essentials Plus

## 4. Pricing

| Tier | Monthly Price | Features |
|------|--------------|----------|
| Free | £0 | Up to 5 residents, basic care notes |
| Professional | £199/home | Full feature set, up to 100 residents |
| Enterprise | £399/home | Nursing tools, group reporting, API access |

- Group discount: 20% per additional home
- NHS/Local Authority: Framework pricing available
- Implementation: Included in Professional/Enterprise

## 5. Service Levels

| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| Support response | 4 hours (business hours) |
| Critical incident | 1 hour |
| Data backup | Daily, 30-day retention |
| Recovery time | 4 hours (RTO) |

## 6. Security and Accreditation

- ISO 27001: In progress (target Q4 2026)
- Cyber Essentials Plus: In progress (target Q3 2026)
- DSPT: Annual submission
- NHS Data Processing: DCB0129 clinical safety case
- GDPR: Fully compliant

## 7. Onboarding and Support

- 30/60/90 day structured onboarding programme
- Data migration from PCS, Nourish, paper records
- Role-specific training (care worker, senior, manager)
- Dedicated success manager
- 24/7 technical support (Enterprise)

## 8. API and Integration

- RESTful API with OpenAPI 3.0 specification
- Webhook support for real-time events
- FHIR R4 export for clinical data
- Power BI/Tableau connectors
- Pharmacy integration (Titan, RxWeb)
- NHS GP Connect (roadmap Q2 2027)
