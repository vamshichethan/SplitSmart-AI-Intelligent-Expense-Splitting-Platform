import { LogIn, Sparkles, UserPlus } from "lucide-react";
import { useState } from "react";
import { login, register } from "../services/api";

export function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "Vamshi",
    email: "vamshi@example.com",
    password: "password123"
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const session =
        mode === "login"
          ? await login({ email: form.email, password: form.password })
          : await register(form);
      onAuthenticated(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <div className="brand-lockup">
          <div className="brand-mark">S</div>
          <div>
            <strong>SplitSmart AI</strong>
            <span>Secure group spending workspace</span>
          </div>
        </div>
        <div>
          <p>Demo account</p>
          <h1>Track bills, balances, disputes, and settlements behind a real session.</h1>
        </div>
        <div className="auth-highlights">
          <span>JWT session</span>
          <span>Protected API</span>
          <span>Receipt AI mock</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-mode">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
            <LogIn size={18} />
            Login
          </button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">
            <UserPlus size={18} />
            Register
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === "register" ? (
            <label>
              Name
              <input name="name" value={form.name} onChange={updateField} />
            </label>
          ) : null}
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={updateField} />
          </label>
          <label>
            Password
            <input name="password" type="password" value={form.password} onChange={updateField} />
          </label>

          {error ? <div className="error-banner">{error}</div> : null}

          <button className="primary-button auth-submit" type="submit" disabled={isSubmitting}>
            <Sparkles size={18} />
            {isSubmitting ? "Checking..." : mode === "login" ? "Enter dashboard" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}
