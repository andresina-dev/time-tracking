import type { User, UserProfile } from "../../../packages/shared/src/index.js";

const shellStyles = `
  <style>
    @import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap");
    :root { color: #17211f; background: #f1eee7; font-family: "DM Sans", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .panel { background: #fffdf8; border: 1px solid #e1ded5; border-radius: 4px; padding: 28px; width: 100%; max-width: 420px; }
    .eyebrow { color: #6e7c75; font: 700 11px/1 "Space Mono", monospace; letter-spacing: 1.4px; margin: 0 0 10px; }
    h1, h2 { margin: 0 0 18px; letter-spacing: -0.5px; }
    form { display: grid; gap: 14px; }
    label { display: grid; gap: 6px; font: 700 11px "Space Mono", monospace; color: #6e7c75; }
    input, select { border: 1px solid #d5d1c7; border-radius: 3px; padding: 10px; color: #17211f; background: #fffdf8; font: 14px "DM Sans", sans-serif; }
    button, .button { background: #193f38; color: #fffdf8; border: 0; border-radius: 3px; padding: 12px 15px; font: 700 12px "Space Mono", monospace; cursor: pointer; text-decoration: none; text-align: center; }
    .link-button { background: none; border: 0; color: #27765e; font: 700 12px "Space Mono", monospace; cursor: pointer; text-decoration: underline; padding: 0; }
    .error { color: #b54430; font-size: 13px; margin: 0; }
    .hint { color: #27765e; font-size: 13px; margin: 0; word-break: break-all; }
    .entry { border-top: 1px solid #e7e4dc; padding: 14px 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .entry-info { display: grid; gap: 4px; }
    .entry-info span { color: #718078; font-size: 13px; }
    .account-list { display: grid; gap: 10px; margin-top: 16px; }
    .account-option { width: 100%; background: #f7f4ee; border: 1px solid #d5d1c7; border-radius: 4px; padding: 12px 14px; text-align: left; color: #17211f; cursor: pointer; }
    .account-option.selected { border-color: #193f38; background: #eef6f3; }
    .status-pill { font: 700 10px "Space Mono", monospace; padding: 4px 8px; border-radius: 12px; white-space: nowrap; }
    .status-pill.active { background: #dce9df; color: #27765e; }
    .status-pill.pending { background: #f6e3c6; color: #9c6b16; }
    .details { margin-top: 20px; padding-top: 18px; border-top: 1px solid #e7e4dc; display: none; }
    .details.visible { display: block; }
    .month-controls { display: grid; grid-template-columns: repeat(2, minmax(120px, 1fr)); gap: 12px; margin: 18px 0; }
    .month-table { width: 100%; min-width: 1180px; table-layout: fixed; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    .month-table th, .month-table td { border: 1px solid #e7e4dc; padding: 7px 8px; text-align: left; vertical-align: middle; }
    .month-table th { background: #f7f4ee; white-space: nowrap; }
    .month-table .day-column { width: 52px; }
    .month-table .tour-column { width: 112px; }
    .month-table .time-column { width: 76px; }
    .month-table .status-column { width: 64px; }
    .month-table .total-column { width: 68px; }
    .month-table .action-column { width: 0; }
    .month-table .tour-cell { width: 112px; }
    .month-table .tour-cell input { width: 52px; min-width: 0; }
    .month-table .time-cell { width: 76px; white-space: nowrap; }
    .month-table .time-cell input { width: 58px; min-width: 0; }
    .month-table .total-cell { width: 68px; white-space: nowrap; }
    .month-table .remark-cell { min-width: 180px; }
    .month-table tr.weekend-row td { background: #f3f5f4; }
    .month-table tr.holiday-row td { background: #fff1d8; }
    .day-label { display: grid; gap: 3px; }
    .day-label small { color: #9c6b16; font: 700 9px "Space Mono", monospace; }
    .monthly-save { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 16px 0 8px; }
    .monthly-save button:disabled { background: #b8c2bd; cursor: not-allowed; }
    .month-table input, .month-table select { width: 100%; border: 1px solid #d5d1c7; border-radius: 3px; padding: 6px 8px; }
    .month-table button { background: #193f38; color: #fffdf8; border: 0; border-radius: 3px; padding: 8px 10px; font: 700 11px "Space Mono", monospace; cursor: pointer; }
    .wide { max-width: none; width: 100%; }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
    .admin-nav { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 24px; padding-bottom: 16px; border-bottom: 1px solid #e7e4dc; }
    .admin-nav a { color: #27765e; border: 1px solid #d5d1c7; border-radius: 3px; padding: 8px 11px; font: 700 11px "Space Mono", monospace; text-decoration: none; }
    .admin-nav a.active, .admin-nav a:hover { color: #fffdf8; background: #193f38; border-color: #193f38; }
    .dashboard-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 0 0 26px; }
    .profile-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .profile-form { border-top: 1px solid #e7e4dc; margin: 18px 0; padding-top: 18px; }
    .profile-panel { max-width: 760px; }
    .profile-feedback { color: #27765e; font-size: 13px; margin: 0; }
    .metric { background: #f7f4ee; border: 1px solid #e7e4dc; border-radius: 4px; padding: 14px; }
    .metric strong { display: block; font: 700 24px "Space Mono", monospace; margin-top: 8px; }
    .month-summary { width: 100%; border-collapse: collapse; margin: 16px 0 8px; }
    .month-summary th, .month-summary td { border: 1px solid #e7e4dc; padding: 10px 12px; text-align: left; }
    .month-summary th { background: #f7f4ee; font: 700 11px "Space Mono", monospace; color: #6e7c75; }
    .month-summary td { font: 700 18px "Space Mono", monospace; }
    .section { scroll-margin-top: 16px; }
    .route-hidden { display: none; }
    @media (max-width: 640px) { .dashboard-grid, .profile-grid { grid-template-columns: 1fr; } .month-table { display: block; overflow-x: auto; } }
  </style>
`;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] ?? char);
}

