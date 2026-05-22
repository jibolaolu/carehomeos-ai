# Access Control Policy — CareHomeOS

## 1. Purpose
Define access control requirements to ensure authorised access to CareHomeOS information assets.

## 2. Scope
All users, systems, and data within the CareHomeOS ISMS scope.

## 3. Policy Statements

### 3.1 User Registration
- All users must be formally registered before access is granted
- Unique user IDs must be assigned (no shared accounts)
- User access rights reviewed quarterly

### 3.2 Privilege Management
- Role-Based Access Control (RBAC) implemented:
  - `super_admin`: Platform-wide access
  - `manager`: Home-level access
  - `senior`: Clinical oversight
  - `carer`: Resident care notes, MAR
  - `family`: Read-only access to specific resident
- Principle of least privilege enforced
- Privileged access requires MFA

### 3.3 Password Policy
- Minimum 12 characters
- Complexity: uppercase, lowercase, number, special character
- Changed every 90 days
- No reuse of last 5 passwords
- Account locked after 5 failed attempts

### 3.4 Multi-Factor Authentication
- Required for: super_admin, manager, API access
- Supported methods: TOTP, SMS, hardware key
- Enforced via Auth0

### 3.5 Session Management
- Auto-logout after 15 minutes inactivity (dashboard)
- Auto-logout after 5 minutes inactivity (mobile carer)
- JWT tokens expire after 24 hours
- Refresh tokens expire after 7 days

### 3.6 API Access Control
- API keys with scoped permissions
- Rate limiting: 1000 requests/hour per key
- IP whitelisting available
- Key rotation every 90 days recommended

## 4. Compliance
This policy aligns with ISO 27001:2022 controls A.5.15, A.5.18, A.8.2, A.8.5.
