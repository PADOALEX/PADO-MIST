# Security and demo boundaries

PADO MIST is a **portfolio demonstration**; it must not store real student records, production files, grades or sensitive identifiers.

## Implemented protections

- Passwords are hashed with ASP.NET Core `PasswordHasher<AppUser>` (PBKDF2-based), not stored in plaintext.
- Demo users are only created in `Development` with `MIST_SEED_DEMO=true` and caller-provided `MIST_DEMO_PASSWORD` (minimum 12 characters).
- JWT tokens are validated for issuer, audience, signature and expiry; the signing secret is read from `MIST_JWT_KEY` only.
- Database authorization checks assignments on every resource query; cross-student/cross-group/mentor reads are hidden (404).
- Files are not under public `wwwroot`; random storage keys, byte limits, extension/signature checks and authorized download endpoints are used.
- Audit records and report approval decisions are appended when a transition is committed.
- State transitions and optimistic concurrency are checked by the API; input data cannot directly mutate entity statuses.
- Login endpoints have an IP-partitioned limiter; seeded passwords are not exposed to browsers in HTML.

## Not production-ready

- Signature checks and UTF-8 validation **do not replace antivirus/CDR scanning** or a quarantine stage. For any real-world deployment, integrate a malware scanner and consider disabling active-content formats.
- Authentication has no refresh-token workflow, MFA or account recovery; the demo mapping is deliberately fixed. No student or employee identities are verified against Moodle/SSO.
- Current use of `MigrateAsync()` at startup is appropriate for the single-instance demo only, not clustered production upgrades.
- Encryption at rest, backups, retention/deletion policies, GDPR/local privacy compliance and SIEM integration must be designed before adding real records.
- The demo HTTP port binds only loopback. Deploying remotely requires **HTTPS**, reverse-proxy security, stricter throttling and a separate production config.
- Browser-based legacy `/prototype/` uses `localStorage` and Google's **test** reCAPTCHA. This is a teaching sample only. Never rely on it as authentication or anti-bot protection.
- Generated document records are explicitly demonstration artifacts, not legally valid electronic documents; no e-signature provider is integrated.

Please report suspected vulnerabilities privately instead of attaching real user data to public GitHub issues.