function shell(title: string, body: string, wide = false, panelClass = ""): string {
  return `<!doctype html>
<html lang="de">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(title)}</title>${shellStyles}</head>
<body><section class="panel${wide ? " wide" : ""}${panelClass ? ` ${panelClass}` : ""}">${body}</section></body>
</html>`;
}

export function loginPage(returnTo: string, error?: string): string {
  return shell("Anmelden", `
    <p class="eyebrow">ARBEITSZEITNACHWEIS</p>
    <h1>Anmelden</h1>
    <form id="login-form">
      <label>E-Mail<input type="email" name="email" required /></label>
      <label>Passwort<input type="password" name="password" required /></label>
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
      <button type="submit">Anmelden</button>
      <a class="link-button" href="/forgot-password">Passwort vergessen?</a>
    </form>
    <script>
      document.getElementById("login-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.target));
        data.audience = "accounts";
        const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        if (!response.ok) { location.href = "/login?error=" + encodeURIComponent((await response.json()).error ?? "Anmeldung fehlgeschlagen.") + "&returnTo=${encodeURIComponent(returnTo)}"; return; }
        location.href = ${JSON.stringify(returnTo)} || "/";
      });
    </script>
  `);
}

export function forgotPasswordPage(message?: string, error?: string): string {
  return shell("Passwort vergessen", `
    <p class="eyebrow">ARBEITSZEITNACHWEIS</p>
    <h1>Passwort vergessen</h1>
    <form id="forgot-form">
      <label>E-Mail<input type="email" name="email" required /></label>
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
      ${message ? `<p class="hint">${escapeHtml(message)}</p>` : ""}
      <button type="submit">Link anfordern</button>
      <a class="link-button" href="/login">Zurück zur Anmeldung</a>
    </form>
    <script>
      document.getElementById("forgot-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.target));
        await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        location.href = "/forgot-password?message=" + encodeURIComponent("Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen versendet.");
      });
    </script>
  `);
}

export function setPasswordPage(token: string, done = false, error?: string): string {
  if (done) {
    return shell("Passwort festlegen", `
      <p class="eyebrow">ARBEITSZEITNACHWEIS</p>
      <h1>Passwort festlegen</h1>
      <p class="hint">Dein Passwort wurde gespeichert. Du kannst dich jetzt <a href="/login">anmelden</a>.</p>
    `);
  }
  return shell("Passwort festlegen", `
    <p class="eyebrow">ARBEITSZEITNACHWEIS</p>
    <h1>Passwort festlegen</h1>
    <form id="set-password-form">
      <input type="hidden" name="token" value="${escapeHtml(token)}" />
      <label>Neues Passwort<input type="password" name="password" required minlength="8" /></label>
      <label>Passwort bestätigen<input type="password" name="confirm" required minlength="8" /></label>
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
      <button type="submit">Passwort speichern</button>
    </form>
    <script>
      document.getElementById("set-password-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = new FormData(event.target);
        if (form.get("password") !== form.get("confirm")) { location.href = "/set-password?token=${encodeURIComponent(token)}&error=" + encodeURIComponent("Die Passwörter stimmen nicht überein."); return; }
        const response = await fetch("/api/auth/set-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: form.get("token"), password: form.get("password") }) });
        if (!response.ok) { location.href = "/set-password?token=${encodeURIComponent(token)}&error=" + encodeURIComponent((await response.json()).error ?? "Fehlgeschlagen."); return; }
        location.href = "/set-password?token=${encodeURIComponent(token)}&done=1";
      });
    </script>
  `);
}

