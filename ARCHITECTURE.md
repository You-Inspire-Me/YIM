# 🏗️ Architectuur Overzicht - Hoe alles samenwerkt

## 📍 Master Bestanden (Entry Points)

### Backend: `packages/backend/src/server.ts`
**Dit is het hart van de backend** - alles start hier!

```
server.ts (start)
  ↓
1. Laadt alle middleware (security, CORS, etc.)
  ↓
2. Koppelt routes aan URL's:
   - /api/auth → authRoutes
   - /api/products → productRoutes  
   - /api/host/products → hostProductRoutes
   - /api/host → hostRoutes (dashboard stats)
   - /api/host/orders → orderRoutes
   - /api/payments → paymentRoutes
  ↓
3. Start MongoDB & Redis connecties
  ↓
4. Luistert op poort 5000
```

**Request Flow:**
```
Browser → /api/auth/register
  ↓
server.ts (regelt routing)
  ↓
authRoutes.ts (welke route?)
  ↓
authController.ts (welke functie? → register)
  ↓
UserModel (database)
  ↓
Response terug naar browser
```

---

### Frontend: `packages/frontend/src/main.tsx`
**Dit is het hart van de frontend** - React start hier!

```
main.tsx (start)
  ↓
1. Wrapt alles in Providers:
   - QueryClientProvider (data fetching)
   - AuthProvider (login state)
   - CartProvider (winkelwagen)
   - BrowserRouter (navigatie)
  ↓
2. Laadt App.tsx
  ↓
3. App.tsx regelt alle routes:
   - / → HomePage
   - /shop → ShopPage
   - /host → HostLayout (met subroutes)
   - /auth/login → LoginPage
  ↓
4. Render naar DOM
```

**Component Flow:**
```
main.tsx
  ↓
App.tsx (routes)
  ↓
HostLayout (sidebar + content)
  ↓
DashboardHome (de pagina zelf)
  ↓
Gebruikt endpoints.api.host.dashboard.stats()
  ↓
Axios → /api/host/dashboard/stats
  ↓
Backend server.ts → hostRoutes → hostController
```

---

## 🔄 Complete Request Flow Voorbeeld

### Scenario: Host bekijkt dashboard

**1. Frontend (Browser)**
```
User klikt op /host
  ↓
App.tsx ziet route "/host"
  ↓
ProtectedRoute checkt: is user host? ✅
  ↓
HostLayout render (sidebar + content)
  ↓
DashboardHome component mount
  ↓
useQuery hook triggert
  ↓
endpoints.host.dashboard.stats() wordt aangeroepen
  ↓
Axios maakt GET request naar /api/host/dashboard/stats
```

**2. Backend (Server)**
```
Request komt binnen op /api/host/dashboard/stats
  ↓
server.ts ziet: app.use('/api/host', hostRoutes)
  ↓
hostRoutes.ts ziet: router.get('/dashboard/stats', getDashboardStats)
  ↓
requireAuth middleware checkt: heeft user cookie? ✅
  ↓
requireRole('host') middleware checkt: is user host? ✅
  ↓
hostController.getDashboardStats() wordt uitgevoerd
  ↓
Haalt data op uit MongoDB (OrderModel, ProductModel)
  ↓
Berekent statistieken
  ↓
Stuurt JSON response terug
```

**3. Frontend (Browser) - Response**
```
Axios ontvangt response
  ↓
React Query slaat data op in cache
  ↓
DashboardHome component re-render met nieuwe data
  ↓
Gebruiker ziet statistieken! 🎉
```

---

## 📂 Belangrijke Bestanden & Hun Rol

### Backend Structuur

```
backend/src/
├── server.ts ⭐ MASTER - Start alles, koppelt routes
│
├── config/          (Configuratie)
│   ├── env.ts       → Environment variables valideren
│   ├── database.ts  → MongoDB connectie
│   ├── redis.ts     → Redis connectie
│   └── cloudinary.ts → Cloudinary setup
│
├── models/          (Database schema's)
│   ├── User.ts      → User model (email, password, role)
│   ├── Product.ts   → Product model (title, price, images)
│   └── Order.ts     → Order model (items, status, customer)
│
├── routes/          (URL routing)
│   ├── authRoutes.ts      → /api/auth/*
│   ├── productRoutes.ts   → /api/products/*
│   ├── hostRoutes.ts      → /api/host/dashboard/*
│   ├── hostProductRoutes.ts → /api/host/products/*
│   └── orderRoutes.ts     → /api/host/orders/*
│
├── controllers/     (Business logic)
│   ├── authController.ts  → register, login, logout
│   ├── productController.ts → listProducts, createProduct
│   ├── hostController.ts  → getDashboardStats, getAnalytics
│   └── orderController.ts → listOrders, updateStatus
│
├── middleware/      (Tussenstappen)
│   ├── authMiddleware.ts  → Check of user ingelogd is
│   ├── uploadMiddleware.ts → Verwerk image uploads
│   └── errorHandler.ts    → Vang errors op
│
└── validators/      (Data validatie)
    ├── authSchema.ts      → Zod schema's voor login/register
    └── productSchema.ts   → Zod schema's voor producten
```

### Frontend Structuur

