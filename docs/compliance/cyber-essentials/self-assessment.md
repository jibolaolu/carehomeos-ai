# Cyber Essentials Self-Assessment — CareHomeOS

## Organisation: EagleSolutionz Ltd (CareHomeOS)

---

## A. Firewalls

| Control | Status | Evidence |
|---------|--------|----------|
| A1. Firewall configured | ✅ | AWS Security Groups restrict inbound traffic |
| A2. Default admin passwords changed | ✅ | No default passwords used |
| A3. Unnecessary ports blocked | ✅ | Only 443, 80, 8105 open |
| A4. Firewall rules reviewed annually | ✅ | Quarterly review scheduled |

---

## B. Secure Configuration

| Control | Status | Evidence |
|---------|--------|----------|
| B1. Remove unnecessary software | ✅ | Minimal container images |
| B2. Default passwords changed | ✅ | All systems use strong passwords |
| B3. Unnecessary user accounts removed | ✅ | Regular account audit |
| B4. Auto-run disabled | ✅ | No auto-run on servers |
| B5. Admin accounts separate | ✅ | Separate admin accounts |

---

## C. User Access Control

| Control | Status | Evidence |
|---------|--------|----------|
| C1. User accounts controlled | ✅ | Auth0 identity provider |
| C2. Admin accounts restricted | ✅ | MFA required for admin |
| C3. Password policy enforced | ✅ | 12 char minimum, complexity |
| C4. Account lockout enabled | ✅ | 5 failed attempts |
| C5. Access reviewed regularly | ✅ | Quarterly access review |

---

## D. Malware Protection

| Control | Status | Evidence |
|---------|--------|----------|
| D1. Anti-malware installed | ✅ | AWS GuardDuty, ECR scanning |
| D2. Malware kept up to date | ✅ | Auto-updates enabled |
| D3. Regular scans scheduled | ✅ | Weekly scans |
| D4. Malware logs reviewed | ✅ | Centralised logging |

---

## E. Patch Management

| Control | Status | Evidence |
|---------|--------|----------|
| E1. Software licensed and supported | ✅ | All software current |
| E2. Patches applied within 14 days | ✅ | Automated patching |
| E3. High-risk patches within 7 days | ✅ | Critical patch SLA |
| E4. Unsupported software removed | ✅ | Regular audit |

---

## Declaration

I confirm that the information provided is accurate to the best of my knowledge.

**Signed:** ___________________  
**Date:** ___________________  
**Name:** ___________________
