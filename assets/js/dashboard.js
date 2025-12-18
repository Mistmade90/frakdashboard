(() => {
  FD.requireAuthOrRedirect();

  const s = FD.getSession();
  document.querySelector("#userName").textContent = s.username;
  document.querySelector("#userRole").textContent = s.role;

  const warns = FD.getWarns();
  const active = warns.filter(w => !w.expired);
  const expired = warns.filter(w => w.expired);

  document.querySelector("#countWarnsActive").textContent = active.length;
  document.querySelector("#countWarnsExpired").textContent = expired.length;

  // "Letzte Aktionen" = letzte Warns (max 5)
  const list = document.querySelector("#lastActions");
  list.innerHTML = "";
  active.slice(0,5).forEach(w => {
    const li = document.createElement("div");
    li.className = "card pad";
    li.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
        <div>
          <div class="h2">${w.fraktionsname} — Warn ${w.warn}/3</div>
          <div class="small">Vergeben von <strong>${w.vergebenVon}</strong> • Ablauf: ${FD.formatDateTime(w.expireAt)}</div>
          <div class="p">${w.begruendung}</div>
        </div>
        <a class="btn" href="./frakwarns.html">Öffnen</a>
      </div>
    `;
    list.appendChild(li);
  });

  document.querySelector("#logoutBtn").addEventListener("click", () => FD.logout());
})();
