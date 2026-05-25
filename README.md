# Vara Silvers — Desktop Jewelry Software

**Version:** 2.5.0  
**Stack:** Electron + Node.js + PostgreSQL  
**Local URL (always):** `http://localhost:3001`

---

## Quick command reference

| Situation | Command |
|-----------|---------|
| Develop / edit code | `npm run desktop` |
| Build installer | `npm run dist:fresh` |
| Copy `.env` to AppData | `npm run copy-env-appdata` |
| Test unpacked app | `& "build-out\win-unpacked\Vara Silvers.exe"` |
| Install on client | Run `build-out\Vara Silvers-Setup-2.5.0.exe` |
| Change master admin password | `npm run change-master-password` |
| Kill stuck app | `taskkill /F /IM "Vara Silvers.exe"` |

---

## Is there a “master template” vs Vara Silvers?

**No.** This repo **is** Vara Silvers. There is only one codebase. You develop here, build here, deploy here.

---

## Database: your laptop vs client PC

**Yes — your understanding is correct.**

| Machine | Database | `.env` points to |
|---------|----------|----------------|
| **Your laptop (testing)** | `jewelry_varasilvers` (or `jewelry_varasilvers_test`) | Your PostgreSQL on your PC |
| **Client PC (production)** | `jewelry_varasilvers` on **their** PostgreSQL | Client `.env` on their PC |

Data **never mixes** because:
- Each PC has its **own PostgreSQL**
- Each PC has its **own `.env`** in `%APPDATA%\Vara Silvers\.env`
- App updates replace **code only**, not the database

### Your current test database (OK to use)

```env
DATABASE_URL=postgresql://postgres:123456@localhost:5432/jewelry_varasilvers?sslmode=disable
```

This is fine for development on your laptop.

**Recommended:** use a separate test DB so experiments never touch real data:

```sql
CREATE DATABASE jewelry_varasilvers_test;
```

```env
DATABASE_URL=postgresql://postgres:123456@localhost:5432/jewelry_varasilvers_test?sslmode=disable
```

Client USB `.env` uses **their** password and **their** machine — completely separate.

---

## Where to test (3 stages)

| Stage | How | URL | When |
|-------|-----|-----|------|
| **1. Dev** | `npm run desktop` | `http://localhost:3001` | Every code change — fastest, full logs in terminal |
| **2. Packaged test** | `build-out\win-unpacked\Vara Silvers.exe` | Same localhost | Before giving installer to client |
| **3. Client production** | Desktop shortcut | Same localhost | Client daily use |

### Stage 1 — Daily development (use this most)

```powershell
cd D:\GauravSoftwares_Clients\VaraSilvers
npm run desktop
```

- Opens Electron + server
- Terminal shows all logs (errors, SQL, API)
- Press **F12** in app → Console for frontend errors
- Health check: open `http://localhost:3001/api/health`

### Stage 2 — Test like a client (before visit)

```powershell
taskkill /F /IM "Vara Silvers.exe" 2>$null
npm run dist:fresh
npm run copy-env-appdata
& "build-out\win-unpacked\Vara Silvers.exe"
```

### Stage 3 — Client install

