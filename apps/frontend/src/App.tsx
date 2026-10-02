import { useEffect, useState } from "react";
import { fetchMe, logout, type Me } from "./api.js";
import { LoginPage } from "./pages/LoginPage.js";
import { SetPasswordPage } from "./pages/SetPasswordPage.js";
import { TimeTrackingPage } from "./pages/TimeTrackingPage.js";

export function App() {
  const setPasswordToken = new URLSearchParams(window.location.search).get("token");
  const isSetPasswordRoute = window.location.pathname === "/set-password" && setPasswordToken;

  const [me, setMe] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    if (isSetPasswordRoute) return;
    void fetchMe().then(setMe);
  }, [isSetPasswordRoute]);

  if (isSetPasswordRoute) return <SetPasswordPage token={setPasswordToken} />;
  if (me === undefined) return <main className="auth-shell" />;
  if (me === null) return <LoginPage onLoggedIn={setMe} />;

  async function handleLogout() {
    await logout();
    setMe(null);
  }

  const today = new Date().toISOString().slice(0, 10);
  return <main>
    <header><div><p className="eyebrow">ARBEITSZEITNACHWEIS</p><h1>Willkommen, {me.name}.</h1><p className="date">{new Date(`${today}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</p></div><div className="header-actions"><div className="avatar">{me.name.slice(0, 2).toUpperCase()}</div><button className="link-button" onClick={() => void handleLogout()}>Abmelden</button></div></header>
    <TimeTrackingPage userId={me.id} />
  </main>;
}