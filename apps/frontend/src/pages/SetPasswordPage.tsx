import { useState } from "react";
import { setPassword } from "../api.js";

export function SetPasswordPage({ token }: { token: string }) {
  const [password, setPasswordValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) { setError("Die Passwörter stimmen nicht überein."); return; }
    setBusy(true);
    try { await setPassword(token, password); setDone(true); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  return <main className="auth-shell">
    <section className="panel auth-panel">
      <p className="eyebrow">ARBEITSZEITNACHWEIS</p>
      <h1>Passwort festlegen</h1>
      {done
        ? <p className="hint">Dein Passwort wurde gespeichert. Du kannst dich jetzt <a href="/">anmelden</a>.</p>
        : <form onSubmit={submit} className="auth-form">
            <label>Neues Passwort<input type="password" required minLength={8} value={password} onChange={(event) => setPasswordValue(event.target.value)} /></label>
            <label>Passwort bestätigen<input type="password" required minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label>
            {error && <p className="error">{error}</p>}
            <button className="button" type="submit" disabled={busy}>Passwort speichern</button>
          </form>}
    </section>
  </main>;
}
