# Inventory Management System

A multi-organization inventory and warehouse system built with the MERN stack. A company's goods are followed from the purchase order, through the gate, inspection and putaway, into stock - and every step is permission-controlled, configurable per organization and recorded in an audit log.

- **Client:** React 19, Vite, Tailwind CSS 4, Redux Toolkit, React Router 7
- **Server:** Node.js, Express 5, Mongoose 9 (MongoDB), JWT authentication

---

## Contents

1. [Key ideas](#key-ideas)
2. [Users, roles and permissions](#users-roles-and-permissions)
3. [The full flow](#the-full-flow)
4. [Stock tracking](#stock-tracking)
5. [Dashboard](#dashboard)
6. [Logs (audit trail)](#logs-audit-trail)
7. [Configuration](#configuration)
8. [Menu structure](#menu-structure)
9. [Project structure](#project-structure)
10. [Getting started](#getting-started)
11. [API overview](#api-overview)
12. [Conventions](#conventions)
13. [Known limitations](#known-limitations)

---

## Key ideas

- **Multi-organization.** Every organization has its own users, roles, catalog, documents, stock and settings. Data is isolated by the organization in the user's token - a request can never reach another organization's records. Each organization works under its own address: `/{companyRoute}/dashboard`.
- **Permission-based.** Access is a *resource + action* pair (view / create / edit). Menus, routes, buttons, API endpoints and dashboard sections all follow the same permissions.
- **Configuration-driven.** Each organization decides which modules it uses (Purchase Order, Gate Entry, GRN), whether over-receiving is allowed, and which currencies and units of measurement are available. The menu, the forms and the allowed paths through the flow adapt to those switches.
- **Auditable.** Every create, edit, status change and stock change is written to an append-only log that cannot be edited or deleted.
- **Stock is only ever changed by recorded movements.** Putaway adds stock, manual adjustments add or remove it, and every movement is kept as a transaction.

---

## Users, roles and permissions

| Who | What they are |
| --- | --- |
| **System Admin** | Platform-level user, not part of any organization. Creates and manages organizations. Created on first server start from the `.env` values. |
| **Network Admin** | The full-access administrator of one organization. Created with the organization. Sees and can do everything inside it. Cannot be edited or deleted. |
| **Support** | A protected full-access user created automatically inside every organization (for the product team to help the customer). |
| **Custom roles** | Created by the Network Admin. Each role is a set of permissions; users are assigned a role and see only what the role allows. |

**Permissions** are listed in one registry (`server/config/permissions.js`):

| Group | Resources (actions) |
| --- | --- |
| Catalog | Category, Product (view, create, edit) |
| Seller | Seller, Supplier (view, create, edit) |
| Procurement | Purchase Order (view, create, edit) |
| Receiving | Gate Entry, GRN (view, create, edit) |
| Inventory | Putaway (view, create), Inventory (view, edit), Stock Tracking (view) |
| Logs | Audit Log (view) |
| Settings | Configuration (view, edit), Role (view, create, edit), User (view, create, edit) |

Rules worth knowing:

- Any action implies **view** of that resource.
- There is no separate Delete permission: **Edit also covers deleting and switching active/inactive.**
- Gate entries, GRNs and putaways can **never be deleted** - they are cancelled instead, so the history stays.
- A user's email cannot be changed after creation.
- Permissions are re-read when the browser tab regains focus, so a role change takes effect without logging in again.

---

## The full flow

```
Seller -> Supplier -> Product
                         |
Purchase Order  ->  Gate Entry  ->  GRN (inspection)  ->  Putaway  ->  Inventory (stock)
   (what we          (truck is        (count, pass         (store the      (what we
    ordered)          at the gate)     and fail)            passed items)   hold now)
```

Each step is optional where the organization's **module switches** say so (see [Configuration](#configuration)). Document numbers are generated automatically: `PO-00001`, `GE-00001`, `GRN-00001`, `PUT-00001`.

### 1. Catalog (set-up)

- **Categories** group products.
- **Sellers** are the companies goods are bought from; **Suppliers** belong to a seller (the people or branches who deliver). Picking a seller narrows the supplier list.
- **Products** have a name, SKU, **barcode**, category, unit of measurement, image and price.

### 2. Purchase Order

Choose a seller, a supplier, the order date and the items (product, quantity, price **per unit**). The same product cannot be added twice.

Status: `draft` -> `issued` -> `partially_received` -> `received`, or `cancelled`.

- A draft can be edited; issuing it sends it into the flow.
- If **over-receiving** is switched on in Configuration, each order shows a toggle that decides whether more than the ordered quantity may be received.
- A purchase order can be **printed**.

### 3. Gate Entry

Records that a delivery has arrived: arrival time, vehicle number, driver name and phone, number of packages, challan / invoice number and notes.

- **Source:** either a purchase order, or directly from a seller and supplier (when the Purchase Order module is off or the delivery has no order).
- Status: `pending` -> `completed` (when its GRN is made), or `cancelled`.
- A gate entry cannot be deleted.

### 4. GRN (Goods Receipt Note)

Records what was actually received and inspected.

- **Source:** a gate entry, a purchase order, or directly from a seller - which of these are offered depends on which modules are on.
- For each item enter the **total received**, and the item's **barcode can be scanned** to find it quickly.
- **Inspection** splits what was received into **passed** and **failed** quantities. Only passed items go on to putaway.
- When over-receiving is not allowed, a GRN cannot take in more than the order still expects.
- Status: `pending_inspection` -> `inspected` -> `putaway_partial` -> `putaway_complete`, or `cancelled`.
- Receiving updates the purchase order (`partially_received` / `received`) and completes the gate entry.

### 5. Putaway

Stores the **passed** items of an inspected GRN into stock. It can be done in parts: a GRN becomes `putaway_partial` until everything that passed has been put away, then `putaway_complete`. A putaway cannot be deleted.

### 6. Inventory - Stock Overview

Shows every product that has stock, and can be adjusted:

- Stock is **created only by putaway.**
- **Increase** or **decrease** the quantity by hand with a reason (needs `inventory: edit`). Stock never goes below zero.
- Every change is stored as an append-only **stock transaction** (who, when, how much, why).

---

## Stock tracking

**Inventory -> Stock Tracking** follows each delivery through the flow and says **what has to be done next**. It is computed from the existing documents - nothing extra to maintain.

A tracker starts from a purchase order, or from a direct gate entry, or from a direct GRN, and shows a step diagram (Purchase Order -> Gate Entry -> GRN -> Putaway) with the current stage:

`draft` · `awaiting delivery` · `at the gate` · `awaiting inspection` · `awaiting putaway` · `completed` · `cancelled`

Summary cards count the deliveries in each stage, and clicking a row opens the full step diagram with the next action.

---

## Dashboard

`GET /api/dashboard` returns only the sections the user's role may view (and whose modules are on):

- **Network Admin** sees everything.
- **Custom roles** see only what they have permission for - for example a gate keeper sees gate entries, not users.

It shows headline cards (needs action, open purchase orders, waiting at the gate, awaiting inspection, put away in the last 7 days, products in stock, out of stock, catalog and user counts), the flow, 7-day charts, stock status and recent activity. Each card links to its page.

---

## Logs (audit trail)

A top-level **Logs** menu with four pages, all needing `audit-log: view`:

| Page | Records |
| --- | --- |
| **Inventory Logs** | Purchase orders, gate entries, GRNs, putaways and stock changes |
| **Configuration Logs** | Module switches, currencies and units |
| **Catalog Logs** | Categories, products, sellers and suppliers |
| **User & Role Logs** | Users and roles, password resets and profile edits (passwords are never recorded) |

Each entry stores the record, the action, the previous and new status, a plain-language summary and, for edits, **what changed (from -> to)**. The person is shown by their **current name**, so a renamed user appears under the new name. Filters: search, record type, action, user and date range.

---

## Configuration

**Settings -> Configuration** (per organization):

- **Modules:** switch **Purchase Order**, **Gate Entry** and **GRN** on or off. Menus, routes and the sources offered when creating a gate entry or GRN follow these switches.
- **Over-receiving** (a sub-setting of Purchase Order): whether extra quantity may be received.
- **Currencies and units of measurement:** the shared lists (`INR`, `USD`, ... / `L`, `CM`, `BOTTLE`, ...) are available everywhere; each organization chooses which are enabled and can **add or delete its own** custom ones.

Reference data is available from one API used by every form (`/api/currencies`, `/api/units`).

---

## Menu structure

```
Dashboard
Catalog        Categories, Products
Inventory      Stock Overview
               Operations: Purchase Orders, Gate Entry, GRN, Putaway
               Stock Tracking
Seller         Sellers, Suppliers
Logs           Inventory Logs, Configuration Logs, Catalog Logs, User & Role Logs
Settings       Configuration, Roles, Users
```

The same configuration file (`client/src/config/navigation.js`) drives both the sidebar and the routes; an entry is shown only if the user has its permission and its module is on.

---

## Project structure

```
inventory-management-system/
├── client/                 React app (Vite)
│   └── src/
│       ├── components/     ui/ (Input, Select, Modal, Table, TabToggle, ...), common/, layout/
│       ├── config/         navigation.js, app.js
│       ├── pages/          one folder per feature (purchase-orders, gate-entries, grns, putaway, ...)
│       ├── routes/         AppRoutes.jsx, ProtectedRoute
│       ├── services/       API calls (one file per resource)
│       ├── store/          Redux slices (auth, modules, ...)
│       └── utils/
└── server/                 Express API
    ├── config/             permissions, constants, grn sources, reference data
    ├── controllers/        request handling
    ├── middleware/         authenticate, permission checks, module switches
    ├── models/             Mongoose schemas
    ├── routes/             one router per resource
    ├── services/           inventory, tracking, audit, configuration logic
    └── utils/              organization scoping, helpers, migrations
```

---

## Deploying for free

Three free services: **MongoDB Atlas** (database), **Render** (API) and **Netlify** (client).

1. **Database.** Create a free cluster on MongoDB Atlas and a database user, allow `0.0.0.0/0` under Network Access, and copy the connection string.
2. **API on Render.** New -> Web Service from this repo. Root directory `server`, build command `npm install`, start command `npm start`. Add the environment variables from `server/.env.example` (`MONGODB_URI`, a strong `JWT_SECRET`, the `SUPER_ADMIN_*` and `SUPPORT_USER_*` values). Set `CLIENT_URL` to the Netlify address once you have it.
3. **Client on Netlify.** Import the repo. Base directory `client`, build command `npm run build`, publish directory `client/dist`. The API address comes from `client/.env` (`VITE_API_URL`) - change it there, or set `VITE_API_URL` in Netlify, to point at your Render address (no trailing slash). `client/public/_redirects` makes page refreshes work on any route.
4. Log in with the System Admin from step 2 and create an organization.

Free-tier notes: the Render service sleeps after about 15 minutes without traffic, so the first request takes up to a minute to wake it. Uploaded images are stored on the server disk, which Render clears on every deploy - use Cloudinary or S3 for permanent storage.

---

## Getting started

**Requirements:** Node.js 18+ and a MongoDB database.

### 1. Server

```bash
cd server
npm install
```

Create `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/inventory
JWT_SECRET=change-me

# System Admin, created on first start if it does not exist
SUPER_ADMIN_NAME=System Admin
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=change-me

# Support user created inside every organization.
# support@example.com becomes support+<companyRoute>@example.com for each organization
SUPPORT_USER_NAME=Support
SUPPORT_USER_EMAIL=support@example.com
SUPPORT_USER_PASSWORD=change-me
```

```bash
npm run dev      # starts the API on http://localhost:5000
```

### 2. Client

```bash
cd client
npm install
npm run dev      # starts the app on http://localhost:5173
```

The client calls the API at `http://localhost:5000/api` (set in `client/src/services/api.js`).

Other client scripts: `npm run build`, `npm run lint`, `npm run preview`.

### 3. First use

1. Log in as the **System Admin** and create an organization (its Network Admin and Support user are created with it).
2. Log in as the **Network Admin** at `/{companyRoute}/dashboard`.
3. Open **Settings -> Configuration** and switch on the modules you want, and pick currencies and units.
4. Create **Roles** and **Users**.
5. Add **Categories, Sellers, Suppliers, Products**.
6. Run a delivery through the flow: **Purchase Order -> Gate Entry -> GRN -> Putaway**, then check **Stock Overview**, **Stock Tracking** and **Logs**.

---

## API overview

All routes are under `/api`, need a JWT (`Authorization: Bearer <token>`) and are limited by permission and organization.

| Area | Base path |
| --- | --- |
| Auth / profile | `/auth` |
| System Admin: organizations | `/system`, `/organizations` |
| Users, roles | `/users`, `/roles` |
| Catalog | `/categories`, `/products`, `/sellers`, `/suppliers` |
| Flow | `/purchase-orders`, `/gate-entries`, `/grns`, `/putaways` |
| Stock | `/inventory`, `/tracking` |
| Dashboard, logs | `/dashboard`, `/audit-logs` |
| Settings | `/configuration`, `/currencies`, `/units` |

Responses: `{ data, meta }` on success, where `meta` is `null` or exactly `{ total_page, page, per_page, current_page }` for lists. Errors return a message and an HTTP status.

---

## Conventions

- Lists are paginated; dropdowns that fetch from the server load **on open, 40 per page**.
- Boolean props are named `isX`.
- Modals close on outside click or Escape.
- Quantities are rounded to 3 decimals.
- Server changes that touch more than one record are made safely step by step with roll-back on failure (no multi-document transactions are needed).
- Audit logging never breaks the action it describes.

---

## Known limitations

- Nothing is back-filled into the audit log for actions made before logging existed.
- System Admin actions are not logged in any organization.
- All four Logs pages share one permission (`audit-log: view`).
- Dashboard 7-day charts use UTC days.
- Stock Tracking follows the most recent 1000 documents per list.
