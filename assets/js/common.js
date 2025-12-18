(() => {
  /* =========================
     STORAGE KEYS
  ========================= */
  const LS = {
    session: "FD_session",
    users: "FD_users",
    warns: "FD_warns"
  };

  /* =========================
     HELPERS
  ========================= */
  function nowISO() { return new Date().toISOString(); }

  function parseDateSafe(v) {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function pad2(n) { return String(n).padStart(2, "0"); }

  function formatDateTime(iso) {
    const d = parseDateSafe(iso);
    if (!d) return "—";
    return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function toast(msg) {
    console.log("[FrakDashboard] " + msg);
    alert(msg);
  }

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  /* =========================
     DISCORD LOGS
  ========================= */
  const DISCORD_WEBHOOK =
    "https://discord.com/api/webhooks/1451174549411336236/p35PPMr6G3MGRqezL029sPOMnruzxyjsb4a8yncMJ-_h4WbLPA1PcPbKUcIzoaKPBnd-";

  function sendLog(title, description) {
    // Nicht blockieren, wenn Discord mal down ist
    try {
      fetch(DISCORD_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: title,
            description: description,
            color: 0x3b82f6,
            timestamp: new Date().toISOString()
          }]
        })
      }).catch(() => {});
    } catch {}
  }

  /* =========================
     SESSION
  ========================= */
  function getSession() {
    return load(LS.session, null);
  }

  function setSession(session) {
    save(LS.session, session);
  }

  function clearSession() {
    localStorage.removeItem(LS.session);
  }

  /* =========================
     SEED (USER + WARNS)
  ========================= */
  function ensureSeed() {
    const users = load(LS.users, null);

    if (!users || !Array.isArray(users) || users.length === 0) {
      save(LS.users, [
        { username: "David", password: "CHANGE_ME", role: "Admin" },
        { username: "Ryder", password: "CHANGE_ME", role: "Admin" },
        { username: "Ice", password: "CHANGE_ME", role: "Leitung" },
        { username: "Vani", password: "CHANGE_ME", role: "User" },
        { username: "Helmut", password: "test", role: "User" },
        { username: "Mistmade", password: "test", role: "Admin" },
        { username: "Kanashi", password: "CHANGE_ME", role: "User" },
        { username: "Beyza", password: "CHANGE_ME", role: "User" }
      ]);
    }

    const warns = load(LS.warns, null);
    if (!warns || !Array.isArray(warns)) {
      save(LS.warns, []);
    }
  }

  /* =========================
     AUTH
  ========================= */
  function login(username, password) {
    ensureSeed();
    const users = load(LS.users, []);
    const u = users.find(x => x.username === username && x.password === password);
    if (!u) return { ok: false };
    setSession({ username: u.username, role: u.role, loginAt: nowISO() });
    return { ok: true };
  }

  function logout() {
    clearSession();
    window.location.href = "./index.html";
  }

  function requireAuthOrRedirect() {
    ensureSeed();
    const s = getSession();
    if (!s || !s.username) {
      window.location.href = "./index.html";
    }
  }

  /* =========================
     WARNS
  ========================= */
  function getWarns() {
    ensureSeed();
    const warns = load(LS.warns, []);
    const now = Date.now();

    warns.forEach(w => {
      const exp = parseDateSafe(w.expireAt);
      w.expired = exp ? exp.getTime() < now : false;
    });

    save(LS.warns, warns);
    return warns;
  }

  function setWarns(warns) {
    save(LS.warns, warns);
  }

  function computeLevel(warnNumber) {
    if (warnNumber <= 0) return "success";
    if (warnNumber <= 2) return "warn";
    return "danger";
  }

  /* =========================
     ROLES & PERMISSIONS
  ========================= */
  function canManageUsers() {
    const s = getSession();
    return !!s && (s.role === "Admin" || s.role === "Leitung");
  }

  function canCreateRole(role) {
    const s = getSession();
    if (!s) return false;
    if (s.role === "Admin") return true;
    if (s.role === "Leitung" && role !== "Admin") return true;
    return false;
  }

  /* =========================
     USER MANAGEMENT
  ========================= */
  function getUsers() {
    ensureSeed();
    return load(LS.users, []);
  }

  function addUser(username, password, role) {
    if (!canManageUsers()) return { ok: false, error: "NO_PERMISSION" };
    if (!canCreateRole(role)) return { ok: false, error: "ROLE_NOT_ALLOWED" };

    const users = getUsers();
    if (users.find(u => u.username === username)) {
      return { ok: false, error: "USER_EXISTS" };
    }

    users.push({ username, password, role });
    save(LS.users, users);

    const s = getSession() || { username: "System", role: "—" };
    sendLog(
      "➕ Benutzer angelegt",
      `**${s.username} (${s.role})** hat den Benutzer **${username} (${role})** angelegt.`
    );

    return { ok: true };
  }

  function changePassword(username, newPassword) {
    const s = getSession();
    if (!s) return { ok: false, error: "NO_SESSION" };

    const users = getUsers();
    const u = users.find(x => x.username === username);
    if (!u) return { ok: false, error: "NOT_FOUND" };

    // Jeder darf sein eigenes Passwort ändern, Admin darf alle ändern
    if (s.username !== username && s.role !== "Admin") {
      return { ok: false, error: "NO_PERMISSION" };
    }

    u.password = newPassword;
    save(LS.users, users);

    sendLog(
      "🔑 Passwort geändert",
      `**${s.username} (${s.role})** hat das Passwort von **${username}** geändert.`
    );

    return { ok: true };
  }

  function deleteUser(username) {
    const s = getSession();
    if (!s) return { ok: false, error: "NO_SESSION" };

    // Nur Admin & Leitung
    if (s.role !== "Admin" && s.role !== "Leitung") {
      return { ok: false, error: "NO_PERMISSION" };
    }

    const users = getUsers();
    const target = users.find(u => u.username === username);
    if (!target) return { ok: false, error: "NOT_FOUND" };

    // Leitung darf keine Admins löschen
    if (s.role === "Leitung" && target.role === "Admin") {
      return { ok: false, error: "CANNOT_DELETE_ADMIN" };
    }

    // Optional: sich selbst löschen verhindern (stabiler)
    if (s.username === username) {
      return { ok: false, error: "CANNOT_DELETE_SELF" };
    }

    const next = users.filter(u => u.username !== username);
    save(LS.users, next);

    sendLog(
      "🗑️ Benutzer gelöscht",
      `**${s.username} (${s.role})** hat den Benutzer **${username} (${target.role})** gelöscht.`
    );

    return { ok: true };
  }

  /* =========================
     GLOBAL EXPORTS (AM ENDE!)
  ========================= */
  window.FrakDashboard = {
    login,
    logout,
    warnings: {
      list: getWarns,
      clearAll() { save(LS.warns, []); }
    },
    users: {
      list: getUsers,
      add: addUser,
      delete: deleteUser,
      changePassword: changePassword
    }
  };

  window.FD = {
    ensureSeed,
    getSession,
    requireAuthOrRedirect,
    logout,
    formatDateTime,
    computeLevel,
    toast,
    getWarns
  };
})();
