# ZalandoX E-commerce Monorepo

Een moderne, schaalbare e-commerce toepassing geïnspireerd op Zalando. Deze monorepo bevat een React-frontend en een Node.js/Express-backend met MongoDB, Redis-caching, Cloudinary uploads en Stripe betalingen. Alles draait lokaal met één `docker-compose up`.

## ✨ Belangrijkste features
- JWT-authenticatie met rollen (`customer` & `host`) en httpOnly cookies
- **Volledig Host Dashboard** met:
  - Dashboard home met statistieken, omzetgrafieken en recente bestellingen
  - Productbeheer met bulk acties en lage voorraad waarschuwingen
  - Bestellingenbeheer met status updates en filters
  - Analytics met omzet- en verkoopgrafieken (Chart.js)
  - Winkelprofiel beheer (banner, logo, sociale media)
  - Instellingen (wachtwoord wijzigen, notificaties, CSV export)
- Klant-shop met zoeken, filteren, winkelwagen en Stripe Checkout
- Redis-caching voor productoverzicht en production-ready security middleware
- Tailwind CSS met dark mode, skeleton states, toasts en mobile-first ontwerp

## 🧱 Tech stack
- **Frontend:** React 18, Vite, TypeScript, React Router, React Query, React Hook Form, Tailwind CSS, Chart.js
- **Backend:** Node.js 20, Express, TypeScript, Mongoose, Zod, Stripe, Cloudinary, date-fns
- **Infra:** MongoDB, Redis, Docker Compose, Railway (deploy), Nginx static hosting

## 📂 Projectstructuur
```text
ecommerce-zalando/
├── packages/
│   ├── frontend/        # Vite + React app
│   └── backend/         # Express API
├── docker-compose.yml
├── .env.example
├── railway.json
└── README.md
```

## ⚙️ Voorwaarden
- Node.js ≥ 20
- npm ≥ 10
- Docker & Docker Compose (voor containerized setup)
- Cloudinary account & Stripe API keys voor productiegebruik

## 🔐 Omgevingsvariabelen
Kopieer `.env.example` naar `.env` in de projectroot en vul waarden in:

```bash
cp .env.example .env
```

Belangrijke variabelen:
- `MONGODB_URI` – MongoDB connectiestring (lokaal: `mongodb://mongo:27017/zalando`)
- `JWT_SECRET` – minimaal 32 tekens
- `CLOUDINARY_*` – Cloudinary API gegevens
- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`
- `CLIENT_URL` – URL van de frontend (bijv. `http://localhost:5173`)
- `REDIS_URL` – Redis connectiestring (`redis://redis:6379` in Docker)
- `VITE_API_URL` – API-basis URL voor de frontend (lokaal: `http://localhost:5000/api`)

## 🚀 Lokale ontwikkeling
Installatie en starten in watch-mode:

```bash
npm install
npm run dev
```

- Frontend draait op `http://localhost:5173`
- Backend draait op `http://localhost:5000`

### Nodige lokale services
Voor directe lokale ontwikkeling (zonder Docker) heb je draaiende instanties nodig van:
- MongoDB (bijv. via Docker: `docker run -p 27017:27017 mongo:7`)
- Redis (`docker run -p 6379:6379 redis:7-alpine`)

## 🐳 Docker Compose
Start alle services (frontend, backend, MongoDB, Redis) in één klap:

```bash
docker-compose up --build
```

Services:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5001/api` (poort 5001 in Docker i.v.m. port conflict)
- MongoDB: `mongodb://localhost:27017`
- Redis: `redis://localhost:6379`

Stop alles met `docker-compose down`. Voeg `-v` toe om volumes (Mongo data) te verwijderen.

## ☁️ Deploy naar Railway
Het meegeleverde `railway.json` script bouwt en start de backend:

1. Maak een nieuw Railway project en koppel de repo
2. Stel de benodigde environment variables in
3. Railway voert automatisch uit:
   - `npm install`
   - `npm run build:backend`
   - `npm --workspace packages/backend run start`

Voor de frontend kun je Vercel of een andere static host gebruiken met de build output uit `packages/frontend/dist`.

## 📡 API-overzicht
| Methode | Endpoint                   | Beschrijving                     |
|---------|---------------------------|----------------------------------|
| POST    | `/api/auth/register`      | Maak nieuw account               |
| POST    | `/api/auth/login`         | Log in met email + wachtwoord    |
| POST    | `/api/auth/logout`        | Invalidate jwt-cookie            |
| GET     | `/api/auth/me`            | Huidige gebruiker                |
| GET     | `/api/products`           | Productlijst met search/filter   |
| GET     | `/api/products/:id`       | Productdetails                   |
| GET     | `/api/host/products`      | Host-producten (protected)       |
| POST    | `/api/host/products`      | Nieuw product (protected, host)  |
| PATCH   | `/api/host/products/:id`  | Bewerken product (protected)     |
| DELETE  | `/api/host/products/:id`  | Verwijder product (protected)    |
| POST    | `/api/payments/checkout`  | Stripe Checkout sessie (protect) |
| GET     | `/api/host/dashboard/stats` | Dashboard statistieken (host) |
| GET     | `/api/host/dashboard/revenue` | Omzetgrafiek data (host) |
| GET     | `/api/host/dashboard/top-products` | Top verkochte producten (host) |
| GET     | `/api/host/analytics` | Analytics overzicht (host) |
| GET     | `/api/host/orders` | Bestellingen lijst (host) |
| GET     | `/api/host/orders/:id` | Bestelling details (host) |
| PATCH   | `/api/host/orders/:id/status` | Update bestelling status (host) |

## 🧪 Testing & linting
- Frontend lint: `npm run lint:frontend`
- Backend lint: `npm run lint:backend`
- Beide: `npm run lint`

(Er zijn nog geen geautomatiseerde tests; voeg ze toe op basis van projectvereisten.)

## 📦 Belangrijke scripts
| Script | Beschrijving |
|--------|--------------|
| `npm run dev` | Start frontend & backend tegelijk |
| `npm run build` | Bouwt beide pakketten |
| `npm run build:frontend` | Bouwt Vite app |
| `npm run build:backend` | Transpileert Express API |
| `npm run lint` | Voert linting uit op beide pakketten |

## 🙌 Credits
- UI inspiratie: Zalando & moderne fashion shops
- Foto’s: [Unsplash](https://unsplash.com/)

## 🎛️ Host Dashboard

Het volledige host dashboard is beschikbaar op `http://localhost:5173/host` (na inloggen als host).

**Features:**
- **Dashboard Home** (`/host`) - Overzicht met statistieken, omzetgrafieken en recente bestellingen
- **Producten** (`/host/products`) - Beheer alle producten met bulk acties
- **Bestellingen** (`/host/orders`) - Bekijk en update bestelling statussen
- **Analytics** (`/host/analytics`) - Omzet- en verkoopgrafieken
- **Winkelprofiel** (`/host/profile`) - Pas winkel branding en informatie aan
- **Instellingen** (`/host/settings`) - Account instellingen en data export

**Toegang:**
1. Registreer een account met rol `host`
2. Log in en navigeer naar `/host`
3. Gebruik de sidebar navigatie om tussen secties te wisselen

Veel plezier met bouwen! 🎉
