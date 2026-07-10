/** Barrel so AuthContext can import without circular path issues. */
export {
  fetchWalletBatteries,
  getAccessToken,
  getSession,
  getUser,
  getSwimmerSupabase,
  onAuthChange,
  signInAnonymously,
  signInWithEmail,
  signOut,
} from "./swimmerAuth";
export { isSwimmerAuthConfigured as isAuthConfigured, readSwimmerBrowserEnv } from "./swimmerEnv";
