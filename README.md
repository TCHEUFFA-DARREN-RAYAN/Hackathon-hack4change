# **Presented by Team `sudo -rm -rf`**

### Contributors

| Name |
|------|
| **Faizan Malek** |
| **Darren Rayan Tcheuffa** |
| **Uday Shishodia** |

---

# CommonGround

**Hack4Change 2026 — Hackathon submission**

CommonGround is a real-time donation coordination platform built for the Greater Moncton Homelessness Steering Committee (GMHSC) network of homeless-serving organizations in Moncton, NB. It replaces informal texts and emails with a shared system where donors can see exactly what is needed, organizations can manage their inventory and post shortages, and coordinators get a live network-wide picture.

---

## The Problem

Shelters and support organizations in Moncton coordinate donated goods informally — through text messages, phone calls, and emails. Some organizations are overstocked with items other organizations critically need. There is no shared system, and donations often go to the wrong place or expire unmatched.

## The Solution

CommonGround connects three groups in one web application:

- **Donors** — Browse the live needs board and submit donations through a simple form. A smart matching engine compares your items against all active needs across the network and recommends the top 3 organizations, with plain-language reasoning.
- **Shelter staff** — Log in to manage their organization's inventory, flag shortages, post needs with urgency levels, and confirm incoming donations.
- **Network coordinators** — See a live dashboard of all organizations: critical shortage heatmap, full donations pipeline, rule-based insights on redistribution opportunities, and CSV exports.

---

## AI Disclosure

*Required per Hack4Change submission rules.*

**AI tools used in development:** We used Cursor IDE with Claude (Anthropic) as a coding assistant to accelerate development. AI assistance was used for:

- **Boilerplate and scaffolding** — Express routes, MySQL models, API structure
- **Chat functionality** — In-app messaging (org channels, direct to coordinator, cross-org threads), Socket.IO integration, thread and message models
- **Analytics page** — Chart.js dashboards, date-range filters, donation and needs charts for staff and coordinator views
- **Security middleware** — Input sanitization, SQL injection blocking, rate limiting
- **Debugging and documentation** — Error handling, inline comments, README content

All AI-generated code was reviewed, tested, and modified by the team before use.

---

## Demo

| Needs Board | Donation Form | Coordinator Dashboard |
|-------------|---------------|------------------------|
| ![Needs Board](docs/screenshots/needs-board.png) | ![Donation Form](docs/screenshots/donate-form.png) | ![Coordinator](docs/screenshots/coordinator-dashboard.png) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MySQL (via MySQL Workbench) |
| Matching | Rule-based weighted scoring (no external API) |
| Auth | JWT (access + refresh tokens, httpOnly cookies) |

No build tools, no framework dependencies. Runs with `npm run dev`.

---

## Quick Start

### Prerequisites

- Node.js 18+
- MySQL server running locally (or remote)
- A MySQL user with access to create databases (see `create db.txt`)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

The only values you must change to run locally are the database credentials (which default to the hackathon dev values).

### 3. Create the database and seed data

**Option A — Fresh schema (empty tables):**
```bash
npm run migrate
```

**Option B — Demo data (10 real Moncton NB orgs, inventory, needs, donations):**
```bash
npm run migrate
npm run seed:demo
```

This loads `seed-demo.sql`: 10 real organizations (House of Nazareth, Harvest House, Crossroads for Women, YWCA, John Howard Society, Peter McKee Food Centre, Second Mile Food Bank, Salvation Army, St. Vincent de Paul, The Humanity Project), staff accounts, inventory, needs, donations, and surplus transfers — ready for demo.

### 4. Start the development server

```bash
npm run dev
```

Visit `http://localhost:3000`

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `3000` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_USER` | MySQL username | `hackathon` |
| `DB_PASSWORD` | MySQL password | `Hackathon123` |
| `DB_NAME` | Database name | `CommonGround` |
| `DB_PORT` | MySQL port | `3306` |
| `JWT_SECRET` | Secret for signing JWT tokens | *(long random string)* |
| `JWT_EXPIRES_IN` | Access token expiry | `24h` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `ADMIN_DEFAULT_EMAIL` | Coordinator login email | `coordinator@commonground.ca` |
| `ADMIN_DEFAULT_PASSWORD` | Coordinator login password | `password123` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:3000` |

---

## Default Login Credentials

After running `npm run migrate` and `npm run seed:demo`:
### 🔑 Test Accounts

| Role | Email | Password |
|-----|-----|-----|
| Coordinator | coordinator@commonground.ca | password123 |
| Staff – House of Nazareth | info@maisonnazareth.ca | password123 |
| Staff – Harvest House | info@harvesthouseatlantic.org | password123 |
| Staff – Crossroads for Women | adminfo@crossroadsforwomen.ca | password123 |
| Staff – YWCA Moncton | info@ywcamoncton.com | password123 |
| Staff – John Howard Society | info@johnhowardsenb.com | password123 |
| Staff – Peter McKee Food Centre | info@petermckeecfc.ca | password123 |
| Staff – Second Mile Food Bank | info@secondmilefoodbank.ca | password123 |
| Staff – Salvation Army | moncton@salvationarmy.ca | password123 |
| Staff – St. Vincent de Paul | svdp.moncton@gmail.com | password123 |
| Staff – The Humanity Project | TheHumanityProjectNB@gmail.com | password123 |



---

## Roles

- **Coordinator** = Network admin. Logs in with coordinator credentials and has full visibility across all organizations. The coordinator dashboard at `/coordinator` is the main admin interface for donation coordination.
- **Staff** = Organization-scoped. Manages one organization's inventory, needs, and donations. Can request surplus from other orgs and confirm incoming transfers.

