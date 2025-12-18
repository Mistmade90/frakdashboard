(() => {
    FD.requireAuthOrRedirect();

    const s = FD.getSession();
    document.querySelector("#userName").textContent = s.username;
    document.querySelector("#userRole").textContent = s.role;

    const tbody = document.querySelector("#warnTableBody");
    const filterSel = document.querySelector("#filterStatus");
    const searchIn = document.querySelector("#searchText");

    // Modal elements
    const modalBack = document.querySelector("#modalBack");
    const modalTitle = document.querySelector("#modalTitle");
    const modalMeta = document.querySelector("#modalMeta");
    const modalBody = document.querySelector("#modalBody");
    const closeModalBtns = document.querySelectorAll("[data-close-modal]");

    // Create form
    const form = document.querySelector("#warnForm");
    const fFrak = document.querySelector("#f_frak");
    const fWarn = document.querySelector("#f_warn");
    const fAn = document.querySelector("#f_an");
    const fBegr = document.querySelector("#f_begr");
    const fNotiz = document.querySelector("#f_notiz");

    function openModal(w) {
        modalTitle.textContent = `${w.fraktionsname} — Warn ${w.warn}/3`;
        modalMeta.textContent = `Vergeben von ${w.vergebenVon} • Erstellt: ${FD.formatDateTime(w.createdAt)} • Ablauf: ${FD.formatDateTime(w.expireAt)}`;

        const status = w.expired ? "Abgelaufen" : "Aktiv";
        const level = w.expired ? "danger" : FD.computeLevel(w.warn);

        modalBody.innerHTML = `
      <div class="grid cols-2">
        <div class="card pad">
          <div class="badge dot ${level}">${status}</div>
          <div style="margin-top:10px" class="h2">Details</div>
          <div class="p" style="margin-top:8px">
            <strong>Vergeben an:</strong> ${w.vergebenAn}<br/>
            <strong>Uhrzeit (Erstellung):</strong> ${w.uhrzeit}<br/>
            <strong>Begründung:</strong> ${w.begruendung}<br/>
            <strong>Notiz:</strong> ${w.notiz || "—"}<br/>
          </div>
        </div>

        <div class="card pad">
          <div class="h2">Aktionen</div>
          <div class="p">Du kannst den Eintrag löschen oder die ID kopieren.</div>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
            <button class="btn" id="copyIdBtn">ID kopieren</button>
            <button class="btn danger" id="deleteBtn">Warn löschen</button>
          </div>
          <div class="small" style="margin-top:10px;">ID: <span class="kbd">${w.id}</span></div>
        </div>
      </div>
    `;

        modalBack.classList.add("open");

        modalBody.querySelector("#copyIdBtn").addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(w.id);
                FD.toast("ID kopiert!");
            } catch {
                FD.toast("Konnte nicht kopieren (Browser-Restriktion).");
            }
        });

        modalBody.querySelector("#deleteBtn").addEventListener("click", () => {
            if (!confirm("Warn wirklich löschen?")) return;
            const res = FrakDashboard.warnings.delete(w.id);
            if (res.ok) {
                FD.toast("Warn gelöscht.");
                modalBack.classList.remove("open");
                render();
            }
        });
    }

    function closeModal() {
        modalBack.classList.remove("open");
    }

    closeModalBtns.forEach(b => b.addEventListener("click", closeModal));
    modalBack.addEventListener("click", (e) => {
        if (e.target === modalBack) closeModal();
    });

    function getFiltered() {
        const all = FD.getWarns();
        const status = filterSel.value; // all | active | expired
        const q = searchIn.value.trim().toLowerCase();

        return all.filter(w => {
            const okStatus =
                status === "all" ? true :
                    status === "active" ? !w.expired :
                        status === "expired" ? w.expired : true;

            const blob = `${w.fraktionsname} ${w.vergebenAn} ${w.vergebenVon} ${w.begruendung} ${w.notiz}`.toLowerCase();
            const okQ = q ? blob.includes(q) : true;

            return okStatus && okQ;
        });
    }

    function render() {
        const rows = getFiltered();
        tbody.innerHTML = "";

        if (rows.length === 0) {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="6" style="padding:16px;color:rgba(229,231,235,.70)">Keine Einträge gefunden.</td>`;
            tbody.appendChild(tr);
            return;
        }

        rows.forEach(w => {
            const tr = document.createElement("tr");
            const status = w.expired ? "Abgelaufen" : "Aktiv";
            const level = w.expired ? "danger" : FD.computeLevel(w.warn);

            tr.innerHTML = `
        <td>
          <div style="font-weight:700">${w.fraktionsname}</div>
          <div class="small">ID: <span class="kbd">${w.id}</span></div>
        </td>
        <td>
          <div class="badge dot ${level}">${w.warn}/3</div>
        </td>
        <td>
          <div>${w.vergebenAn}</div>
          <div class="small">${w.vergebenVon}</div>
        </td>
        <td>
          <div>${w.begruendung}</div>
          <div class="small">${w.uhrzeit}</div>
        </td>
        <td>
          <div class="badge dot ${w.expired ? "danger" : "success"}">${status}</div>
          <div class="small">Ablauf: ${FD.formatDateTime(w.expireAt)}</div>
        </td>
        <td class="actions">
          <button class="btn" data-open="${w.id}">Details</button>
          <button class="btn danger" data-del="${w.id}">Löschen</button>
        </td>
      `;
            tbody.appendChild(tr);
        });

        // Bind buttons
        tbody.querySelectorAll("[data-open]").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-open");
                const w = FD.getWarns().find(x => x.id === id);
                if (w) openModal(w);
            });
        });

        tbody.querySelectorAll("[data-del]").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-del");
                if (!confirm("Warn wirklich löschen?")) return;
                const res = FrakDashboard.warnings.delete(id);
                if (res.ok) {
                    FD.toast("Warn gelöscht.");
                    render();
                }
            });
        });
    }

    filterSel.addEventListener("change", render);
    searchIn.addEventListener("input", render);

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const payload = {
            fraktionsname: fFrak.value.trim(),
            warn: Number(fWarn.value),
            vergebenAn: fAn.value.trim(),
            begruendung: fBegr.value.trim(),
            vergebenVon: s.username,
            notiz: fNotiz.value.trim()
        };

        if (!payload.fraktionsname) return FD.toast("Bitte Fraktionsname eingeben.");
        if (!payload.vergebenAn) return FD.toast("Bitte 'Vergeben an' ausfüllen.");
        if (!payload.begruendung) return FD.toast("Bitte Begründung ausfüllen.");

        const res = FrakDashboard.warnings.add(payload);
        if (res.ok) {
            form.reset();
            FD.toast("Warn gespeichert (Ablauf automatisch +14 Tage).");

            // 🔥 WICHTIG: neu einlesen & expired neu berechnen
            FD.getWarns();
            render();
        }
    });

    document.querySelector("#logoutBtn").addEventListener("click", () => FD.logout());

    // Initial render
    render();
});