export function adminUsersPage(users: User[], setupLink?: string, error?: string, view: "dashboard" | "users" | "userview" = "users"): string {
  const userData = JSON.stringify(users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    lastName: user.name.split(/\s+/).filter(Boolean).pop() ?? user.name
  })));

  const activeUsers = users.filter((user) => user.status === "active").length;
  const pendingUsers = users.filter((user) => user.status === "pending").length;

  return shell("Administration", `
    <div class="row"><div><p class="eyebrow">ADMINISTRATION</p><h1>Arbeitszeitverwaltung</h1></div><form method="post" action="/logout"><button type="submit" class="link-button">Abmelden</button></form></div>
    <nav class="admin-nav" aria-label="Administration">
      <a class="${view === "dashboard" ? "active" : ""}" href="/admin/dashboard">Dashboard</a>
      <a class="${view === "users" ? "active" : ""}" href="/admin/users">Userverwaltung</a>
      <a class="${view === "userview" ? "active" : ""}" href="/admin/userview">Userview</a>
    </nav>

    <section id="dashboard" class="section${view === "dashboard" ? "" : " route-hidden"}">
      <p class="eyebrow">ÜBERSICHT</p>
      <h2>Dashboard</h2>
      <div class="dashboard-grid">
        <div class="metric"><span class="eyebrow">Accounts gesamt</span><strong>${users.length}</strong></div>
        <div class="metric"><span class="eyebrow">Aktiv</span><strong>${activeUsers}</strong></div>
        <div class="metric"><span class="eyebrow">Einladung offen</span><strong>${pendingUsers}</strong></div>
      </div>
    </section>

    <section id="userverwaltung" class="section${view === "users" ? "" : " route-hidden"}">
      <p class="eyebrow">ACCOUNTS</p>
      <h2>Userverwaltung</h2>
      <form id="create-form">
        <label>Name<input name="name" required /></label>
        <label>E-Mail<input type="email" name="email" required /></label>
        <label>Rolle<select name="role"><option value="employee">Mitarbeitende:r</option><option value="driver">Fahrer</option><option value="companion">Begleitperson</option><option value="admin">Admin</option></select></label>
        ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
        ${setupLink ? `<p class="hint">Setup-Link (an den Nutzer versendet): <a href="${escapeHtml(setupLink)}">${escapeHtml(setupLink)}</a></p>` : ""}
        <button type="submit">Nutzer anlegen</button>
      </form>
      <p class="eyebrow" style="margin-top:28px">BESTEHENDE ACCOUNTS</p>
      <label for="user-management-search">User und Accountdaten suchen<input id="user-management-search" type="search" autocomplete="off" placeholder="Name, E-Mail, Adresse, Handy, Autonummer …" /></label>
      <div id="user-management-results" class="account-list" aria-live="polite"></div>
    </section>

    <section id="userview" class="section${view === "userview" ? "" : " route-hidden"}" style="margin-top:28px">
      <p class="eyebrow">ZEITERFASSUNG</p>
      <h2>Userview</h2>
      <label>Account nach Nachname auswählen<input id="account-search" type="search" placeholder="Nachname eingeben" /></label>
      <div id="account-list" class="account-list"></div>
      <div id="account-details" class="details"></div>
    </section>

    <script>
      const accounts = ${userData};
      const searchInput = document.getElementById("account-search");
      const accountList = document.getElementById("account-list");
      const accountDetails = document.getElementById("account-details");
      const userManagementSearch = document.getElementById('user-management-search');
      const userManagementResults = document.getElementById('user-management-results');
      function escapeAttribute(value) {
        return String(value ?? '').replace(/[&<>"']/g, function(character) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
      }

      if (userManagementSearch && userManagementResults) {
        let searchTimer;
        userManagementSearch.addEventListener('input', function() {
          window.clearTimeout(searchTimer);
          const query = userManagementSearch.value.trim();
          if (!query) {
            userManagementResults.replaceChildren();
            return;
          }
          searchTimer = window.setTimeout(async function() {
            userManagementResults.textContent = 'Suche …';
            try {
              const response = await fetch('/api/admin/users/search?q=' + encodeURIComponent(query));
              const result = await response.json();
              if (!response.ok) throw new Error(result.error || 'Suche fehlgeschlagen.');
              if (userManagementSearch.value.trim() !== query) return;
              userManagementResults.innerHTML = result.users.length
                ? result.users.map(function(user) {
                    return '<div class="entry"><div class="entry-info"><strong>' + escapeAttribute(user.name) + '</strong><span>' + escapeAttribute(user.email) + '</span></div><a class="button" href="/admin/users/' + encodeURIComponent(user.id) + '/profile?returnTo=%2Fadmin%2Fusers">Bearbeiten</a></div>';
                  }).join('')
                : '<p class="entry-info">Keine passenden User gefunden.</p>';
            } catch (error) {
              userManagementResults.textContent = error instanceof Error ? error.message : 'Suche fehlgeschlagen.';
            }
          }, 180);
        });
      }

      function renderAccounts() {
        const query = (searchInput.value || "").trim().toLowerCase();
        const filtered = accounts.filter(function(account) {
          const haystack = (account.name + ' ' + account.lastName).toLowerCase();
          return !query || haystack.includes(query) || account.lastName.toLowerCase().includes(query);
        });

        if (!filtered.length) {
          accountList.innerHTML = '<p>Noch keine passenden Accounts gefunden.</p>';
          accountDetails.classList.remove('visible');
          accountDetails.innerHTML = '';
          return;
        }

        const selectedId = accountList.dataset.selectedId || filtered[0].id;
        accountList.innerHTML = filtered.map(function(account) {
          const selectedClass = account.id === selectedId ? 'selected' : '';
          return '<button type="button" class="account-option ' + selectedClass + '" data-id="' + account.id + '"><strong>' + account.name + '</strong><br /><span>' + account.email + '</span></button>';
        }).join('');

        const selectedAccount = filtered.find(function(account) { return account.id === selectedId; }) || filtered[0];
        accountList.dataset.selectedId = selectedAccount.id;
        renderDetails(selectedAccount);

        accountList.querySelectorAll('.account-option').forEach(function(button) {
          button.addEventListener('click', function() {
            accountList.dataset.selectedId = button.dataset.id;
            renderAccounts();
          });
        });
      }

      async function loadMonthlyEntries(accountId, year, month) {
        const account = accounts.find(function(candidate) { return candidate.id === accountId; });
        if (!account) {
          accountDetails.innerHTML = '<p class="error">Account nicht gefunden.</p>';
          return;
        }
        const response = await fetch('/api/admin/users/' + accountId + '/time-entries?year=' + year + '&month=' + month);
        const result = await response.json();
        if (!response.ok) {
          accountDetails.innerHTML = '<p class="error">' + (result.error || 'Fehlgeschlagen') + '</p>';
          return;
        }

        const entries = (result.entries || []).sort(function(a, b) {
          return new Date(a.date) - new Date(b.date);
        });
        const dayMap = new Map();
        entries.forEach(function(entry) {
          const day = new Date(entry.date + 'T00:00:00').getDate();
          if (!dayMap.has(day)) dayMap.set(day, []);
          dayMap.get(day).push(entry);
        });

        const totalMinutes = entries.reduce(function(total, entry) {
          return total + (Number(entry.durationMinutes) || 0);
        }, 0);
        const totalHours = Math.floor(totalMinutes / 60);
        const totalRemainingMinutes = totalMinutes % 60;
        const statusByDay = new Map();
        entries.forEach(function(entry) {
          if (entry.dayStatus && !statusByDay.has(entry.date)) statusByDay.set(entry.date, entry.dayStatus);
        });
        const statusCounts = { K: 0, U: 0, F: 0, UF: 0 };
        statusByDay.forEach(function(status) {
          if (statusCounts[status] !== undefined) statusCounts[status] += 1;
        });
        const tourDefinitions = [
          { id: 'tour-1', label: 'Frühtour' },
          { id: 'tour-2', label: 'Mittagstour' },
          { id: 'tour-3', label: 'Rücktour' }
        ];
        function timeLabel(value) {
          return value ? new Date(value).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '—';
        }
        function timeValue(value) {
          return value ? new Date(value).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
        }
        function durationLabel(entry) {
          const minutes = Number(entry && entry.durationMinutes) || 0;
          return Math.floor(minutes / 60) + ':' + String(minutes % 60).padStart(2, '0');
        }
        function escapeAttribute(value) {
          return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        }
        function easterSunday(year) {
          const date = new Date(Date.UTC(year, 2, 21));
          const goldenNumber = year % 19;
          const century = Math.floor(year / 100);
          const correction = (century - Math.floor(century / 4) - Math.floor((8 * century + 13) / 25) + 19 * goldenNumber + 15) % 30;
          const weekday = (Math.floor(year / 4) - Math.floor(year / 100) + Math.floor(year / 400) + correction) % 7;
          date.setUTCDate(21 + correction + (7 - weekday));
          return date;
        }
        function saxonyHolidays(year) {
          const holidays = new Map();
          const add = function(date, label) { holidays.set(date.toISOString().slice(0, 10), label); };
          const fixed = [[0, 1, 'Neujahr'], [4, 1, 'Tag der Arbeit'], [9, 3, 'Tag der Deutschen Einheit'], [9, 31, 'Reformationstag'], [11, 25, '1. Weihnachtstag'], [11, 26, '2. Weihnachtstag']];
          fixed.forEach(function(item) { add(new Date(Date.UTC(year, item[0], item[1])), item[2]); });
          const easter = easterSunday(year);
          [[-2, 'Karfreitag'], [1, 'Ostermontag'], [39, 'Christi Himmelfahrt'], [50, 'Pfingstmontag']].forEach(function(item) {
            const date = new Date(easter);
            date.setUTCDate(date.getUTCDate() + item[0]);
            add(date, item[1]);
          });
          const november23 = new Date(Date.UTC(year, 10, 23));
          const daysSinceWednesday = (november23.getUTCDay() + 4) % 7;
          november23.setUTCDate(23 - daysSinceWednesday);
          add(november23, 'Buß- und Bettag');
          return holidays;
        }
        const holidays = saxonyHolidays(year);

        const rows = Array.from({ length: 31 }, function(_, index) {
          const day = index + 1;
          const dayEntries = dayMap.get(day) || [];
          const dayRemark = dayEntries.map(function(entry) { return entry.remark || ''; }).filter(Boolean).filter(function(value, remarkIndex, values) { return values.indexOf(value) === remarkIndex; }).join(' | ');
          const dayStatus = dayEntries.find(function(entry) { return entry.dayStatus; })?.dayStatus || '';
          const rowDate = new Date(Date.UTC(year, month - 1, day));
          const dateKey = rowDate.toISOString().slice(0, 10);
          const holidayLabel = holidays.get(dateKey) || '';
          const weekend = rowDate.getUTCDay() === 0 || rowDate.getUTCDay() === 6;
          const rowClass = holidayLabel ? 'holiday-row' : weekend ? 'weekend-row' : '';
          const statusOptions = ['<option value="">-</option>', '<option value="K"' + (dayStatus === 'K' ? ' selected' : '') + '>K</option>', '<option value="U"' + (dayStatus === 'U' ? ' selected' : '') + '>U</option>', '<option value="F"' + (dayStatus === 'F' ? ' selected' : '') + '>F</option>', '<option value="UF"' + (dayStatus === 'UF' ? ' selected' : '') + '>UF</option>'].join('');
          const dayTotal = dayEntries.reduce(function(total, entry) { return total + (Number(entry.durationMinutes) || 0); }, 0);
          const tourCells = tourDefinitions.map(function(tour) {
            const entry = dayEntries.find(function(candidate) { return candidate.tour === tour.id; });
            if (!entry) return '<td class="tour-cell">—</td><td class="time-cell">—</td><td class="time-cell">—</td><td class="total-cell">—</td>';
            return '<td class="tour-cell" data-entry-id="' + entry.id + '"><input type="text" inputmode="numeric" maxlength="3" pattern="[1-9][0-9]{0,2}" data-field="tourNumber" value="' + (entry.tourNumber ?? 1) + '" aria-label="Tournummer ' + tour.label + ' Tag ' + day + '" /></td><td class="time-cell"><input type="text" inputmode="numeric" maxlength="5" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" data-field="startedAt" value="' + timeValue(entry.startedAt) + '" placeholder="HH:MM" aria-label="Start ' + tour.label + ' Tag ' + day + '" /></td><td class="time-cell"><input type="text" inputmode="numeric" maxlength="5" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" data-field="endedAt" value="' + timeValue(entry.endedAt) + '" placeholder="HH:MM" aria-label="Ende ' + tour.label + ' Tag ' + day + '" /></td><td class="total-cell">' + durationLabel(entry) + '</td>';
          }).join('');
          return '<tr class="' + rowClass + '" data-day="' + day + '"><td><span class="day-label"><strong>' + String(day).padStart(2, '0') + '</strong>' + (holidayLabel ? '<small>' + holidayLabel + '</small>' : '') + '</span></td>' + tourCells + '<td class="total-cell"><strong>' + Math.floor(dayTotal / 60) + ':' + String(dayTotal % 60).padStart(2, '0') + '</strong></td><td class="status-cell"><select data-field="dayStatus" aria-label="Status Tag ' + day + '">' + statusOptions + '</select></td><td class="remark-cell"><input data-field="remark" value="' + escapeAttribute(dayRemark) + '" placeholder="Bemerkung" /></td></tr>';
        }).join('');

        accountDetails.innerHTML = '<div class="entry"><div class="entry-info"><strong>' + account.name + '</strong><span>' + account.email + '</span></div><span class="status-pill ' + account.status + '">' + (account.status === 'active' ? 'Aktiv' : 'Ausstehend') + '</span></div><div class="month-controls"><label>Jahr<select id="year-select"></select></label><label>Monat<select id="month-select"></select></label></div><table class="month-summary"><thead><tr><th>Monatssumme</th><th>Urlaub</th><th>Krank</th></tr></thead><tbody><tr><td>' + totalHours + ':' + String(totalRemainingMinutes).padStart(2, '0') + ' h</td><td>' + statusCounts.U + '</td><td>' + statusCounts.K + '</td></tr></tbody></table><div class="monthly-save"><span id="monthly-save-status">Keine ungespeicherten Änderungen</span><button type="button" id="monthly-save" disabled>Alle Änderungen speichern</button></div><table class="month-table"><colgroup><col class="day-column" /><col class="tour-column" /><col class="time-column" /><col class="time-column" /><col class="total-column" /><col class="tour-column" /><col class="time-column" /><col class="time-column" /><col class="total-column" /><col class="tour-column" /><col class="time-column" /><col class="time-column" /><col class="total-column" /><col class="total-column" /><col class="status-column" /><col /></colgroup><thead><tr><th rowspan="2">Tag</th><th colspan="4">Tour 1</th><th colspan="4">Tour 2</th><th colspan="4">Tour 3</th><th rowspan="2">Tagessumme</th><th rowspan="2">Status</th><th rowspan="2">Bemerkungen</th></tr><tr><th>Tour</th><th>Start</th><th>Ende</th><th>Summe</th><th>Tour</th><th>Start</th><th>Ende</th><th>Summe</th><th>Tour</th><th>Start</th><th>Ende</th><th>Summe</th></tr></thead><tbody>' + rows + '</tbody></table>';

        const yearSelect = document.getElementById('year-select');
        const monthSelect = document.getElementById('month-select');
        const years = Array.from({ length: 5 }, function(_, index) {
          return new Date().getFullYear() - 2 + index;
        });
        yearSelect.innerHTML = years.map(function(currentYear) {
          return '<option value="' + currentYear + '">' + currentYear + '</option>';
        }).join('');
        monthSelect.innerHTML = Array.from({ length: 12 }, function(_, index) {
          const monthNumber = index + 1;
          return '<option value="' + monthNumber + '">' + String(monthNumber).padStart(2, '0') + '</option>';
        }).join('');
        yearSelect.value = String(year);
        monthSelect.value = String(month);

        yearSelect.addEventListener('change', function() {
          loadMonthlyEntries(account.id, Number(yearSelect.value), Number(monthSelect.value));
        });
        monthSelect.addEventListener('change', function() {
          loadMonthlyEntries(account.id, Number(yearSelect.value), Number(monthSelect.value));
        });

        const saveButton = accountDetails.querySelector('#monthly-save');
        const saveStatus = accountDetails.querySelector('#monthly-save-status');
        const markDirty = function() {
          saveButton.disabled = false;
          saveStatus.textContent = 'Ungespeicherte Änderungen';
        };
        accountDetails.querySelectorAll('tbody input, tbody select').forEach(function(input) {
          input.addEventListener('input', markDirty);
          input.addEventListener('change', markDirty);
        });
        const statusTexts = { K: 'Krank', U: 'Urlaub', F: 'Feiertag', UF: 'unbezahlt frei' };
        accountDetails.querySelectorAll('tbody select[data-field="dayStatus"]').forEach(function(statusField) {
          let previousStatus = statusField.value;
          statusField.addEventListener('change', function() {
            const remarkField = statusField.closest('tr').querySelector('[data-field="remark"]');
            const remarkParts = remarkField.value.split(/\s+\|\s+/).filter(Boolean);
            const previousText = statusTexts[previousStatus];
            if (previousText) {
              const previousTextIndex = remarkParts.indexOf(previousText);
              if (previousTextIndex !== -1) remarkParts.splice(previousTextIndex, 1);
            }
            const nextText = statusTexts[statusField.value];
            if (nextText && !remarkParts.includes(nextText)) remarkParts.push(nextText);
            remarkField.value = remarkParts.join(' | ');
            previousStatus = statusField.value;
          });
        });
        saveButton.addEventListener('click', async function() {
          saveButton.disabled = true;
          saveStatus.textContent = 'Speichert …';
          try {
            const toIso = function(value, row) {
              if (!value) return null;
              if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)) throw new Error('Zeiten müssen im Format HH:MM eingegeben werden.');
              const date = new Date(Number(yearSelect.value), Number(monthSelect.value) - 1, Number(row.dataset.day), Number(value.slice(0, 2)), Number(value.slice(3, 5)));
              return date.toISOString();
            };
            const rowsToSave = accountDetails.querySelectorAll('tbody tr');
            for (const row of rowsToSave) {
              const day = Number(row.dataset.day);
              if (!Number.isInteger(day) || day < 1 || day > 31) continue;
              const date = Number(yearSelect.value) + '-' + String(Number(monthSelect.value)).padStart(2, '0') + '-' + String(day).padStart(2, '0');
              const remarkField = row.querySelector('[data-field="remark"]');
              const statusField = row.querySelector('[data-field="dayStatus"]');
              const remark = remarkField ? remarkField.value : '';
              const dayStatus = statusField ? statusField.value : '';
              const tourCells = row.querySelectorAll('.tour-cell[data-entry-id]');
              const metadataRequests = [
                fetch('/api/admin/users/' + account.id + '/day-status/' + date, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dayStatus: dayStatus }) }),
                fetch('/api/admin/users/' + account.id + '/day-remark/' + date, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remark: remark }) })
              ];
              const metadataResponses = await Promise.all(metadataRequests);
              for (const metadataResponse of metadataResponses) {
                if (!metadataResponse.ok) {
                  const metadataResult = await metadataResponse.json();
                  throw new Error(metadataResult.error || 'Status oder Bemerkung konnte nicht gespeichert werden.');
                }
              }
              for (const tourCell of tourCells) {
                const startCell = tourCell.nextElementSibling;
                const endCell = startCell ? startCell.nextElementSibling : null;
                const startedAtField = startCell ? startCell.querySelector('[data-field="startedAt"]') : null;
                const endedAtField = endCell ? endCell.querySelector('[data-field="endedAt"]') : null;
                const tourNumberField = tourCell.querySelector('[data-field="tourNumber"]');
                const startedAt = startedAtField ? startedAtField.value : '';
                const endedAt = endedAtField ? endedAtField.value : '';
                const tourNumber = Number(tourNumberField ? tourNumberField.value : 1);
                if (!Number.isInteger(tourNumber) || tourNumber < 1 || tourNumber > 999) throw new Error('Die Tournummer muss eine Ganzzahl von 1 bis 999 sein.');
                const response = await fetch('/api/admin/users/' + account.id + '/time-entries/' + tourCell.dataset.entryId, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tourNumber: tourNumber, startedAt: toIso(startedAt, row), endedAt: toIso(endedAt, row) })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Speichern fehlgeschlagen');
              }
            }
            loadMonthlyEntries(account.id, Number(yearSelect.value), Number(monthSelect.value));
          } catch (error) {
            saveButton.disabled = false;
            saveStatus.textContent = error instanceof Error ? error.message : 'Speichern fehlgeschlagen';
          }
        });
      }

      function renderDetails(account) {
        const statusLabel = account.status === 'active' ? 'Aktiv' : 'Ausstehend';
        const roleLabels = { admin: 'Admin', driver: 'Fahrer', companion: 'Begleitperson', employee: 'Mitarbeitende:r' };
        const roleLabel = roleLabels[account.role] || 'Mitarbeitende:r';
        accountDetails.classList.add('visible');
        accountDetails.innerHTML = '<div class="entry"><div class="entry-info"><strong>' + escapeAttribute(account.name) + '</strong><span>' + escapeAttribute(account.email) + '</span></div><span class="status-pill ' + account.status + '">' + statusLabel + '</span></div><div class="entry"><div class="entry-info"><strong>Rolle</strong><span>' + roleLabel + '</span></div><a class="button" href="/admin/users/' + encodeURIComponent(account.id) + '/profile?returnTo=%2Fadmin%2Fuserview">Bearbeiten</a></div><div class="month-controls"><label>Jahr<select id="year-select"></select></label><label>Monat<select id="month-select"></select></label></div>' + (account.status === 'pending' ? '<button type="button" class="button" data-resend="' + account.id + '">Link erneut senden</button>' : '');

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const yearSelect = document.getElementById('year-select');
        const monthSelect = document.getElementById('month-select');
        yearSelect.innerHTML = Array.from({ length: 5 }, function(_, index) {
          const year = currentYear - 2 + index;
          return '<option value="' + year + '">' + year + '</option>';
        }).join('');
        monthSelect.innerHTML = Array.from({ length: 12 }, function(_, index) {
          const monthNumber = index + 1;
          return '<option value="' + monthNumber + '">' + String(monthNumber).padStart(2, '0') + '</option>';
        }).join('');
        yearSelect.value = String(currentYear);
        monthSelect.value = String(currentMonth);

        yearSelect.addEventListener('change', function() {
          loadMonthlyEntries(account.id, Number(yearSelect.value), Number(monthSelect.value));
        });
        monthSelect.addEventListener('change', function() {
          loadMonthlyEntries(account.id, Number(yearSelect.value), Number(monthSelect.value));
        });

        const resendButton = accountDetails.querySelector('[data-resend]');
        if (resendButton) {
          resendButton.addEventListener('click', async function() {
            const response = await fetch('/api/admin/users/' + account.id + '/resend-invite', { method: 'POST' });
            const result = await response.json();
            location.href = response.ok ? '/admin/users?setupLink=' + encodeURIComponent(result.setupLink) : '/admin/users?error=' + encodeURIComponent(result.error ?? 'Fehlgeschlagen.');
          });
        }

        loadMonthlyEntries(account.id, currentYear, currentMonth);
      }

      if (searchInput && accountList && accountDetails) {
        searchInput.addEventListener('input', renderAccounts);
        renderAccounts();
      }

      const createForm = document.getElementById('create-form');
      if (createForm) createForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.target));
        const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const result = await response.json();
        if (!response.ok) {
          location.href = '/admin/users?error=' + encodeURIComponent(result.error ?? 'Fehlgeschlagen.');
          return;
        }
        location.href = '/admin/users?setupLink=' + encodeURIComponent(result.setupLink);
      });
    </script>
  `, true);
}

