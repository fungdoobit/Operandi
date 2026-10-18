# Putting Operandi online (Vercel + Firebase)

Both steps are free. Do part 1 first: the site works without part 2, it just keeps progress in one browser.

## Part 1: Vercel (about 3 minutes)

1. Go to https://vercel.com and sign in with GitHub (the same account as your EMT hub).
2. Click **Add New… → Project**.
3. Find **operandi** in the list and click **Import**.
   - If it isn't listed, click **Adjust GitHub App Permissions** and give Vercel access to the repo.
4. On the settings screen:
   - **Framework Preset:** Other
   - **Root Directory:** click Edit and choose **site**
   - Leave Build and Output settings empty. The site is plain HTML/CSS/JS and has no build step.
5. Click **Deploy**. After about a minute you get a link like `operandi-xxxx.vercel.app`.

From now on, every push to `main` updates the site automatically.

## Part 2: Firebase, for sign-in and sync (about 10 minutes)

This lets your laptop, desktop and iPad share progress.

### Create the project
1. Go to https://console.firebase.google.com and click **Create a project**.
2. Name it `operandi`. You can turn Google Analytics off; it isn't needed.
3. Stay on the free **Spark** plan. Don't upgrade to Blaze.

### Turn on Google sign-in
1. Left menu: **Build → Authentication → Get started**.
2. **Sign-in method** tab → **Google** → Enable → choose your email as the support email → Save.
3. **Settings** tab → **Authorized domains** → **Add domain**. Add your Vercel domain, e.g. `operandi-xxxx.vercel.app` (no https://).

### Create the database
1. Left menu: **Build → Firestore Database → Create database**.
2. Pick a location near you, e.g. `asia-southeast1` (Singapore).
3. Start in **production mode**.
4. Open the **Rules** tab, replace everything with the contents of `firestore.rules` from this repo, and click **Publish**.
   - These rules mean each signed-in person can only read and write their own progress.

### Connect the site
1. Click the gear icon → **Project settings** → **General**. Scroll to **Your apps** and click the **</>** (Web) icon.
2. Name it `operandi-web`. Don't tick Firebase Hosting. Click **Register app**.
3. You'll see a `firebaseConfig = { apiKey: ..., authDomain: ..., ... }` block. Copy it.
4. Send it to Claude in a session, or paste it yourself into `site/js/firebase-config.js`:
   ```js
   export const FIREBASE_CONFIG = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "...",
   };
   ```
   This config is not a secret. Firebase web configs are meant to be public; the Firestore rules are what protect your data.
5. Push. Vercel redeploys, and a **Sign in with Google** button appears top right.

## Checking it worked
- Sign in on your laptop and pass a lesson.
- Open the site on your iPad, sign in with the same Google account, and the lesson shows as done.