## Pages

| URL | Access | Description |
|---|---|---|
| `/` | Public | Live needs board — all orgs with top needs, filterable |
| `/give` | Public | Donation landing — choose to give items or financial donation |
| `/donate` | Public | 4-step donation form with automatic matching |
| `/all-needs` | Public | Paginated list of all active needs across the network |
| `/staff` | Staff login required | Inventory, needs, incoming donations, incoming transfers, request surplus from other orgs |
| `/coordinator` | Coordinator login required | Network overview, needs, donations, surplus requests, surplus transfers, insights, exports |
| `/login` | Public | Login page for staff and coordinators |

---

## API Endpoints

### Public

- `GET /api/public/orgs-with-needs` — All organizations with their top 3 unfulfilled needs
- `GET /api/public/needs` — All unfulfilled needs with optional filters
- `GET /api/public/organizations` — Organization list for dropdown
- `POST /api/public/donations` — Submit a new donation
- `PATCH /api/public/donations/:id/match` — Apply match result

### Auth

- `POST /api/auth/login` — Login (staff or coordinator, pass `role` field)
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Current user info
- `POST /api/auth/refresh` — Refresh access token

### Staff (JWT required)

- `GET /api/staff/org`
- `GET|POST /api/staff/inventory`
- `PATCH|DELETE /api/staff/inventory/:id`
- `GET|POST /api/staff/needs`
- `PATCH|DELETE /api/staff/needs/:id`
- `POST /api/staff/needs/:id/fulfill`
- `GET /api/staff/donations`
- `POST /api/staff/donations/:id/confirm`
- `GET /api/staff/surplus` — Network surplus (excluding own org)
- `GET /api/staff/surplus-requests` — My org's surplus requests
- `POST /api/staff/surplus-requests` — Request surplus from another org
- `GET /api/staff/transfers` — Incoming transfers
- `POST /api/staff/transfers/:id/complete` — Confirm receipt
- `GET /api/staff/expiring?days=30` — Items expiring soon

### Coordinator (JWT + admin role required)

- `GET /api/coordinator/overview`
- `GET /api/coordinator/orgs`
- `GET /api/coordinator/needs`
- `GET /api/coordinator/donations`
- `PATCH /api/coordinator/donations/:id/status`
- `GET /api/coordinator/surplus`
- `GET /api/coordinator/expiring?days=30` — Items expiring soon
- `GET /api/coordinator/surplus-requests?status=pending` — Surplus requests (staff-initiated)
- `PATCH /api/coordinator/surplus-requests/:id` — Approve/reject request
- `GET /api/coordinator/transfers` — Surplus transfers
- `POST /api/coordinator/transfers` — Initiate transfer
- `PATCH /api/coordinator/transfers/:id/status` — Update transfer status
- `GET /api/coordinator/export/needs` (CSV)
- `GET /api/coordinator/export/inventory` (CSV)

---

## Matching & Insights (No AI Required)

Donation matching and network insights use **automatic rule-based logic** — no AI or API keys needed.

**Donation Matching** (`POST /api/ai/match-donation`): Matches donations to needs by category, item name similarity, urgency level, and quantity fit. Returns top 3 organizations. Runs entirely on the server with no external API calls.

**Network Insights** (`POST /api/ai/network-insights`): Generates a summary from current data: critical needs count, surplus items, redistribution opportunities (surplus at one org matching a need at another), and organizations needing follow-up (stale inventory). Rule-based only.

---

## Project Structure

```
Hackaton-hack4change/
├── backend/
│   ├── config/
│   │   └── database.js          # MySQL connection pool
│   ├── controllers/
│   │   └── auth.controller.js   # Login, logout, me, refresh
│   ├── middleware/
│   │   ├── auth.middleware.js   # JWT verification
│   │   └── security.middleware.js
│   ├── models/
│   │   ├── admin.model.js
│   │   ├── staff.model.js
│   │   ├── organization.model.js
│   │   ├── inventory.model.js
│   │   ├── needs.model.js
│   │   └── donation.model.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── public.routes.js
│   │   ├── staff.routes.js
│   │   ├── coordinator.routes.js
│   │   └── ai.routes.js
│   ├── utils/
│   │   ├── jwt.util.js
│   │   └── hash.util.js
│   └── server.js
├── public/
│   ├── index.html               # Public needs board
│   ├── give.html                 # Donation landing page
│   ├── donate.html               # Donation form with automatic matching
│   ├── all-needs.html            # Paginated needs list
│   ├── auth.html                 # Login page
│   ├── staff.html                # Staff portal
│   ├── coordinator.html         # Coordinator dashboard
│   ├── css/style.css
│   └── js/
│       ├── api.js                # API client
│       └── utils.js              # Toast, badge helpers, auth guard
├── scripts/
│   ├── migrate.js               # Schema creation
│   └── run-seed-demo.js         # Load demo data (10 real orgs, inventory, needs, donations)
├── .env                          # Environment configuration
├── package.json
└── README.md
```

---

## Deployment

### Deploying to a VPS or server

1. Set `NODE_ENV=production` in your environment
2. Set `COOKIE_SECURE=true` if serving over HTTPS
3. Point `CORS_ORIGINS` to your production domain
4. Use a process manager like PM2: `pm2 start backend/server.js --name commonground`
5. Put Nginx or Caddy in front for SSL termination

### Database on production

Use any managed MySQL service (PlanetScale, Railway, AWS RDS) and update the `DB_*` environment variables.

---

*Built for Hack4Change 2026. Designed for real deployment to the GMHSC network.*
