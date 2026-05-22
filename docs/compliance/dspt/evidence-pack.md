# Data Security and Protection Toolkit (DSPT) Evidence Pack

## Organisation: EagleSolutionz Ltd (CareHomeOS)

---

## 1. Data Protection

### 1.1 Data Processing Register
| Data Category | Purpose | Legal Basis | Retention |
|--------------|---------|-------------|-----------|
| Resident personal data | Care delivery | Legitimate interest | 8 years after death |
| Staff data | Employment | Contract | 6 years after leaving |
| Family contact data | Communication | Consent | Duration of residency + 2 years |
| Clinical records | Healthcare provision | Legal obligation | 25 years |
| Financial data | Billing | Contract | 7 years |

### 1.2 Data Sharing Agreements
- NHS Digital: GP Connect (pending approval)
- Pharmacy systems: Titan, RxWeb (under negotiation)
- AI providers: Anthropic, OpenAI (DPA signed)

### 1.3 Data Minimisation
- PHI filter removes identifiable data before AI processing
- Only necessary fields collected
- Regular data purging of inactive accounts

---

## 2. Security

### 2.1 Technical Controls
- Encryption at rest: AES-256 (RDS, S3)
- Encryption in transit: TLS 1.3
- API authentication: OAuth 2.0 + API keys
- Database: Row-level security planned

### 2.2 Access Controls
- RBAC with 5 role levels
- MFA for privileged accounts
- Session timeout policies
- Audit logging of all access

### 2.3 Incident Response
- Incident response plan documented
- 72-hour breach notification process
- ICO notification procedure
- Regular tabletop exercises

---

## 3. Assurance

### 3.1 Penetration Testing
- Annual external penetration test
- Quarterly vulnerability scanning
- Bug bounty programme planned

### 3.2 Staff Training
- Annual GDPR training (100% completion)
- Information security awareness
- Phishing simulation exercises

### 3.3 Business Continuity
- Daily automated backups
- RTO: 4 hours
- RPO: 1 hour
- Disaster recovery tested annually

---

## 4. DSPT Standards Met

| Standard | Status | Evidence |
|----------|--------|----------|
| 1. Data processing | ✅ | Processing register |
| 2. Data sharing | ✅ | Sharing agreements |
| 3. Data quality | ✅ | Validation rules |
| 4. Data security | ✅ | Security policy |
| 5. Individual rights | ✅ | Subject access procedure |
| 6. Lawful processing | ✅ | Legal basis documented |
| 7. Data minimisation | ✅ | Data mapping |
| 8. Retention | ✅ | Retention schedule |
| 9. International transfers | ✅ | UK/EU only |
| 10. Risk management | ✅ | Risk register |
