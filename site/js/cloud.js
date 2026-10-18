// Optional Google sign-in and cloud save through Firebase (free Spark plan).
// If js/firebase-config.js has no config, the site runs in local-only mode.

import { FIREBASE_CONFIG } from "./firebase-config.js";

const V = "10.12.2";
const CDN = `https://www.gstatic.com/firebasejs/${V}`;

export const cloudConfigured = () => !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey);

export async function startCloud({ onUser }) {
  if (!cloudConfigured()) return null;
  const [{ initializeApp }, authMod, fsMod] = await Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-firestore.js`),
  ]);
  const { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } = authMod;
  const { getFirestore, doc, getDoc, setDoc } = fsMod;
  const app = initializeApp(FIREBASE_CONFIG);
  const auth = getAuth(app);
  const db = getFirestore(app);
  getRedirectResult(auth).catch(() => {});

  let user = null;
  const api = {
    get user() { return user; },
    async signIn() {
      const provider = new GoogleAuthProvider();
      try { await signInWithPopup(auth, provider); }
      catch (e) {
        // Popups are often blocked on iPad; fall back to a full-page redirect.
        if (e && /popup/i.test(e.code || "")) await signInWithRedirect(auth, provider);
        else throw e;
      }
    },
    signOut: () => signOut(auth),
    async pull() {
      if (!user) return null;
      const snap = await getDoc(doc(db, "users", user.uid));
      return snap.exists() ? JSON.parse(snap.data().progress) : null;
    },
    async push(state) {
      if (!user) return;
      await setDoc(doc(db, "users", user.uid), { progress: JSON.stringify(state), updatedAt: state.updatedAt });
    },
  };
  onAuthStateChanged(auth, (u) => { user = u; onUser(u, api); });
  return api;
}
