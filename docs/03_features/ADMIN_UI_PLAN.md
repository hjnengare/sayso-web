# Admin UI Plan

## Scope and Sections
- **Admin shell** at `/admin` with left nav + top bar; sections: Dashboard, Claims, Moderation, Badges, Feature Flags, Audit Log, Data Tools.
- **Auth/guard**: server-side role check (Supabase service role/JWT claim) and client guard; fail closed.

## Business Claims Approval
- Pages: `/admin/claims` (list), `/admin/claims/[id]` (detail).
- List: pending/approved/rejected tabs, search by business/user, sort by submitted date.
- Detail: business info, claimant info, uploaded docs/notes, timeline of status changes.
- Actions: approve/reject with required note; optional "request more info".
- API: `/api/admin/claims` (list/update) using service role; every action writes to audit log.

## Content Moderation (Reviews/Reports)
- Page: `/admin/moderation` queue with filters (reported, spam, pending).
- Detail drawer: review content, reporter info, history.
- Actions: hide/restore, mark spam, ban user (if available); all actions audited.

## Badges & Achievements
- Pages: `/admin/badges` and `/admin/badges/[id]`.
- Functions: enable/disable badge, adjust thresholds, trigger re-eval for a user.
- API: `/api/admin/badges`, `/api/admin/badges/[id]`, `/api/admin/badges/recheck`.

## Feature Flags / Config
- Page: `/admin/flags` for boolean flags, rollout %, targeted cohorts.
- Backing: flags table with name, type, value, rollout rules.

## Audit Log
- Page: `/admin/audit` with filters (actor, action, date, target).
- Table: `audit_log` (id, actor_id, actor_email, action, target_type, target_id, metadata JSON, created_at).

## Data Tools
- Keep `/admin/seed`; add DB test and recent jobs panel.
- Dashboard metrics: counts for businesses, pending claims, reported reviews, badges awarded last 24h.

## UI Components
- Reusable admin table/list with sort/filter.
- Status pills (pending/approved/rejected/reported/hidden).
- Action drawer/modal with confirm + note field.
- Timeline component for claim/review history.

## Security & RLS
- All `/api/admin/*` routes use service role server-side; no client keys.
- Admin role check on every request; deny by default.
- Audit every mutating admin action.

## Implementation Order
1) Admin layout + guard + nav; `audit_log` table.
2) Claims list/detail + approve/reject APIs + audit entries.
3) Moderation queue + hide/restore APIs + audit entries.
4) Flags table + `/admin/flags` UI/APIs.
5) Badges console + re-eval endpoint.
6) Dashboard metrics + extend seed page.
