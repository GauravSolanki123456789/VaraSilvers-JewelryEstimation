Run this if u have .env changes only
.\sync-env.ps1

Run this if you want to test packaged build 
.\clean-and-build.ps1 -Run

Run this if you have code changes 
.\clean-and-build.ps1

Upgrade Start Menu App
.\clean-and-build.ps1 -Install

Send Update to remote client
1. Create GitHub token: GitHub → Settings → Developer settings → Personal access tokens → `repo` scope
2. In PowerShell (same session or set permanently):

```powershell
$env:GH_TOKEN = "ghp_your_token_here"
```

3. Client must have app **v2.5.0+** installed once (USB installer first time only)

### Every time you release a code update

```powershell
git add .
git commit -m "Your update description"
git push origin main
.\publish-release.ps1
```

## Login (password-first)

| Who | Username | Password |
|-----|----------|----------|
| Master admin | `Gaurav` | `admin_users` table — change via **Change Password** in app |
| Staff | Email | Set in **Manage Users → Add User** |

Leave `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` blank for password-only shops.

---

## Client first-time install (USB, once)

1. Install PostgreSQL on client PC
2. `CREATE DATABASE jewelry_varasilvers;`
3. Put on USB: `Vara Silvers-Setup-2.5.0.exe` + client `.env`
4. Run installer
5. Copy `.env`:

```powershell
Copy-Item "E:\VaraSilvers-Deploy\.env" "$env:APPDATA\Vara Silvers\.env" -Force
```

6. Login as `Gaurav`, change password, add staff

After that, future code updates = **GitHub publish only** (Workflow C).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Still see old company name | Run `.\sync-env.ps1`, reopen app |
| Build fails (file locked) | Close File Explorer on `build-out/`, kill app, retry `clean-and-build.ps1` |
| Port 3001 in use | `taskkill /F /IM "Vara Silvers.exe"` then `taskkill /F /IM node.exe` |
| "No published versions on GitHub" | Normal until you run `.\publish-release.ps1` once |
| Add User fails | Login as `Gaurav`, password min 6 chars |
| Wrong PowerShell command | Use `& "build-out\win-unpacked\Vara Silvers.exe"` (quotes + `&`) |

---

## Scripts in this project

| File | Purpose |
|------|---------|
| `sync-env.ps1` | `.env` only — no rebuild |
| `clean-and-build.ps1` | Kill → clean → build → copy env |
| `clean-and-build.ps1 -Run` | Also launch unpacked exe |
| `clean-and-build.ps1 -Install` | Also run installer (upgrade in place) |
| `publish-release.ps1` | Build + GitHub release for client auto-update |

---

## License

Proprietary — Gaurav Softwares
