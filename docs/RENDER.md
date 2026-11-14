# Deploy Grecipe on Render (free showcase)

This setup creates two free services:

| Service | Type | Purpose |
| --- | --- | --- |
| `grecipe` | Static Site | React frontend and interactive browser demo |
| `grecipe-api` | Web Service | Google-authenticated accounts, SQLite, OCR, Spoonacular, and nutrition lookups |

The demo is fictional, local to each browser tab, and never calls the live backend or external food APIs. It has an Alex Morgan profile, a sample household, groceries, recipes, a sample receipt, and nutrition data. Visitors enter through **Try the demo**, explore Family / Inventory / Recipe, and use **Reset demo** or **Exit demo**. Demo changes survive a reload in the same tab and disappear when the demo exits or the tab closes.

## Deploy the backend first

1. Push the project changes to GitHub.
2. In Render, choose **New → Web Service** and connect `r97draco/grecipe-project`.
3. Set these fields:
   - Name: `grecipe-api` (or another available name)
   - Root directory: `server`
   - Runtime: Node
   - Plan: **Free**
   - Build command: `npm ci`
   - Start command: `npm start`
   - Health check: `/health`
4. Add environment variables in Render. Copy your own values from local `server/.env`; never commit that file.

| Variable | Value |
| --- | --- |
| `NODE_VERSION` | `24.22.3` |
| `NODE_ENV` | `production` |
| `FIREBASE_TYPE` | `service_account` |
| `FIREBASE_PROJECT_ID` | `grecipe-f4676` |
| `FIREBASE_CLIENT_EMAIL` | Service account `client_email` |
| `FIREBASE_PRIVATE_KEY` | Service account `private_key`; paste without surrounding JSON quotes. Literal `\n` escapes or real line breaks are supported. |
| `SPOONACULAR_API_KEY` | Your Spoonacular key |
| `USDA_API_KEY` | Your USDA key |
| `CLIENT_ORIGIN` | The frontend's exact public URL, e.g. `https://your-grecipe.onrender.com`; update after deploying the frontend. No trailing slash. |

5. Deploy and copy the **public HTTPS URL** of this web service. Do not use Render's internal hostname.
6. Check `<backend-url>/health`; it should return `{"status":"ok"}`.

## Deploy the frontend

1. Choose **New → Static Site**, using the same repository.
2. Set:
   - Name: `grecipe` (or another available name)
   - Root directory: `client`
   - Build command: `npm ci && npm run build`
   - Publish directory: `build`
3. Add `NODE_VERSION=24.22.3`.
4. Set `REACT_APP_API_URL` to the backend's public HTTPS URL, e.g. `https://your-grecipe-api.onrender.com`.
5. Under **Redirects/Rewrites**, add source `/*`, destination `/index.html`, action **Rewrite**. This makes direct links and refreshes work on `/family`, `/inventory`, and `/recipe`.
6. Deploy, copy the frontend URL, and update the backend's `CLIENT_ORIGIN` to exactly that URL. Render will restart the backend after environment changes.
7. If `REACT_APP_API_URL` changes later, rebuild the static site: React embeds this value at build time.

A `render.yaml` blueprint is included as an alternative. It defines the same two free services and asks for secrets / URLs rather than storing credentials. For the least confusing first deployment, create the backend and static site in the order above.

## Enable Google login on the deployed URL

1. Open Firebase Console → `grecipe-f4676` → Authentication → Settings → Authorized domains.
2. Add the frontend hostname, e.g. `your-grecipe.onrender.com` (without `https://` or a path).
3. Ensure Google is enabled under Authentication → Sign-in method.
4. Keep the current `authDomain` (`grecipe-f4676.firebaseapp.com`) and keep frontend and Admin credentials in the same Firebase project.
5. If you restricted the Firebase web API key by website referrer, add the deployed frontend URL to its allowed referrers too.

Normal Google login uses real Firebase authentication; the demo does not create a Firebase account or share a public password.

## Free-plan limitations

Render free web services spin down after inactivity and may take about a minute to wake. The browser demo on the static frontend still works independently. Real login and live receipt/recipe/nutrition requests require the backend to be awake; if a request times out during a cold start, wait for `/health` to respond and retry.

Free web services do not have persistent disks. SQLite account profiles, family membership, groceries, and cached food results can reset on restarts or redeploys. Firebase identities are separate and survive; a returning Google user can get a new empty app profile after a reset.

For durable real-user data later, use a paid web service with a persistent disk and `SQLITE_PATH=/var/data/grecipe.sqlite`, or migrate to an external persistent database. Free Render Postgres is not a permanent replacement because free database instances expire.

## Verify after deployment

- Open the frontend, enter the demo, and visit all three app pages.
- Refresh a nested route; it should still load.
- Exit demo, sign in with Google, and create a family.
- Add / save groceries, upload a real receipt, generate a recipe, and open a Nutrition popup.
- Sign out and confirm private family / inventory content is cleared.

References: [Render free services](https://render.com/docs/free), [Render persistent disks](https://render.com/docs/disks), [Render React hosting](https://render.com/docs/deploy-create-react-app), [Firebase Google sign-in](https://firebase.google.com/docs/auth/web/google-signin).
