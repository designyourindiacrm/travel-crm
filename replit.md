# Travel CRM

A production-grade Travel CRM in a pnpm monorepo. Manages Leads, Lead Activities, Bookings (with travel package fields), Payments, Users, Dashboard analytics, and Automation.

## Stack

- **Backend** (`artifacts/api-server`): Node + Express 5 + TypeScript, Drizzle ORM with PostgreSQL, JWT auth, bcryptjs, pino logging.
- **Frontend** (`artifacts/crm`): React + Vite + TypeScript + Tailwind + shadcn/ui, wouter routing, TanStack Query (via generated hooks), Recharts, Framer Motion.
- **Contract**: OpenAPI spec at `lib/api-spec/openapi.yaml`. Zod schemas (`@workspace/api-zod`) and React Query hooks (`@workspace/api-client-react`) are generated via `pnpm --filter @workspace/api-spec run codegen`.
- **DB schema**: `lib/db/src/schema/{users,leads,leadActivities,bookings,payments}.ts`. Push with `pnpm --filter @workspace/db run push`.

## Auth

- JWT in localStorage as `crm_token`. Custom-fetch attaches `Authorization: Bearer ...` and clears the token + redirects to `/login` on 401.
- `SESSION_SECRET` env var is the JWT secret.
- Roles: `admin` (full access) and `agent` (only their own assigned leads/bookings/payments).

## Domain values

- Lead.status: New | Contacted | Interested | Quotation | Follow-up | Converted | Lost | Cold
- Lead.source: Instagram | Facebook | Website | Manual | Referral
- Booking.tripType: Domestic | International
- Booking.travelMode: Self | Volvo | Train | Flight
- Booking.packageServiceType: Hotel Only | Hotel + Cab | Complete Package
- Booking.hotelType: 3* | 4* | 5*
- Booking.mealPlan: CP | MAP | AP
- Payment.method: Cash | UPI | Bank Transfer | Card | Cheque
- Payment.type: Advance | Partial | Full
- Activity.type: call | note | whatsapp | email | status_change

## Automation

- `POST /api/automation/run` marks leads as Cold if `updatedAt` is older than 3 days and the status is not Converted/Lost/Cold; reports today's follow-ups, overdue follow-ups, and pending payments.
- `GET /api/automation/pending-payments` returns bookings with outstanding balance.

## Seeding

`cd artifacts/api-server && node seed.mjs` (only runs if users table is empty). Default logins:

- admin@designyourindia.com / admin123 (admin)
- priya@designyourindia.com / agent123 (agent)
- rohan@designyourindia.com / agent123 (agent)

## Theme

Branded as **Design Your India** (theme cloned from designyourindia.com).
- Primary: vibrant blue `hsl(224 84% 63%)` (≈#4F7FF0)
- Secondary: deep navy `hsl(222 47% 11%)` (≈#0F172A)
- Background: white / soft blue-tinted `hsl(220 50% 97%)`
- Font: Nunito Sans (Google Fonts)
- Brand mark: `/dyi-logo.png` (downloaded from designyourindia.com), favicon at `/favicon.ico`
