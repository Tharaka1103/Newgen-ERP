# 📊 Newgen Multi-Branch Finance Management System (FMS)

A production-ready, secure, role-based financial management web application built with **Next.js 16 (App Router)**, **Auth.js v5 (NextAuth)**, **shadcn/ui**, **Tailwind CSS (Theme Variables Only)**, and **MongoDB (Mongoose)**.

This system digitizes manual multi-branch ledger accounting (columns: Date, Branch, Payment Method, Bill No, Reason, Amount, Approval Status, Approved Amount, Running Balance) with an approval verification workflow and executive analytics.

---

## 🚀 Key Highlights & Architectural Features

- **Strict Role-Based Access Control (RBAC)** across 3 tiers:
  - 🛡️ **Administrator (`ADMIN`)**: Full organizational control, branch and category CRUD, user & role management, branch reassignment, audit logs, and executive analytics.
  - 🔍 **Finance Verifier (`VERIFIER`)**: Audits financial records across all branches, authorizes or rejects entries with mandatory audit remarks, and can adjust approved amounts.
  - 📝 **Finance Officer (`STAFF`)**: Bound strictly to a single assigned branch. Creates petty cash and fee collection records, and can edit/delete their own entries **only while in `PENDING` status**.
- **Three-Layer Security Enforcement**:
  1. **Next.js Middleware (`middleware.ts`)**: Edge-level route protection and role-based redirects.
  2. **Server Actions Re-Validation**: Cryptographic token re-checks, least-privilege checks, and record lock safeguards (`isLocked` / `status === "PENDING"`).
  3. **UI-Level Conditional Guarding**: Disabled action buttons with tooltips for locked transactions.
- **Chronological Running Balance Algorithm**:
  - Automatically recalculates cumulative balances per shop in chronological order upon create, edit, delete, or verification review (`lib/balance.ts`).
- **Comprehensive Audit Trail**:
  - Automatically logs every sensitive operation (`APPROVE_RECORD`, `REJECT_RECORD`, `ROLE_CHANGE`, `SHOP_REASSIGN`, `DELETE_RECORD`, etc.) with actor, timestamp, and metadata.
- **100% Theme CSS Variables**:
  - Built strictly using Tailwind CSS variables (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-primary`, `bg-chart-1..5`) without any hardcoded hex or RGB values.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, API Routes) |
| UI Library | shadcn/ui (Base UI primitives) |
| Styling | Tailwind CSS v4 using theme CSS variables only |
| Authentication | Auth.js v5 (NextAuth beta) with Credentials Provider & JWT |
| Database | MongoDB with Mongoose ODM |
| Form Validation | react-hook-form + Zod schemas (client & server) |
| Charts | shadcn Chart (Recharts) with `var(--color-chart-1..5)` |
| Security | bcryptjs, NoSQL injection sanitization (`lib/sanitize.ts`), CSP headers |
| Notifications | shadcn Toast manager (`components/ui/toast.tsx`) |
| Data Tables | TanStack Table v8 with pagination, sorting, and search |

---

## 📋 Default Seed Credentials

Run the database seed script to populate test accounts, Excel branches, and sample categories:

```bash
npm run seed
```

| Role | Email | Password | Assigned Branch |
|---|---|---|---|
| **Administrator** | `admin@newgen.lk` | `Admin@12345` | Global (All Branches) |
| **Finance Verifier** | `verifier@newgen.lk` | `Verifier@12345` | Global (Review Queue) |
| **Finance Officer** | `staff.danuma@newgen.lk` | `Staff@12345` | Danuma Branch (`D`) |
| **Finance Officer** | `staff.matale@newgen.lk` | `Staff@12345` | Newgenclz Matale (`MT`) |

*(On the `/login` page, convenient single-click test buttons are provided to instantly populate these credentials).*

---

## 💻 Getting Started Locally

### 1. Environment Setup

Create or verify `.env.local`:

```env
# MongoDB Connection (Local or Atlas)
MONGODB_URI=mongodb://127.0.0.1:27017/newgen_fms

# Auth.js / NextAuth Configuration
NEXTAUTH_SECRET=newgen_super_secret_jwt_key_at_least_32_characters_long_12345
AUTH_SECRET=newgen_super_secret_jwt_key_at_least_32_characters_long_12345
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Seed Initial Data

```bash
npm run seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Project Structure

```
├── actions/             # Secure Server Actions with RBAC & Zod re-validation
│   ├── auth.ts          # Sign-in, sign-out, profile updates, password changes
│   ├── users.ts         # User CRUD, role management, branch reassignment
│   ├── shops.ts         # Branch CRUD, stats, and deactivation safeguards
│   ├── categories.ts    # Category CRUD with theme color tokens
│   ├── finances.ts      # Ledger entries, auto-bill generator, approval actions
│   └── reports.ts       # Aggregations for KPIs, charts, and CSV exports
├── app/
│   ├── (auth)/login/    # Zod-validated authentication page with test shortcuts
│   ├── dashboard/       # Protected dashboard shell with Breadcrumbs & Sidebar
│   │   ├── admin/       # Executive KPIs, Reports, Users, Categories, Shops
│   │   ├── staff/       # Officer branch ledger & petty cash entry forms
│   │   └── verifier/    # Cross-branch audit queue & amount adjustment workbench
│   ├── api/auth/        # NextAuth v5 Route handler
│   └── layout.tsx       # Root layout with Toast and Tooltip providers
├── components/
│   ├── shared/          # Data tables, sidebars, headers, status badges
│   ├── admin/           # Admin user, shop, and category managers
│   ├── staff/           # Staff ledger entry modal & table
│   ├── verifier/        # Verifier inspection modal & decision form
│   └── ui/              # shadcn UI components
├── lib/
│   ├── mongodb.ts       # Global cached Mongoose connection for serverless
│   ├── rbac.ts          # Permission matrix and authorization helpers
│   ├── balance.ts       # Chronological sequential running balance calculator
│   ├── audit.ts         # Immutable security audit logger
│   └── sanitize.ts      # NoSQL injection prevention & XSS escaping
├── models/              # Mongoose Schemas (User, Shop, Category, FinanceRecord, AuditLog)
├── schemas/             # Reusable Zod schemas for client and server
└── scripts/
    └── seed.ts          # Initial database seeding script
```

---

## 🛡️ Verification & Security Policies

1. **Least Privilege**: Finance Officers cannot edit or delete any record once its status changes from `PENDING`.
2. **Sequential Balances**: Cash balances dynamically calculate chronologically by branch from the earliest affected date.
3. **Data Integrity**: Deletion of branches or categories with linked records is blocked; soft deactivation is enforced.
4. **Auditability**: All actions including approvals, rejections, amount overrides, and shop reassignments write to the `AuditLog` collection.
