# Hotel Centrum — Management System

Internal management application for Hotel Centrum (Pristina, Kosovo). Handles reservations, check-in/out, housekeeping, minibar billing, staff management, and operational reports across 55 rooms in two buildings (old + new).

---

## Quick facts

| Item | Value |
|---|---|
| **Hotel size** | 55 rooms, 5 floors, 2 buildings (old + new) |
| **User roles** | Admin, Manager, Reception, Cleaner |
| **Language** | Albanian (default), English-ready |
| **Platform** | Web app (desktop + mobile responsive) |
| **Offline** | Not supported in v1 (online-only) |
| **Payments** | Single paid/unpaid flag per booking |
| **Integrations** | None (no Booking.com, no fiscal printer yet) |

---

## Architecture at a glance

```
┌─────────────────────────────────────────────────────┐
│  Browser (React app on Vercel)                      │
│  ┌─────────────┐  ┌──────────────┐                  │
│  │   Pages     │  │  Components  │                  │
│  │ (7 routes)  │→ │  (reusable)  │                  │
│  └──────┬──────┘  └──────┬───────┘                  │
│         │                │                          │
│         └───────┬────────┘                          │
│                 ↓                                   │
│         ┌───────────────┐                           │
│         │  Custom Hooks │  (data layer)             │
│         └───────┬───────┘                           │
│                 ↓                                   │
└─────────────────┼───────────────────────────────────┘
                  │ HTTPS + WebSocket (real-time)
                  ↓
┌─────────────────────────────────────────────────────┐
│  Supabase (backend)                                 │
│  - PostgreSQL database (7 tables)                   │
│  - Auth (email/password)                            │
│  - Row Level Security (role-based rules)            │
│  - Realtime (postgres_changes events)               │
└─────────────────────────────────────────────────────┘
```

**The key design principle:** security lives in the database, not the app.
Row Level Security (RLS) policies enforce who can read/write what — even
if the frontend has bugs, the database refuses unauthorized queries.

---

## Tech stack

- **Frontend:** React 18 + Vite + react-router-dom
- **Backend:** Supabase (hosted PostgreSQL, Auth, Realtime)
- **Translations:** react-i18next (Albanian only for now; English-ready)
- **Hosting:** Vercel (frontend) + Supabase (backend)
- **Monthly cost:** €0 on free tiers; ~€25/mo if scale requires paid plans

---

## Database schema

All tables live in the `public` schema. See `supabase/schema.sql` for the
full SQL. Quick reference:

| Table | Purpose |
|---|---|
| `staff` | Employees. Linked 1:1 to `auth.users` via `auth_user_id`. Has `role` (admin/manager/reception/cleaner) and `active` flag. |
| `rooms` | The 55 physical rooms. Primary key is a text ID like `'old-101'` (building prefix + number). Has `status` (vacant/occupied/clean/dirty/in-progress/maintenance). |
| `guests` | People who book. Separate from bookings so one guest can have multiple stays over time. |
| `bookings` | Connects a guest to a room for a date range. Has `status` (confirmed/checked-in/checked-out/cancelled), `paid` flag, `total_amount`. |
| `housekeeping_logs` | **Append-only** log of every room cleaning status change. Never updated, only inserted. Holds who did what when. |
| `minibar_products` | Catalog of items available in minibars (water, beer, etc.). Each has a current `price`. |
| `minibar_consumption` | Per-booking record of items consumed. `unit_price` is snapshotted at time of consumption so old bills stay correct if prices change later. Has `charged` flag for billing status. |

### Important relationships

- A `booking` has exactly one `guest` and one `room`
- A `room` can have many `bookings` (over time) but only one active at any moment
- `housekeeping_logs` is append-only — every status change is a new row
  (never update an existing row). This gives us a full audit trail.
- `minibar_consumption.unit_price` is a price snapshot — if beer goes
  from €6 to €7 next year, old bills stay at €6 per unit.

### Room ID format

Because the hotel has old + new buildings with overlapping numbering,
room IDs are `building-number`:

