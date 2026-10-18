# Workflow contract

This is a faithful server-side translation of the core actions of `legacy/Mist_Prototype/dist/js/core.js`, with authorization and persistence added. The legacy static UI remains in `/prototype/`, isolated from server-backed data.

## Document requests

| Actor | Action | From | To | Conditions |
|---|---|---|---|---|
| Student (owner) | create | — | `requested` | `kind=study` or `transcript`; purpose 3–200; no same-kind pending request; assigned curator |
| Student (owner) | cancel | `requested` | `cancelled` | optimistic revision |
| Curator (assigned) | process | `requested` | `processing` | optimistic revision |
| Curator (assigned) | issue | `processing` | `ready` | student still active; optimistic revision |
| Curator (assigned) | reject | `requested` or `processing` | `rejected` | comment 5–800; optimistic revision |

The queue is ordered by request time. Prototype service cards (`leokart`, `dormitory`, `erasmus`) are **static templates, not API queue submissions**. A curator currently performs simplified dean-office actions; real deployments need separate issuance permissions.

## Dual education case

- Student must have an issued `study` document, be active, explicitly consent, and provide 15–1200 characters of motivation.
- A mentor is assigned server-side by group/company mapping; curator is assigned by group. The client **cannot select arbitrary reviewer IDs**.
- One active/lifetime case per student is enforced by a unique index in the MVP.
- `company_review --(assigned mentor accepts)--> plan_review --(assigned curator approves plan)--> active`.
- `active --(assigned curator confirms final decision AND all three outcomes accepted)--> completed`.
- Completing the case writes a demo `dual` document and an audit event. It does **not** write to a university grade ledger.

## Report approvals

Three outcomes: `db` (16 recommended hours), `import` (24), `quality` (20). Submitted hours are valid at 0.5–160; guideline hours are not automatic grades. Periods must be valid calendar dates, not in the future.

```text
(no report)  --student submits--> submitted (v1)
submitted    --mentor approves--> university_review
submitted    --mentor returns---> mentor_changes
university_review --curator approves--> accepted
university_review --curator returns---> curator_changes
mentor_changes / curator_changes --student resubmits--> submitted (v+1)
```

Return decisions are **historical** and not overwritten. A new version copies new content into a new immutable `ReportRevision` row. Old decisions remain, but the curator must check a mentor approval **for the current version**. Concurrent/stale clients receive HTTP 409.

## Authorization matrix

| API resource | Student | Mentor | Curator |
|---|---|---|---|
| Own document | read/create/cancel | read only when explicitly included in a consented case | read/manage only when assigned |
| Dual case | read/create own | read/accept only when assigned | read/approve/complete only when assigned |
| Report | read/submit own | read/review only when assigned | read/review only when assigned |
| Report revisions and files | own | assigned case | assigned case |
| Audit history | owned resource only | assigned case/resource only | assigned case/resource only |

Invalid role: HTTP 403. Resource outside assignment: HTTP 404. Invalid transition or stale version: HTTP 409. Authentication required: HTTP 401.
