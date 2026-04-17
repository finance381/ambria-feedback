# Ambria Cuisines — Guest Feedback

A tablet-based guest feedback capture system for Ambria Cuisines.

- Sales reps log in once per shift on a tablet
- Hand tablet to guest, guest fills 3-step form
- Review saved to Google Sheet
- Admins view all reviews, manage venues and users

**Stack:** React + Vite · Google Apps Script · Google Sheets

---

## One-Time Setup

### 1. Google Sheet + Apps Script backend

1. Create a new Google Sheet. Name it whatever.
2. `Extensions → Apps Script`. Delete the default code.
3. Paste the contents of `Code.gs` from this repo.
4. Change `TOKEN_SECRET` at the top to a long random string. **Set once, never change it** — changing it invalidates all existing passwords and sessions.
5. In `seedFirstAdmin()` at the bottom, change the default password from `changeme123`.
6. Save. From the function dropdown pick `seedFirstAdmin` → Run. Grant permissions.
7. Check the sheet — three tabs auto-created (`Users`, `Venues`, `Reviews`) with headers, plus one admin row.
8. `Deploy → New deployment → Web app`. Execute as **Me**. Access **Anyone**. Copy the `/exec` URL.

### 2. Local dev

```powershell
npm install
Copy-Item .env.example .env
# Edit .env — paste your /exec URL into VITE_SCRIPT_URL
npm run dev
```

Open `http://localhost:5173`. Log in with the admin credentials from step 6.

### 3. First-time admin tasks

Log in as admin and:

1. **Venues tab** — add your venue list
2. **Users tab** — add sales users (role: `sales`)
3. Share credentials with sales team

---

## Deploying to GitHub Pages

1. Create a new GitHub repo. Push this code.
2. Repo `Settings → Pages → Source: GitHub Actions`.
3. Repo `Settings → Secrets and variables → Actions → New repository secret`:
   - Name: `VITE_SCRIPT_URL`
   - Value: your Apps Script `/exec` URL
4. Edit `vite.config.js` — change `base: '/ambria-feedback/'` to match your repo name.
5. Push to `main`. Actions workflow builds and deploys automatically.

Live URL: `https://<your-username>.github.io/<repo-name>/`

---

## Tablet Deployment (Android)

Each tablet, one-time:

1. Open Chrome → go to the live URL
2. Menu → **Add to Home Screen**
3. Launch from the home screen icon (runs in standalone mode, no address bar)
4. Sales user logs in
5. `Settings → Security → Screen pinning` → enable it, set a PIN
6. Open the app → recent apps → tap pin icon
7. To exit: hold Back + Recents, enter PIN

The guest cannot exit the app. Sales can unpin at end of shift with the PIN.

---

## App Flow

```
Sales login
    │
    ▼
/capture  ── "Hand tablet to guest" + [Start Review]  ◄────┐
    │                                                       │
    ▼                                                       │
/guest (kiosk locked)                                       │
  Step 1: name, mobile, email (opt), date, venue            │
  Step 2: 4 ratings + remarks                               │
  Step 3: Thank you  ──────── auto-return 3.5s ────────────┘

Admin login
    │
    ▼
/admin
  Tab: Reviews (filters, CSV export)
  Tab: Venues  (add / rename / activate / deactivate)
  Tab: Users   (add / edit / reset password / deactivate)
```

---

## Project Structure

```
.
├── Code.gs                           Apps Script backend — paste into Google Sheet
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── .github/workflows/deploy.yml      GitHub Pages CI
├── public/
│   └── manifest.webmanifest          PWA (Add to Home Screen)
└── src/
    ├── main.jsx                      Entry
    ├── App.jsx                       Root router + auth guard
    ├── styles.css                    All styles (Ambria design tokens)
    ├── lib/
    │   ├── api.js                    postToSheet + all action wrappers
    │   └── router.js                 Hash-based router (GH Pages safe)
    ├── hooks/
    │   ├── useAuth.js                sessionStorage-backed auth
    │   └── useKioskLock.js           Fullscreen + back-button trap
    └── modules/
        ├── auth/LoginScreen.jsx
        ├── sales/CaptureIntro.jsx    Between-guests screen
        ├── sales/GuestForm.jsx       3-step kiosk-locked form
        └── admin/
            ├── AdminShell.jsx
            ├── ReviewsTab.jsx
            ├── VenuesTab.jsx
            └── UsersTab.jsx
```

---

## Security Notes

This is a small-team internal tool. Trusted devices. Shared Wi-Fi. Trust model is "prevent casual misuse," not "withstand a determined attacker."

What's in place:
- Passwords hashed (SHA-256, salted with `TOKEN_SECRET`)
- Signed session tokens, 12-hour TTL
- Every request re-validates user is still active — deactivating kicks them on next call
- Admin actions validate role server-side
- Self-lockout guards (can't deactivate yourself, can't remove the last admin)
- HTTPS automatic via Apps Script

What's **not** there (and would be overkill for the use case):
- Rate limiting on login
- Password reset via email
- Multi-factor auth
- Real session revocation (tokens are stateless — short TTL is the mitigation)

---

## Troubleshooting

**"Missing VITE_SCRIPT_URL" on startup**
The `.env` file is missing or wrong. Copy `.env.example` to `.env` and paste the `/exec` URL.

**Login returns "Unauthorized" immediately**
Either the password is wrong, the user is deactivated, or `TOKEN_SECRET` was changed after the user was created. Re-run `seedFirstAdmin` or reset from the Users tab.

**CORS errors in browser console**
The `Content-Type: text/plain` header is mandatory — do not change it. Apps Script blocks JSON POSTs via CORS preflight.

**Reviews not showing up**
Check the Reviews sheet tab manually. If rows are appearing there but not in the UI, hit Refresh in the admin panel (the UI doesn't auto-poll).

**"Cannot deactivate yourself" when you meant to**
Log in as a different admin, then deactivate. If no other admin exists, create one first.

**Guest can exit the form via swipe-up on tablet**
Web fullscreen doesn't block OS gestures. Enable Android Screen Pinning (see Tablet Deployment above).
