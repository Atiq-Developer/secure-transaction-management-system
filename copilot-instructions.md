PROJECT: Secure Transaction Management System
A banking-style web application where customers can register, log in, view their account balance, transfer money to other accounts, and see transaction history. Admins can monitor users, transactions and an audit log. This is a portfolio/demo project (no real money), but it must be built with real-world banking practices: security, data integrity, and traceability.

TECH STACK (do not change without asking):
- Next.js 15 (App Router) + TypeScript (strict mode), full-stack in one repo
- Backend: Next.js Route Handlers under /app/api (REST style, JSON)
- Database: PostgreSQL (Neon free tier in production, local Postgres or Neon in dev)
- ORM: Prisma
- Auth: JWT (library: jose) stored in an httpOnly, secure, sameSite=lax cookie; passwords hashed with bcryptjs (cost 12)
- Validation: zod on EVERY API input (server side)
- UI: Tailwind CSS + shadcn/ui + lucide-react icons + Recharts for charts + sonner for toasts + react-hook-form with zod resolver
- Tests: Vitest for the transfer service
- Deployment target: Vercel + Neon

ARCHITECTURE RULES:
- Folder structure: /src/app (routes, pages, api), /src/components (ui, layout, feature components), /src/lib (prisma.ts, auth.ts, session.ts, audit.ts, validators.ts, utils.ts, constants.ts), /src/services (auth.service.ts, account.service.ts, transfer.service.ts, admin.service.ts), /prisma (schema.prisma, seed.ts), /tests
- Keep business logic in /src/services, NOT inside route handlers or components. Route handlers only: authenticate -> validate -> call service -> return JSON.
- Consistent API response shape: { success: boolean, data?: any, error?: { code: string, message: string } } with correct HTTP status codes.
- Use TypeScript types everywhere, no `any`.
- Money is stored as Prisma Decimal (Decimal(14,2)). NEVER use JavaScript floating point for money math. Currency: PKR, formatted with Intl.NumberFormat('en-PK').
- Every protected route handler and page must check authentication AND authorization (role + account ownership). A customer must never be able to read another customer's data.
- Never log passwords, tokens or full request bodies. Login errors must be generic ("Invalid email or password").
- Write clean, readable code with short comments only where the logic is not obvious.

BUSINESS RULES:
- Roles: CUSTOMER, ADMIN. User status: ACTIVE, FROZEN (frozen users cannot log in or transfer).
- On registration: create the user and ONE account with a unique 10-digit account number and an opening demo balance of PKR 50,000 (recorded as a DEPOSIT transaction).
- Transfer rules: amount > 0 and at most 2 decimal places; min PKR 1; max PKR 100,000 per transaction; max PKR 200,000 total per day (day boundary in Asia/Karachi time); cannot transfer to own account; recipient account must exist and its user must be ACTIVE; sender must have sufficient balance.
- A transfer is atomic: debit + credit + transaction record all succeed together or none do (Prisma interactive transaction).
- Concurrency safety: inside the DB transaction, lock both account rows with SELECT ... FOR UPDATE, always in a consistent order (sorted by account id) to avoid deadlocks, then re-check balance after locking.
- Duplicate protection: every transfer request carries a client-generated idempotencyKey (UUID). If the same key is submitted again, return the original result and do NOT move money again. idempotencyKey is unique in the DB.
- Every transaction gets a human-friendly unique reference like TX-20261011-A7K2Q9.
- Audit log: record every important event (REGISTER, LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, ACCOUNT_LOCKED, PASSWORD_CHANGED, TRANSFER_SUCCESS, TRANSFER_FAILED with reason, USER_FROZEN, USER_UNFROZEN) with userId, ip address, user agent, metadata (JSON) and timestamp. Failed-transfer audit entries must be written OUTSIDE the rolled-back DB transaction so they are not lost.
- Brute-force protection: after 5 failed logins, lock the account for 15 minutes (failedLoginCount + lockedUntil on User).

UI / UX RULES (must look like a professional fintech product, not a template):
- Design language: clean, trustworthy, modern. Primary navy (#0F2A4A), accent teal (#14B8A6), background slate-50, cards white with soft shadow and rounded-xl, font Inter. Success = green, danger = red, warning = amber.
- Layout: left sidebar navigation on desktop (collapsible), top bar with user menu; bottom/hamburger navigation on mobile. Fully responsive.
- Every page needs: loading skeletons, empty states with an icon and helpful text, error states, and toast notifications for actions.
- Forms: inline validation messages, disabled submit while loading, show/hide password toggle.
- Tables: sticky header, pagination, status badges (green COMPLETED / red FAILED), amounts colored (green for credit, red for debit with +/- sign).
- Money-moving actions require a confirmation step (review dialog) and show a receipt on success.
- Accessibility: labels on inputs, focus rings, sufficient contrast, keyboard friendly dialogs.
- Include dark mode toggle (next-themes) if time allows; light mode must be perfect first.

DEFINITION OF DONE for every stage: code compiles with no TypeScript errors, `npm run lint` passes, the feature works end to end in the browser, and you tell me exactly what to click/test.