export function adminUserProfilePage(user: User, profile: UserProfile, returnTo: string): string {
  const option = (value: string, label: string, selectedValue: string) => `<option value="${value}"${value === selectedValue ? " selected" : ""}>${label}</option>`;
  const field = (label: string, name: string, value: string | number, type = "text") => `<label>${label}<input type="${type}" name="${name}" value="${escapeHtml(String(value))}"${type === "number" ? ' min="0" step="0.25"' : ""} /></label>`;
  const electricCarValue = String(profile.electricCar);

  return shell("Accountdaten bearbeiten", `
    <div class="row"><div><p class="eyebrow">ACCOUNTVERWALTUNG</p><h1>Profildaten</h1><p>${escapeHtml(user.name)} · ${escapeHtml(user.email)}</p></div><a class="link-button" href="${escapeHtml(returnTo)}">Zurück</a></div>
    <form id="profile-form">
      <div class="profile-grid">
        <label>Anrede<select name="salutation">${option("", "Keine Angabe", profile.salutation)}${option("Herr", "Herr", profile.salutation)}${option("Frau", "Frau", profile.salutation)}${option("Divers", "Divers", profile.salutation)}</select></label>
        ${field("Vorname", "firstName", profile.firstName)}
        ${field("Nachname", "lastName", profile.lastName)}
        ${field("Straße", "street", profile.street)}
        ${field("Hausnummer", "houseNumber", profile.houseNumber)}
        ${field("PLZ", "postalCode", profile.postalCode)}
        ${field("Ort", "city", profile.city)}
        ${field("Handy", "mobile", profile.mobile, "tel")}
        ${field("Stunden krank", "sickHours", profile.sickHours, "number")}
        ${field("Stunden Urlaub", "vacationHours", profile.vacationHours, "number")}
        ${field("Autonummer", "licensePlate", profile.licensePlate)}
        <label>E-Auto<select name="electricCar">${option("false", "Nein", electricCarValue)}${option("true", "Ja", electricCarValue)}</select></label>
      </div>
      <div class="monthly-save"><span id="profile-save-status" class="profile-feedback"></span><button type="submit">Speichern</button></div>
    </form>
    <script>
      const profileForm = document.getElementById('profile-form');
      const profileSaveStatus = document.getElementById('profile-save-status');
      const saveButton = profileForm.querySelector('button[type="submit"]');
      const returnTo = ${JSON.stringify(returnTo)};
      profileForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        saveButton.disabled = true;
        profileSaveStatus.textContent = 'Speichert …';
        const formData = Object.fromEntries(new FormData(profileForm));
        formData.sickHours = Number(formData.sickHours || 0);
        formData.vacationHours = Number(formData.vacationHours || 0);
        formData.electricCar = formData.electricCar === 'true';
        try {
          const response = await fetch('/api/admin/users/' + encodeURIComponent(${JSON.stringify(user.id)}) + '/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Profildaten konnten nicht gespeichert werden.');
          location.href = returnTo;
        } catch (error) {
          profileSaveStatus.textContent = error instanceof Error ? error.message : 'Speichern fehlgeschlagen';
          saveButton.disabled = false;
        }
      });
    </script>
  `, false, "profile-panel");
}
