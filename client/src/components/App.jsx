import { useEffect, useState } from "react";
import { clearSession, getCurrentUser, getStoredSession } from "../services/api";
import { AuthScreen } from "./AuthScreen";
import { Dashboard } from "./Dashboard";

export function App() {
  const [session, setSession] = useState(() => getStoredSession());
  const [isChecking, setIsChecking] = useState(Boolean(session));

  useEffect(() => {
    if (!session) return;

    getCurrentUser()
      .then(({ user }) => setSession((current) => ({ ...current, user })))
      .catch(() => {
        clearSession();
        setSession(null);
      })
      .finally(() => setIsChecking(false));
  }, []);

  function logout() {
    clearSession();
    setSession(null);
  }

  if (isChecking) {
    return (
      <main className="loading-screen">
        <span>Checking session...</span>
      </main>
    );
  }

  if (!session) {
    return <AuthScreen onAuthenticated={setSession} />;
  }

  return <Dashboard session={session} onLogout={logout} />;
}