- `old-101` → Room 101 in the old building
- `new-101` → Room 101 in the new building (doesn't yet exist but ready)

The `number` column stores just `'101'` — that's what staff see. The `id`
is for the database.

---

## Row Level Security (RLS) policies

RLS rules are the single most important security layer. Every query is
filtered based on the logged-in user's role. See `supabase/policies.sql`.

Summary by role:

| Role | Rooms | Bookings | Guests | Housekeeping | Minibar | Staff |
|---|---|---|---|---|---|---|
| **Admin** | Full | Full | Full | Full | Full | Full |
| **Manager** | Full | Full | Full | Full | Full | Read |
| **Reception** | Full | Full | Full | Read | Full | — |
| **Cleaner** | Read + Update status | — | — | Full (own logs) | Read products only | — |

Two helper SQL functions power this:
- `current_user_role()` → returns the role of the logged-in user
- `current_staff_id()` → returns the staff.id of the logged-in user

---

## Project structure

```
hotel-centrum/
├── public/
│   ├── logoC.png              # Hotel logo (favicon + sidebar)
│   └── ... static assets
├── src/
│   ├── components/            # Reusable UI
│   │   ├── Badge.jsx          # Status pill (room/booking/payment)
│   │   ├── BookingDetailPanel.jsx
│   │   ├── BottomNav.jsx      # Mobile bottom navigation
│   │   ├── Layout.jsx         # Shell wrapper (sidebar + topbar + outlet)
│   │   ├── MobileTopBar.jsx
│   │   ├── NewBookingModal.jsx
│   │   ├── Sidebar.jsx        # Desktop sidebar
│   │   └── TopBar.jsx         # Desktop topbar
│   ├── config/
│   │   └── navigation.js      # Nav items + role access control
│   ├── context/
│   │   └── AuthContext.jsx    # Auth + staff state across the app
│   ├── hooks/                 # Data access + business logic
│   │   ├── useBookings.js
│   │   ├── useHousekeeping.js
│   │   ├── useMinibar.js
│   │   ├── useMobile.js       # Responsive breakpoint detection
│   │   └── useRooms.js
│   ├── i18n/
│   │   ├── index.js           # i18next setup
│   │   └── sq.js              # Albanian translations
│   ├── pages/                 # One file per route
│   │   ├── Bookings.jsx
│   │   ├── Calendar.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Housekeeping.jsx
│   │   ├── Login.jsx
│   │   ├── Minibar.jsx
│   │   ├── Reports.jsx
│   │   └── Staff.jsx
│   ├── App.jsx                # Router + route guards
│   ├── main.jsx               # Entry point
│   ├── index.css              # Global styles + CSS variables
│   └── supabase.js            # Supabase client setup
├── .env                       # SECRETS — never commit this
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

---

## How the app boots

1. `index.html` loads `src/main.jsx`
2. `main.jsx` loads CSS, i18n, and renders `<App />`
3. `App.jsx` wraps everything in `<AuthProvider>` which reads the current
   Supabase session and loads the logged-in user's `staff` record (with role)
4. If not logged in → `<Login />` page
5. If logged in → `<BrowserRouter>` with routes guarded by `<ProtectedRoute>`,
   which checks the staff role against `ROLE_ACCESS` in `config/navigation.js`
6. Every page accesses data via custom hooks (in `src/hooks/`)
7. Hooks subscribe to Supabase realtime channels so data auto-refreshes
   when changes happen in other tabs/devices

---

## Where to change things (cookbook)

### I want to change brand colors

Edit `src/index.css`, the `:root` block. These CSS variables are used
app-wide:

```css
:root {
  --sidebar: #0f172a;      /* sidebar background */
  --sidebar-active: ...;   /* highlighted nav item */
  --accent: #10b981;       /* primary buttons, active states */
  --accent-dark: #059669;  /* button hover */
  --danger: #ef4444;       /* destructive actions */
  --success: #22c55e;      /* paid/clean badges */
  --warning: #f59e0b;      /* pending/dirty badges */
  /* ... */
}
```

**Heads up:** a few files still hardcode `#6ee7b7` (mint) and `#10b981`
(green) for the active-nav text. Change those too if you rebrand:
- `src/components/Sidebar.jsx` (nav item color when active)
- `src/components/BottomNav.jsx` (nav item color when active, in 2 places)

### I want to change the logo

1. Drop your PNG/SVG in `public/` (any name, e.g. `logoC.png`)
2. Update the favicon in `index.html`: `<link rel="icon" href="/YOURFILE.png" />`
3. Update the sidebar logo in `src/components/Sidebar.jsx` (the `<img src="...">`)
4. Update the login page logo in `src/pages/Login.jsx` (the `<img src="...">`)

### I want to add or change a translation

All Albanian strings live in **one file:** `src/i18n/sq.js`.

- To **change a word**: find the key in `sq.js` and edit the value. Every
  page that uses that key updates instantly.
- To **add a new translation**: add a new key to `sq.js`, then reference
  it in your component with `t('section.keyname')`.
- To **add English** later: create `src/i18n/en.js` with the same structure,
  register it in `src/i18n/index.js`, and add a language picker UI.

Every component that uses translation must:
1. `import { useTranslation } from 'react-i18next'`
2. `const { t } = useTranslation()` as the first line inside the function
3. Use `t('section.key')` where text appears

### I want to add a new page

1. Create the page file in `src/pages/MyNewPage.jsx`
2. Add it to `src/config/navigation.js`:
   - Add an entry to `NAV_ITEMS` (key, label, icon, path)
   - Add the key to the `ROLE_ACCESS` arrays for roles that should see it
3. Register the route in `src/App.jsx` inside the `<Routes>` block:
   ```jsx
   <Route path="mynewpage" element={
     <ProtectedRoute pageKey="mynewpage"><MyNewPage /></ProtectedRoute>
   } />
   ```
4. Add a translation key for the nav label in `src/i18n/sq.js` under `nav`

### I want to add a new room

Two ways:

**Via Supabase UI (easiest for one-off):**
1. Open Supabase → Table Editor → `rooms`
2. Click "Insert row"
3. Fill in: `id` (like `new-105`), `number` (`'105'`), `floor`, `type`,
   `beds`, `building` (`'new'` or `'old'`), `status`
4. The room appears in the app within seconds (realtime sync)

**Via SQL (for bulk inserts):**
Run something like:
```sql
INSERT INTO rooms (id, number, floor, type, beds, building, status) VALUES
  ('new-101', '101', 1, 'Standard', 2, 'new', 'clean'),
  ('new-102', '102', 1, 'Standard', 2, 'new', 'clean');
```

### I want to add a new minibar product

1. Supabase → Table Editor → `minibar_products` → Insert row
2. Fill in: `id` (short slug like `beer-ipa`), `name`, `price`, `active: true`
3. Appears in the app instantly

### I want to change minibar prices

1. Edit the `price` in `minibar_products`
2. **Existing bills stay at old prices** (because `minibar_consumption`
   snapshots `unit_price` at time of consumption). Only new consumption
   uses the new price.

### I want to add a new user / staff member

Because of security restrictions, this is a 2-step process:

1. **Create the auth user** in Supabase → Authentication → Users → "Add user"
   - Use their real email
   - Set a strong password (they can change later)
   - Check "Auto Confirm User"
2. **Link them to a staff record** (two options):
   - **Easy:** they'll appear automatically in the Staff page — admin can
     then assign their role. (Actually, for this to work, a trigger or
     manual insert is needed; currently we insert via SQL.)
   - **Manual:** run SQL:
     ```sql
     INSERT INTO staff (auth_user_id, name, email, role)
     SELECT id, 'Their Name', email, 'reception'
     FROM auth.users WHERE email = 'their@email.com';
     ```

**Future improvement:** an Edge Function that lets admins create users
directly from the Staff page. ~30 min of work when needed.

### I want to add a new role

Roles are hardcoded in a few places. To add, say, a "maintenance" role:

1. **Database constraint:** remove and re-add the check constraint
   on `staff.role`:
   ```sql
   ALTER TABLE staff DROP CONSTRAINT staff_role_check;
   ALTER TABLE staff ADD CONSTRAINT staff_role_check
     CHECK (role IN ('admin','manager','reception','cleaner','maintenance'));
   ```
2. **RLS policies:** add the new role to the relevant policies (or create
   new ones for what maintenance can access)
3. **Frontend config:** in `src/config/navigation.js`, add `maintenance`
   to `ROLE_ACCESS` and `ROLE_BADGE_COLORS`
4. **Translations:** add `maintenance: 'Mirëmbajtje'` under `roles` in `sq.js`

---

## Common tasks (cheat sheet)

| Task | Where |
|---|---|
| Change a button color | `src/index.css` → `--accent` |
| Change a translation | `src/i18n/sq.js` |
| Add a new room | Supabase → `rooms` table |
| Change a minibar price | Supabase → `minibar_products` table |
| Hide a page from a role | `src/config/navigation.js` → `ROLE_ACCESS` |
| Change "default date range" on calendar | `src/pages/Calendar.jsx` → `DAYS_VISIBLE` |
| Change breakpoint where mobile kicks in | `src/hooks/useMobile.js` → `BREAKPOINT` |
| Change hotel name in browser tab | `index.html` → `<title>` |
| Change hotel name in sidebar | `src/i18n/sq.js` → `layout.systemName` |
| Change minibar "needs attention" threshold | (not configurable; update if needed) |
| Update favicon | `public/logoC.png` + `index.html` link tag |

---

## Running the app locally

```bash
# First time
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

The `.env` file must contain:
```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Never commit `.env`.** It's already in `.gitignore`.

---

## Deploying to Vercel

1. Push the code to GitHub
2. In Vercel, import the GitHub repo
3. Add environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. Every push to main auto-deploys.

---

## Pre-launch checklist

Before going live at Hotel Centrum:

- [ ] Replace all `*@centrum.test` users with real staff emails
- [ ] Re-enable "Confirm email" in Supabase Auth settings
- [ ] Review RLS policies in Supabase (should all be ON)
- [ ] Verify realtime is enabled on all 6 tables we subscribe to
- [ ] Set strong passwords for all staff (force first-login reset)
- [ ] Export a database backup (Supabase dashboard → Database → Backups)
- [ ] Run through each module end-to-end as each role, on desktop and mobile
- [ ] Verify the logo displays on all pages
- [ ] Train staff: 30 min per role, with live app access
- [ ] Print a 1-page cheat sheet per role (common tasks)
- [ ] Set up a feedback channel (WhatsApp group? paper log?) for the first week
- [ ] Keep the old paper/spreadsheet system running in parallel for 1 week

---

## Known limitations (by design, v1)

- **Online-only.** No offline support. Hotels with unreliable wifi should
  plan for this.
- **Single payment flag.** Not full accounting — no partial payments,
  no refunds, no deposits, no currency other than EUR.
- **No Booking.com sync.** Bookings entered manually.
- **No fiscal printer integration.** Receipts and Kosovo tax compliance
  handled outside the app.
- **Creating users requires Supabase dashboard access.** No in-app user
  creation (security restriction).
- **Mobile bottom nav limited to 5 items.** Admin/manager have 7 pages;
  Reports and Staff live under the "More" menu on mobile.

---

## Future improvements roadmap

Ordered by probable value vs. effort:

1. **English language** (1 day) — add `src/i18n/en.js`, add language picker
2. **Print-friendly bill / invoice view** (1 day) — for guest checkout
3. **Edge Function to create users from Staff page** (½ day)
4. **Booking.com iCal sync** (2-3 days) — import reservations automatically
5. **Room photos on the Dashboard** (½ day) — show a photo per room
6. **Proper invoicing** (1 week) — invoice numbers, Kosovo tax compliance,
   PDF export
7. **Offline support (read-only)** (1-2 weeks) — service worker caching
8. **Multi-hotel support** (2-3 weeks) — turn into SaaS for other hotels
9. **Guest portal** (1 month+) — let guests self-check-in via QR code

---

## Troubleshooting

### Page goes blank after a change
→ Open DevTools (F12) → Console tab → look at the red error. Most likely
you added `t(...)` in a component without importing `useTranslation`
and creating `const { t } = useTranslation()`.

### Real-time sync stops working
→ Supabase → Database → Replication → make sure these tables are enabled
in the `supabase_realtime` publication: `rooms`, `bookings`, `guests`,
`housekeeping_logs`, `minibar_consumption`, `staff`.

### A user can't log in
→ Supabase → Authentication → Users. Verify:
1. User exists (not deleted)
2. "Auto Confirm User" was checked when created (otherwise they need email verification)
3. There's a matching `staff` row with `auth_user_id` pointing to that user's ID

### "Loading your access..." forever
→ The logged-in auth user has no matching `staff` record. Fix by linking:
```sql
INSERT INTO staff (auth_user_id, name, email, role)
SELECT id, 'Their Name', email, 'reception'
FROM auth.users WHERE email = 'the-email@centrum.test';
```

### A page shows "undefined" in the URL
→ A `<ProtectedRoute>` redirect is firing before the staff record loaded.
Fixed in the current codebase but if it happens again, check
`src/App.jsx` `ProtectedRoute` function for the `if (!staff) return <Loading>` guard.

### Changes to `public/` files don't show up
→ Restart the dev server (Ctrl+C, then `npm run dev`). Vite sometimes
misses changes in `public/`.

---

## Contact & ownership

- **Built by:** Edi (brand strategist, Casper Go)
- **Built with:** Claude (Anthropic)
- **For:** Hotel Centrum, Pristina, Kosovo
- **Backend:** Supabase project — see dashboard for admin access
- **Hosting:** Vercel — see dashboard for deploys and logs

---

_Last updated: see git log._
