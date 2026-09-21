# Implementation contract — first working release

User approved starting implementation. Reuse current Next 16.3.4 template. Primary owns integration and independently verifies. All delegated implementations use Luna. No application data mocks as real results.

## Ownership

- Primary: package files, lib/db.ts, migrations/002_masters.sql, scripts database tooling/import, app/page.tsx, app/layout.tsx, app/globals.css, data/sidebarData.ts, components/layout/*, dashboard, tests integration.
- Auth agent: lib/auth.ts, lib/password.ts, migrations/001_auth.sql, app/auth/**, app/setup/**, app/users/**, app/api/me/route.ts. Do not edit shared layout/package files.
- Masters agent: app/customers/**, app/products/**, app/price-lists/**, lib/masters/**. Master tables provided below and primary creates migration 002.
- Documents agent: migrations/003_documents.sql, lib/documents/**, app/quotations/**, app/invoices/**, app/billing-notes/**, tests/calculations.test.ts. Own document SQL with safe table references to users/customers/products below.

## Shared conventions

- `lib/db.ts` exports `query<T extends QueryResultRow>(text: string, values?: unknown[]): Promise<T[]>`, `transaction<T>(callback:(client:PoolClient)=>Promise<T>):Promise<T>`, and pool. DB reads use SQL params. It imports server-only. CLI uses own pg Pool.
- `lib/auth.ts` exports `type Role = 'admin'|'manager'|'sales'|'accounting'`, `type SessionUser={id:string;email:string;display_name:string;role:Role}`, `getCurrentUser():Promise<SessionUser|null>`, `requireUser(roles?:Role[]):Promise<SessionUser>`. requireUser redirects anonymous to /auth/login; disallowed roles throw or redirect with safe error. Check every server action AND protected data/page. Admin permitted as admin, not automatically a sales approval by same creator.
- Auth tables users: id uuid PK, email text unique case-insensitive, display_name text, password_hash text, role text enum check, is_active boolean, created_at/updated_at timestamptz. Session storage auth agent responsibility. Use node crypto scrypt, random opaque session tokens hashed in DB, httponly sameSite lax cookie, secure in production, expiration; no credentials hardcoded. SETUP_TOKEN env required for first admin; /setup form asks token/name/email/password, transaction advisory lock first user check; later registration disabled. Setup admin only through token; use generic auth errors and DB-backed attempt limits.
- Pages: call requireUser then wrap contents in `<AppLayout>`. Shared UI classes (primary implements): `page-heading`, `page-kicker`, `page-title`, `page-description`, `panel`, `panel-heading`, `btn-primary`, `btn-secondary`, `btn-danger`, `field`, `field-label`, `input`, `table-wrap`, `data-table`, `badge`, `notice`, `notice-error`, `empty-state`. Tailwind utilities available. Form controls min 44px; visible labels, inline error and pending states. Use useActionState or client state with server action returns errors. Responsive tables scroll inside container. Thai text, monetary values in THB.
- Server actions return safe errors; no raw DB messages/secrets. Use zod. revalidatePath after success. Redirect outside try/catch. IDs validated UUID. Never delete referenced business rows: toggle active or cancel document.
- Current Next docs under node_modules/next/dist/docs are authoritative; read relevant guides before code.
- Dependencies primary installs: pg, @types/pg, zod, decimal.js, server-only, tsx. No other packages unless coordinate.

## Master schema (migration 002)

All PK uuid DEFAULT gen_random_uuid(); all created_at/updated_at timestamptz DEFAULT now().

company_settings: id boolean PK DEFAULT true CHECK(id), legal_name text default 'บริษัทของคุณ', tax_id text default '', address text default '', phone text default '', email text default ''. Singleton. Primary later can expose settings.

customers: id, customer_code text unique not null, legal_name text not null, tax_id text nullable, branch_name text default 'สำนักงานใหญ่', address text default '', contact_name text default '', contact_phone text default '', contact_email text default '', credit_days integer nullable check >=0, billing_schedule text default '', payment_schedule text default '', notes text default '', is_active boolean default true, created_by uuid nullable references users, timestamps. First release single default branch/contact columns; future normalize per design, document snapshot mandatory. Codes supplied manually or generated server safely, never MAX()+1.

products: id, product_code text unique not null, model text default '', vendor_part text default '', name text not null, description text default '', kind text default 'hardware' check hardware/service/subscription, category text default '', unit text default 'ชิ้น', warranty text default '', is_active boolean default true, timestamps.

price_lists: id, code text unique not null, name text not null, version integer default 1 check >0, valid_from date not null, valid_to date nullable check >=valid_from, status text default 'draft' check draft/published/retired, currency text default 'THB' check='THB', created_by uuid nullable references users, timestamps. Each row is one immutable published version with a unique code. Future parent aggregation not implemented in this slice; never edit published prices. New version by clone with distinct code. UI expose draft create/add items/publish/retire, no overlap ambiguity by explicit list selection.

price_list_items: id, price_list_id uuid FK price_lists RESTRICT, product_id uuid FK products RESTRICT, selling_price numeric(20,6) not null CHECK >=0 and <1e12, tax_basis text not null check exclusive/inclusive, vat_rate numeric(7,4) default 7 CHECK 0..100, cost_price numeric(20,6) nullable CHECK >=0 and <1e12, srp_price numeric(20,6) nullable, UNIQUE(price_list_id,product_id), timestamps. Cost must be omitted from sales DTO and forms; visible admin/manager only. Authoring price lists admin/manager only; published effective lists visible authenticated users. Prices numeric strings.

## Documents scope and contract

Document agent owns normalized quotation/invoice/billing SQL and services, exports getDashboardSummary(user) if practical otherwise primary queries available tables. Send schema summary early to primary.

Implement functional quotation create with line editor/customer/product/optional published effective price selection, decimal.js server recalculation, line discounts and document discount allocation, VAT configurable per line, WHT estimate optional if easy; explicit limitations if not. Immutable issued data snapshots. Sales own quotations; managers/admin all; accounting reads approved/accepted invoices. Quote transitions draft→sent→accepted, cancellation; if implementing internal approval require manager/admin not creator. Do not claim approval if absent; mark initial simple workflow explicitly. At least printable quotation (browser Save as PDF), immutable after sent. Currency THB.

Invoice conversion: one accepted quote→one full invoice first release with UNIQUE source quotation, transaction locks, immutable copy of snapshot and lines. No partial invoices for now. Billing note: one or more issued invoices of SAME customer, transaction lock and active allocation uniqueness, snapshot totals, does not mark invoice paid. Cancellation releases allocation atomically. Print routes auth protected. No tax invoice accounting claims. Document number sequences transactional, no MAX+1; repeat issue idempotent. Validate permissions each action and print view. Use user-friendly errors. If scope large finish quote end-to-end before others.

Do not import historical quotation rows as current actionable documents until duplicate/totals issues are resolved. Root imports customer file and queues price source requiring correction; no fabricated products from unresolved legacy mapping.
