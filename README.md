# 📊 Newgen Multi-Branch Finance Management & ERP System

An enterprise-grade, secure, multi-branch financial accounting and resource planning web application developed for **Newgen Online School (Pvt) Ltd.** by **Trimids (Pvt) Ltd.** Built with **Next.js 16 (App Router)**, **Auth.js v5 (NextAuth)**, **shadcn/ui**, **Tailwind CSS**, and **MongoDB (Mongoose)**.

> 📄 **Official Legal Contract & Scope of Work:**  
> Please see the complete formal contract: [**AGREEMENT.md**](file:///d:/Projects/Newgen-ERP/AGREEMENT.md) (Web Development Agreement between Trimids (Pvt) Ltd. and Newgen Online School (Pvt) Ltd. - Ref: `AGR-2026-NOS-001`).

---

## 🏛️ Project Stakeholders & Parties

| Role | Organization | Representative | Contact |
|---|---|---|---|
| **Client** | **Newgen Online School (Pvt) Ltd.**<br/>No: 14/A, Poojapitiya Rd, Ankumbura | **Mr. Shalika Karunarathne**<br/>Owner & CEO | (+94) 71 274 9301 |
| **Service Provider** | **Trimids (Pvt) Ltd.** (PV 00344750)<br/>No: 55/1B, Kirigampamunuwa, Polgasowita, Kottawa | **Mr. Tharaka Dharmasiri**<br/>Director & CEO | (+94) 78 149 8152<br/>hi@trimids.com |

---

## 🚀 Key Highlights & Architectural Features

- **Multi-Branch Operations & Cash Drawer Tracking**:
  - Independent cash drawers and ledger tracking for Danuma, Arunalu, Vition, Newgen Online School, Matale, Ankumbura, and Teachers Center.
  - Chronological running balance engine (`lib/balance.ts`) recalculating balances instantly upon creation, review, or edit.
- **Inter-Branch & Cross-Branch Settlement Engine**:
  - Allows customers to pay tuition fees, retail bills, or credit debts at Branch A on behalf of Branch B.
  - Automatically isolates physical cash drawer attribution (Branch A) from revenue attribution (Branch B).
  - Admin settlement workflows: Physical Cash Handover, Direct Company Bank Deposit, and Mutual Debt Offset.
- **Retail & Communication Sales Ledger with Profit Analytics**:
  - Barcode / item selection with hidden base unit cost (admin only) and automated selling profit calculation.
  - Telecom operator recognition and analytics for **Dialog**, **Mobitel**, **Airtel**, and **Hutch** reloads.
  - Dynamic timeframe filters (Today, This Week, This Month, This Year, Custom Date Range).
- **Customer Credit Accounts & Debt Repayment**:
  - Customer credit lines with transaction ledger, debt repayment, and printable/exportable account statements.
  - Multi-branch credit repayment with verifier authorization safeguards.
- **Multi-Bank Accounts & Petty Cash Management**:
  - Full tracking of institutional bank accounts (BOC, Commercial Bank, HNB, Sampath, etc.) and branch petty cash floats.
- **Strict Role-Based Access Control (RBAC)** across 3 tiers:
  - 🛡️ **Administrator (`ADMIN`)**: Complete governance, bank management, inter-branch settlements, user management, and executive analytics.
  - 🔍 **Finance Verifier (`VERIFIER`)**: Cross-branch verification queue to authorize or reject records and credit repayments with audit remarks.
  - 📝 **Finance Officer (`STAFF`)**: Branch-restricted ledger entries, petty cash, communication sales, and debt collection. Records lock once approved.
- **Immutable Audit Trail & Data Security**:
  - Automatically records every sensitive operation (`APPROVE_RECORD`, `REJECT_RECORD`, `ROLE_CHANGE`, `SETTLEMENT_RECORDED`) with actor, timestamp, and diff metadata.
  - NoSQL injection sanitization (`lib/sanitize.ts`), CSP headers, and password hashing via bcryptjs.
- **100% Theme CSS Variables**:
  - Modern, responsive, dark and light theme interface built with shadcn/ui and semantic tokens.

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
