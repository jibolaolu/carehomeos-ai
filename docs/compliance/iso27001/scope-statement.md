# ISMS Scope Statement — CareHomeOS

## 1. Organisation
**EagleSolutionz Ltd** trading as **CareHomeOS**

## 2. Scope Boundaries
The Information Security Management System (ISMS) covers:

- **CareHomeOS Platform**: Cloud-based care home management software
- **Data Types**: Personal data of residents, staff, and family members; clinical records; financial data; CQC compliance data
- **Infrastructure**: AWS cloud infrastructure (EU-West-2), PostgreSQL databases, Redis cache, S3-compatible storage
- **Applications**: FastAPI backend, Next.js dashboard, React Native mobile apps (iOS/Android)
- **Third Parties**: AI/ML service providers (Anthropic, OpenAI, Google), payment processor (Stripe), email service (SendGrid)

## 3. Exclusions
- Physical security of care home premises (responsibility of individual care homes)
- End-user devices not owned by EagleSolutionz
- NHS SPINE/GP Connect infrastructure (external systems)

## 4. Assets
- Software source code and configurations
- Customer databases and backups
- API keys and credentials
- Employee workstations and access credentials
- Documentation and intellectual property

## 5. Applicability Statement
This ISMS applies to all employees, contractors, and third-party service providers who process, store, or transmit information on behalf of CareHomeOS.
