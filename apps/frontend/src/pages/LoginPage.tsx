import { useState } from "react";
import { forgotPassword, login, type Me } from "../api.js";

export function LoginPage({ onLoggedIn }: { onLoggedIn: (me: Me) => void }) {
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitLogin(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try { onLoggedIn(await login(email, password)); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  async function submitForgot(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await forgotPassword(email);
      setMessage("Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen versendet.");
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  return <main className="auth-shell">
    <section className="panel auth-panel">
      <p className="eyebrow">ARBEITSZEITNACHWEIS</p>
      <h1>{mode === "login" ? "Anmelden" : "Passwort vergessen"}</h1>
      {mode === "login"
        ? <form onSubmit={submitLogin} className="auth-form">
            <label>E-Mail<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Passwort<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {error && <p className="error">{error}</p>}
            <button className="button" type="submit" disabled={busy}>Anmelden</button>
            <button type="button" className="link-button" onClick={() => { setMode("forgot"); setError(""); setMessage(""); }}>Passwort vergessen?</button>
          </form>
        : <form onSubmit={submitForgot} className="auth-form">
            <label>E-Mail<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            {error && <p className="error">{error}</p>}
            {message && <p className="hint">{message}</p>}
            <button className="button" type="submit" disabled={busy}>Link anfordern</button>
            <button type="button" className="link-button" onClick={() => { setMode("login"); setError(""); setMessage(""); }}>Zurück zur Anmeldung</button>
          </form>}
    </section>
  </main>;
}
