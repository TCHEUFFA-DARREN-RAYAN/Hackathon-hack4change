# CommonGround

**Hack4Change 2026 — Hackathon submission**

CommonGround is a real-time donation coordination platform built for the Greater Moncton Homelessness Steering Committee (GMHSC) network of 28 homeless-serving organizations. It replaces informal texts and emails with a shared system where donors can see exactly what is needed, organizations can manage their inventory and post shortages, and coordinators get a live network-wide picture.

---

## The Problem

28 shelters and support organizations in Moncton coordinate donated goods informally — through text messages, phone calls, and emails. Some organizations are overstocked with items other organizations critically need. There is no shared system, and donations often go to the wrong place or expire unmatched.

## The Solution

CommonGround connects three groups in one web application:

- **Donors** — Submit an offer of goods through a simple form. An AI model reviews all current needs across the network and recommends the best-matched organization, explaining its reasoning in plain language.
- **Shelter staff** — Log in to manage their organization's inventory, flag shortages, post needs with urgency levels, and confirm incoming donations.
- **Network coordinators** — See a live dashboard of all 28 organizations: critical shortage heatmap, full donations pipeline, AI-generated insights on redistribution opportunities, and CSV exports.

---

## Demo

[Screenshot placeholder — add screenshot or GIF of the needs board, donation form, and coordinator dashboard]

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MySQL (via MySQL Workbench) |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Auth | JWT (access + refresh tokens, httpOnly cookies) |

No build tools, no framework dependencies. Runs with `npm run dev`.

---

## Quick Start

### Prerequisites

- Node.js 18+
- MySQL server running locally (or remote)
- A MySQL user with access to create databases (see `create db.txt`)
- An Anthropic API key (for AI features — optional, app works without it)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env` and fill in your values:

```bash
cp .env .env.local
```

The only values you must change to run locally are the database credentials (which default to the hackathon dev values) and the Anthropic API key if you want AI features.

### 3. Create the database and seed data

```bash
npm run migrate
```

This drops and recreates all tables, inserts all 28 GMHSC organizations, sample inventory, needs, and donations.

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
| `DB_USER` | MySQL username | `hackaton` |
| `DB_PASSWORD` | MySQL password | `Hackathon123` |
| `DB_NAME` | Database name | `hackaton_test` |
| `DB_PORT` | MySQL port | `3306` |
| `JWT_SECRET` | Secret for signing JWT tokens | *(long random string)* |
| `JWT_EXPIRES_IN` | Access token expiry | `24h` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `ANTHROPIC_API_KEY` | Claude API key for AI features | `sk-ant-...` |
| `ADMIN_DEFAULT_EMAIL` | Coordinator login email | `coordinator@gmhsc.ca` |
| `ADMIN_DEFAULT_PASSWORD` | Coordinator login password | `Admin123456` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:3000` |

---

## Default Login Credentials

After running `npm run migrate`:

| Role | Email | Password |
|---|---|---|
| Coordinator | `coordinator@gmhsc.ca` | `Admin123456` |
| Staff (Harvest House) | `staff@harvesthouse.ca` | `Staff123456` |
| Staff (Crossroads) | `staff@crossroadsforwomen.ca` | `Staff123456` |
| Staff (Food Bank) | `staff@moncton-foodbank.ca` | `Staff123456` |
| Staff (Salvation Army) | `staff@salvationarmy.ca` | `Staff123456` |
| Staff (GMHS) | `staff@gmhs.ca` | `Staff123456` |

---

## Pages

| URL | Access | Description |
|---|---|---|
| `/` | Public | Live needs board — all 28 orgs with top needs, filterable |
| `/donate` | Public | 4-step donation form with AI matching |
| `/staff` | Staff login required | Inventory management, needs posting, incoming donations |
| `/coordinator` | Coordinator login required | Network overview, all needs, donation pipeline, AI insights |
| `/login` | Public | Login page for staff and coordinators |

---

## API Endpoints

### Public
- `GET /api/public/orgs-with-needs` — All organizations with their top 3 unfulfilled needs
- `GET /api/public/needs` — All unfulfilled needs with optional filters
- `GET /api/public/organizations` — Organization list for dropdown
- `POST /api/public/donations` — Submit a new donation
- `PATCH /api/public/donations/:id/match` — Apply AI match result

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

### Coordinator (JWT + admin role required)
- `GET /api/coordinator/overview`
- `GET /api/coordinator/orgs`
- `GET /api/coordinator/needs`
- `GET /api/coordinator/donations`
- `PATCH /api/coordinator/donations/:id/status`
- `GET /api/coordinator/surplus`
- `GET /api/coordinator/export/needs` (CSV)
- `GET /api/coordinator/export/inventory` (CSV)

### AI
- `POST /api/ai/match-donation` — Smart donation matching (public, rate-limited)
- `POST /api/ai/network-insights` — Network health summary (coordinator only)

---

## AI Usage Declaration

*Required disclosure per Hack4Change 2026 rules.*

### How Claude API is used in the application

**Feature 1 — Smart Donation Matching** (`POST /api/ai/match-donation`):
When a donor completes step 2 of the donation form, the backend fetches all unfulfilled needs from the database and sends them to `claude-sonnet-4-20250514` along with the item being donated (name, category, quantity, condition). Claude ranks the top 3 matching organizations considering urgency level, category alignment, and quantity fit. It returns a JSON structure with organization names and plain-language reasoning for each match. This is shown to the donor in step 3 before they confirm. The donor can accept the recommended match or choose differently.

**Feature 2 — Network Insights** (`POST /api/ai/network-insights`):
From the coordinator dashboard, a coordinator can click "Generate Insights" to trigger a full network analysis. The backend sends Claude a snapshot of all critical needs, all surplus items, and organizations that haven't updated their inventory in 48+ hours. Claude returns a structured JSON response with: a 3-sentence network health summary, up to 3 redistribution opportunities (surplus at one org matched to a need at another), up to 3 organizations needing follow-up, and up to 3 immediate action alerts. This is rendered in the AI Insights panel.

### Tools used during development

This project was developed using **Claude Code** (Anthropic's official CLI, powered by `claude-sonnet-4-6`) as the primary development tool. Claude Code was used to generate, review, and refine all code in this repository — including the database schema, backend routes and models, frontend HTML/CSS/JS, and this README.

---

## Project Structure

```
homeless-hackaton/
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
│   ├── donate.html              # Donation form with AI matching
│   ├── staff.html               # Staff portal
│   ├── coordinator.html         # Coordinator dashboard
│   ├── login.html               # Login page
│   ├── css/style.css
│   └── js/
│       ├── api.js               # API client
│       └── utils.js             # Toast, badge helpers, auth guard
├── scripts/
│   └── migrate.js               # Schema creation + seed data
├── .env                         # Environment configuration
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

## Team

[Team name placeholder]

[Team member names placeholder]

---

*Built for Hack4Change 2026. Designed for real deployment to the GMHSC network.*