```
frontend/src/
├── main.tsx ⭐ MASTER - Start React app
│
├── App.tsx ⭐ ROUTER - Alle routes definiëren
│
├── components/
│   ├── Layout.tsx        → Normale layout (navbar + footer)
│   ├── HostLayout.tsx    → Host dashboard layout (sidebar)
│   ├── ProtectedRoute.tsx → Check of user toegang heeft
│   └── ui/               → Herbruikbare componenten (Button, Input)
│
├── pages/
│   ├── Customer/         → Klant pagina's
│   │   ├── Home.tsx
│   │   ├── Shop.tsx
│   │   └── Cart.tsx
│   ├── Host/             → Host dashboard pagina's
│   │   ├── DashboardHome.tsx
│   │   ├── Products.tsx
│   │   ├── Orders.tsx
│   │   └── Analytics.tsx
│   └── Auth/
│       ├── Login.tsx
│       └── Register.tsx
│
├── context/              (Global state)
│   ├── AuthContext.tsx   → Houdt bij wie ingelogd is
│   └── CartContext.tsx   → Houdt winkelwagen bij
│
└── lib/
    └── api.ts ⭐ API CLIENT - Alle API calls
        → endpoints.auth.login()
        → endpoints.host.dashboard.stats()
        → etc.
```

---

## 🔗 Hoe Bestanden Elkaar Aanroepen

### Voorbeeld: Host Dashboard Stats Ophalen

```
1. User klikt op /host
   ↓
2. App.tsx → route "/host" → HostLayout
   ↓
3. HostLayout → DashboardHome component
   ↓
4. DashboardHome.tsx:
   const { data } = useQuery({
     queryKey: ['host-dashboard-stats'],
     queryFn: () => endpoints.host.dashboard.stats()
   })
   ↓
5. api.ts → endpoints.host.dashboard.stats()
   → api.get('/host/dashboard/stats')
   ↓
6. Axios stuurt GET naar http://localhost:5173/api/host/dashboard/stats
   ↓
7. Nginx (frontend container) ziet /api/ → proxy naar backend:5000
   ↓
8. Backend server.ts ziet /api/host/dashboard/stats
   → app.use('/api/host', hostRoutes)
   ↓
9. hostRoutes.ts:
   router.get('/dashboard/stats', getDashboardStats)
   → requireAuth → requireRole('host') → getDashboardStats
   ↓
10. hostController.ts → getDashboardStats()
    → Haalt data uit MongoDB
    → Stuurt JSON terug
   ↓
11. Frontend ontvangt data → React Query cache → Component update
```

---

## 🎯 Belangrijkste Concepten

### 1. **Middleware Chain** (Backend)
Elke request gaat door middleware in volgorde:
```
Request
  ↓
CORS (toegang controleren)
  ↓
Helmet (security headers)
  ↓
Body parser (JSON lezen)
  ↓
Cookie parser (cookies lezen)
  ↓
Sanitize (XSS bescherming)
  ↓
Rate limit (spam bescherming)
  ↓
Route handler (bijv. authController.register)
  ↓
Response
```

### 2. **Provider Chain** (Frontend)
Alle componenten zitten in providers:
```
<QueryClientProvider>  → Data fetching/caching
  <AuthProvider>       → Login state
    <CartProvider>     → Winkelwagen state
      <BrowserRouter>  → Navigatie
        <App>          → Routes
          <Componenten>
```

### 3. **Route Protection**
```
User gaat naar /host/products
  ↓
App.tsx ziet route heeft ProtectedRoute
  ↓
ProtectedRoute checkt AuthContext: is user ingelogd?
  ↓
Zo nee → redirect naar /auth/login
  ↓
Zo ja → check allowedRoles: is user 'host'?
  ↓
Zo nee → redirect naar /
  ↓
Zo ja → render ProductsPage
```

---

## 🚀 Quick Reference

**Wil je iets aanpassen?**

- **Nieuwe API endpoint?** → Voeg toe in `server.ts` + maak route + controller
- **Nieuwe pagina?** → Voeg route toe in `App.tsx` + maak component
- **Nieuwe database model?** → Maak in `models/` + gebruik in controller
- **Nieuwe API call?** → Voeg toe in `lib/api.ts` → gebruik in component
- **Auth check?** → Gebruik `requireAuth` middleware (backend) of `ProtectedRoute` (frontend)

---

## 📊 Data Flow Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTP Request
       ↓
┌─────────────────┐
│  Nginx (Proxy)  │
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│  server.ts      │ ← MASTER BACKEND
│  (Express app)  │
└──────┬──────────┘
       │
       ├─→ authRoutes → authController → UserModel → MongoDB
       ├─→ productRoutes → productController → ProductModel → MongoDB
       ├─→ hostRoutes → hostController → OrderModel + ProductModel → MongoDB
       └─→ orderRoutes → orderController → OrderModel → MongoDB
```

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ↓
┌─────────────────┐
│   main.tsx      │ ← MASTER FRONTEND
│   (React start) │
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│   App.tsx       │ ← ROUTER
│   (Routes)      │
└──────┬──────────┘
       │
       ├─→ / → HomePage
       ├─→ /shop → ShopPage
       ├─→ /host → HostLayout → DashboardHome
       │                      → ProductsPage
       │                      → OrdersPage
       └─→ /auth/login → LoginPage
```

---

**Samenvatting:** 
- **Backend master = `server.ts`** → Regelt alle API routes
- **Frontend master = `main.tsx`** → Start React, `App.tsx` regelt routes
- **API client = `lib/api.ts`** → Alle communicatie met backend
- **Context = `AuthContext.tsx` + `CartContext.tsx`** → Global state

Alles werkt samen via deze master bestanden! 🎯