See [Client installation](#client-installation-full-steps) below.

---

## Your workflow when adding a new feature

```
1. Edit code
2. npm run desktop          → test at localhost:3001
3. npm run dist:fresh       → build new installer
4. Test build-out\win-unpacked\Vara Silvers.exe
5. Copy build-out\Vara Silvers-Setup-2.5.0.exe to USB
6. Client runs installer (upgrade)
7. If DB schema changed → run migration on client (see below)
```

You **do not** recopy `.env` on code updates unless passwords/secrets changed.

---

## Login system (password-first, no Google required)

| Login type | Username field | Password stored in | API |
|------------|----------------|-------------------|-----|
| **Master admin** | `Gaurav` | `admin_users.password_hash` | `POST /api/auth/login` |
| **Staff user** | Email address | `users.password` | `POST /api/auth/login` |

| Consistent name | Meaning |
|----------------|---------|
| `username` | Login form + API body |
| `password` | Login form + API body |
| `jp.sid` | Session cookie (automatic) |
| `isAuthenticated` | `GET /api/auth/current_user` |
| `role` | `admin`, `super_admin`, or `employee` |
| `allowed_tabs` / `allowedTabs` | Module permissions |
| `account_status` | Must be `active` to use app |

**Google OAuth is optional.** Leave `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` blank in `.env` for password-only shops.

### First login (your laptop or client)

- **Username:** `Gaurav`
- **Password:** set during `npm run setup-db`, or change with:
  - In app: **Change Password** button (header, admin only)
  - Terminal: `npm run change-master-password`

### Add staff users

1. Login as admin (`Gaurav`)
2. **Manage Users** → **Add User**
3. Enter email, name, role, **password** (min 6 chars), module permissions
4. Staff login with **email + password**

---

## How to know if something works / is broken

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Button does nothing | Not logged in as admin | Logout → login as `Gaurav` |
| API 401 in F12 console | Session expired | Logout → login again |
| API 403 | Not admin role | Login as master admin |
| Add User fails | Old build or missing password | Rebuild + reinstall; enter password min 6 chars |
| App won't start | Missing `.env` | `npm run copy-env-appdata` |
| Port in use | Old process running | `taskkill /F /IM "Vara Silvers.exe"` |

### Debug checklist

1. `http://localhost:3001/api/health` → `{ "status": "ok" }`
2. Login → F12 → Network → calls return 200 not 401
3. **Manage Users** → Add User → appears in list
4. PostgreSQL running (Services → postgresql)

---

## Build the installer

```powershell
cd D:\GauravSoftwares_Clients\VaraSilvers
taskkill /F /IM "Vara Silvers.exe" 2>$null
npm run dist:fresh
```

Output:
- `build-out\Vara Silvers-Setup-2.5.0.exe` — client installer
- `build-out\win-unpacked\` — test without installing

If build fails with `app.asar` locked: close File Explorer on `dist/` / `build-out/`, kill app, retry.

---

## Client installation (full steps)

### USB folder

| File | Purpose |
|------|---------|
| `Vara Silvers-Setup-2.5.0.exe` | App installer |
| `postgresql-installer.exe` | From postgresql.org/download/windows |
| `.env` | Pre-configured for client |
| `setup.bat` | Optional (`deploy/setup.bat`) |

### Step 1 — Install PostgreSQL on client PC

1. Run `postgresql-installer.exe`
2. Set postgres password (write it down)
3. Port **5432**
4. Service **postgresql** must be running

### Step 2 — Create client database

```sql
CREATE DATABASE jewelry_varasilvers;
```

Or: `npm run setup-db` (uses client `.env`).

### Step 3 — Client `.env`

```env
PORT=3001
NODE_ENV=production
COMPANY_NAME="Vara Silvers"
APP_TAGLINE="Estimations & Inventory"

DATABASE_URL=postgresql://postgres:CLIENT_PASSWORD@localhost:5432/jewelry_varasilvers?sslmode=disable
DB_USER=postgres
DB_PASSWORD=CLIENT_PASSWORD
DB_NAME=jewelry_varasilvers

CLIENT_URL=http://localhost:3001
SESSION_SECRET=long_random_string_at_least_32_chars

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SUPER_ADMIN_EMAIL=jaigaurav56789@gmail.com
```

### Step 4 — Install app + copy `.env`

```powershell
# Run installer
Start-Process "E:\VaraSilvers-Deploy\Vara Silvers-Setup-2.5.0.exe"

# Copy .env (on client PC — adjust source path)
$envDest = "$env:APPDATA\Vara Silvers\.env"
New-Item -ItemType Directory -Force -Path (Split-Path $envDest) | Out-Null
Copy-Item "E:\VaraSilvers-Deploy\.env" $envDest -Force
```

Or from your dev project (copies to both AppData paths):

```powershell
npm run copy-env-appdata
```

### Step 5 — Hand over to client

1. Desktop shortcut → login **Gaurav** + temporary password
2. Client clicks **Change Password** in header
3. Add staff via **Manage Users**

---

## Updating client software

### Method A — USB installer (recommended today)

1. You: `npm run dist:fresh`
2. Copy new `build-out\Vara Silvers-Setup-2.5.0.exe` to USB
3. Client: run installer (upgrade — keeps `.env` + database)
4. **Do not** overwrite client `.env`

### Method B — In-app “Update Software” button

- Visible in mobile settings / admin menu
- Calls `POST /api/update-software` (runs server-side update script)
- **Requires GitHub releases** to be published first
- Until you publish releases, ignore “No published versions on GitHub” in logs

### Method C — GitHub auto-update (future)

```powershell
$env:GH_TOKEN="your_github_token"
npm run dist:fresh -- --publish always
```

Then in-app updater checks GitHub automatically.

---

## Database migrations on client PC

Most schema changes auto-run when the app starts (`initDatabase` in `config/database.js`).

If you add a **manual migration file** in `migrations/`:

1. Connect via UltraViewer / TeamViewer
2. Open PowerShell in project folder OR use pgAdmin
3. Run:

```powershell
npm run migrate
```

Or run SQL directly in pgAdmin against client's `jewelry_varasilvers` database.

**Rule:** test migration on your laptop first, then run same on client.

---

## `.env` file rules

- **One real `.env`** in project root (never commit to git)
- **`.env.example`** is optional reference only — not needed on client PC
- Client needs `.env` **once** in `%APPDATA%\Vara Silvers\.env`
- App updates do **not** delete `.env`

Copy commands:

```powershell
# After build (testing)
npm run copy-env-appdata

# Manual
Copy-Item .env "$env:APPDATA\Vara Silvers\.env" -Force
Copy-Item .env "build-out\win-unpacked\.env" -Force
```

---

## Developer SQL snippets

```powershell
psql "postgresql://postgres:123456@localhost:5432/jewelry_varasilvers?sslmode=disable"

UPDATE products SET is_web_synced = false;
```

---

## License

Proprietary — Gaurav Softwares
