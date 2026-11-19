(function () {
      "use strict";

      var API_STORAGE_KEY = "clair-api-url";
      var apiBase = (localStorage.getItem(API_STORAGE_KEY) || window.API_BASE_URL || "").replace(/\/+$/, "");
      var tickets = [];
      var activeFilter = "all";
      var searchTerm = "";
      var loadError = null;
      var toastTimer;
      var statusDefinitions = {
        open: { label: "Ouvert", className: "open" },
        in_progress: { label: "En cours", className: "progress" },
        resolved: { label: "Résolu", className: "resolved" }
      };

      var today = new Date();
      document.getElementById("today").textContent = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(today);
      document.getElementById("dateChip").textContent = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(today);

      function apiUrl(path) {
        return apiBase + path;
      }

      function normalizeStatus(value) {
        var status = String(value || "open").toLowerCase().trim().replace(/[\s-]+/g, "_");
        if (status === "ouvert" || status === "ouverte" || status === "new") return "open";
        if (status === "en_cours" || status === "encours" || status === "inprogress" || status === "processing") return "in_progress";
        if (status === "résolu" || status === "resolu" || status === "résolue" || status === "resolue" || status === "closed" || status === "done") return "resolved";
        return Object.prototype.hasOwnProperty.call(statusDefinitions, status) ? status : "open";
      }

      function normalizeTicket(ticket) {
        if (!ticket || typeof ticket !== "object") return null;
        var id = ticket.id;
        if (id === undefined || id === null) return null;
        return {
          id: String(id),
          title: String(ticket.title || ticket.titre || "Demande sans titre"),
          description: String(ticket.description || ""),
          status: normalizeStatus(ticket.status || ticket.statut),
          createdAt: ticket.created_at || ticket.createdAt || ticket.date_creation || null
        };
      }

      async function request(path, options) {
        var response;
        try {
          response = await fetch(apiUrl(path), Object.assign({
            headers: { "Accept": "application/json" }
          }, options || {}));
        } catch (error) {
          throw new Error("Impossible de joindre l’API. Vérifiez son URL et son accès réseau.");
        }

        var payload = null;
        var contentType = response.headers.get("content-type") || "";
        if (contentType.indexOf("application/json") !== -1) {
          try { payload = await response.json(); } catch (error) { payload = null; }
        }
        if (!response.ok) {
          var message = payload && (payload.message || payload.error);
          if (response.status === 404) message = message || "Route introuvable. Vérifiez que l’API expose /api/tickets.";
          throw new Error(message || "La requête a échoué (HTTP " + response.status + ").");
        }
        return payload;
      }

      function setConnection(state, label) {
        var dot = document.getElementById("connectionDot");
        dot.className = "connection-dot" + (state === "online" ? " online" : state === "checking" ? " checking" : "");
        document.getElementById("connectionLabel").textContent = label;
      }

      function showToast(message, isError) {
        var root = document.getElementById("toastRoot");
        root.innerHTML = "";
        var toast = document.createElement("div");
        toast.className = "toast" + (isError ? " error" : "");
        toast.setAttribute("role", isError ? "alert" : "status");
        toast.textContent = message;
        root.appendChild(toast);
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () { root.innerHTML = ""; }, 4200);
      }

      function formatDate(value) {
        if (!value) return "Date non renseignée";
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Date non renseignée";
        return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(date);
      }

      function makeElement(tag, className, text) {
        var element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
      }

      function renderCounts() {
        var counts = { all: tickets.length, open: 0, in_progress: 0, resolved: 0 };
        tickets.forEach(function (ticket) { counts[ticket.status] += 1; });
        Object.keys(counts).forEach(function (key) {
          var navCount = document.querySelector('[data-count="' + key + '"]');
          var stat = document.querySelector('[data-stat="' + key + '"]');
          var count = loadError ? "—" : counts[key];
          if (navCount) navCount.textContent = count;
          if (stat) stat.textContent = count;
        });
      }

      function renderTicket(ticket) {
        var definition = statusDefinitions[ticket.status];
        var card = makeElement("article", "ticket-card");
        var top = makeElement("div", "ticket-topline");
        var title = makeElement("h3", "ticket-title", ticket.title);
        var badge = makeElement("span", "status-badge " + definition.className, definition.label);
        top.appendChild(title);
        top.appendChild(badge);
        card.appendChild(top);

        var description = makeElement("p", "ticket-description", ticket.description || "Aucune description.");
        card.appendChild(description);

        var footer = makeElement("div", "ticket-footer");
        footer.appendChild(makeElement("span", "ticket-meta", "Créé le " + formatDate(ticket.createdAt)));
        var controlWrap = makeElement("label", "status-control");
        var controlLabel = makeElement("span", "", "Statut");
        var select = makeElement("select", "field-select");
        select.setAttribute("aria-label", "Modifier le statut de " + ticket.title);
        Object.keys(statusDefinitions).forEach(function (status) {
          var option = makeElement("option", "", statusDefinitions[status].label);
          option.value = status;
          option.selected = status === ticket.status;
          select.appendChild(option);
        });
        select.addEventListener("change", function () { updateStatus(ticket, select); });
        controlWrap.appendChild(controlLabel);
        controlWrap.appendChild(select);
        footer.appendChild(controlWrap);
        card.appendChild(footer);
        return card;
      }

      function renderTickets() {
        var list = document.getElementById("ticketList");
        var filtered = tickets.filter(function (ticket) {
          var matchesStatus = activeFilter === "all" || ticket.status === activeFilter;
          var searchText = (ticket.title + " " + ticket.description).toLocaleLowerCase("fr");
          return matchesStatus && searchText.indexOf(searchTerm) !== -1;
        });
        list.innerHTML = "";
        document.getElementById("visibleCount").textContent = loadError ? "Chargement impossible" : filtered.length + (filtered.length > 1 ? " demandes" : " demande");

        if (!filtered.length) {
          var empty = makeElement("div", "empty-state");
          var icon = makeElement("div", "empty-icon");
          icon.setAttribute("aria-hidden", "true");
          icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M7 4h10a2 2 0 0 1 2 2v14l-7-3-7 3V6a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 9h6M9 12h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
          empty.appendChild(icon);
          var title = makeElement("p", "empty-title", loadError ? "Impossible de charger les demandes" : tickets.length ? "Aucune demande trouvée" : "Tout est calme pour le moment");
          var copy = makeElement("p", "empty-copy", loadError ? loadError : tickets.length ? "Essayez un autre filtre ou une autre recherche." : "Les nouvelles demandes apparaîtront ici.");
          empty.appendChild(title);
          empty.appendChild(copy);
          if (loadError) {
            var retry = makeElement("button", "secondary-button", "Réessayer");
            retry.type = "button";
            retry.style.marginTop = "14px";
            retry.addEventListener("click", loadTickets);
            empty.appendChild(retry);
          }
          list.appendChild(empty);
        } else {
          filtered.forEach(function (ticket) { list.appendChild(renderTicket(ticket)); });
        }
      }

      function render() {
        renderCounts();
        renderTickets();
      }

      async function loadTickets() {
        setConnection("checking", "Connexion à l’API…");
        try {
          var payload = await request("/api/tickets");
          var rows = Array.isArray(payload) ? payload : payload && (payload.tickets || payload.data);
          if (!Array.isArray(rows)) throw new Error("Réponse API invalide : la liste des tickets est absente.");
          tickets = rows.map(normalizeTicket).filter(Boolean);
          loadError = null;
          setConnection("online", "API connectée");
          render();
        } catch (error) {
          tickets = [];
          loadError = error.message;
          render();
          setConnection("offline", "API indisponible");
          showToast(error.message, true);
        }
      }

      async function updateStatus(ticket, select) {
        var previousStatus = ticket.status;
        var nextStatus = select.value;
        select.disabled = true;
        try {
          await request("/api/tickets/" + encodeURIComponent(ticket.id), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus })
          });
          ticket.status = nextStatus;
          render();
          showToast("Statut mis à jour.");
        } catch (error) {
          select.value = previousStatus;
          select.disabled = false;
          showToast(error.message, true);
        }
      }

      var form = document.getElementById("ticketForm");
      var titleInput = document.getElementById("titleInput");
      var descriptionInput = document.getElementById("descriptionInput");
      var submitButton = document.getElementById("submitButton");
      titleInput.addEventListener("input", function () {
        document.getElementById("titleCount").textContent = titleInput.value.length + " / 120";
      });
      descriptionInput.addEventListener("input", function () {
        document.getElementById("descriptionCount").textContent = descriptionInput.value.length + " / 2000";
      });

      form.addEventListener("submit", async function (event) {
        event.preventDefault();
        var title = titleInput.value.trim();
        var description = descriptionInput.value.trim();
        if (title.length < 3) {
          showToast("Le titre doit contenir au moins 3 caractères.", true);
          titleInput.focus();
          return;
        }
        if (description.length < 10) {
          showToast("La description doit contenir au moins 10 caractères.", true);
          descriptionInput.focus();
          return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Envoi en cours…";
        try {
          await request("/api/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: title, description: description })
          });
          form.reset();
          document.getElementById("titleCount").textContent = "0 / 120";
          document.getElementById("descriptionCount").textContent = "0 / 2000";
          activeFilter = "all";
          document.querySelectorAll(".nav-item").forEach(function (item) {
            item.classList.toggle("active", item.dataset.filter === "all");
          });
          showToast("Votre demande a bien été envoyée.");
          await loadTickets();
          titleInput.focus();
        } catch (error) {
          showToast(error.message, true);
        } finally {
          submitButton.disabled = false;
          submitButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>Envoyer la demande';
        }
      });

      document.querySelectorAll(".nav-item").forEach(function (item) {
        item.addEventListener("click", function () {
          activeFilter = item.dataset.filter;
          document.querySelectorAll(".nav-item").forEach(function (navItem) {
            navItem.classList.toggle("active", navItem === item);
          });
          renderTickets();
        });
      });

      document.getElementById("searchInput").addEventListener("input", function (event) {
        searchTerm = event.target.value.trim().toLocaleLowerCase("fr");
        renderTickets();
      });

      function openApiSettings() {
        var root = document.getElementById("modalRoot");
        root.innerHTML = "";
        var backdrop = makeElement("div", "modal-backdrop");
        var dialog = makeElement("section", "modal");
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "apiDialogTitle");
        var heading = makeElement("h2", "", "Connexion au backend");
        heading.id = "apiDialogTitle";
        dialog.appendChild(heading);
        dialog.appendChild(makeElement("p", "modal-copy", "Saisissez l’URL publique de votre API (par exemple https://mon-api.onrender.com). L’adresse est enregistrée uniquement dans ce navigateur."));
        var field = makeElement("input", "field");
        field.type = "url";
        field.placeholder = "https://mon-api.onrender.com";
        field.value = apiBase;
        field.setAttribute("aria-label", "URL de l’API");
        field.autocomplete = "url";
        dialog.appendChild(field);
        var hint = makeElement("p", "modal-copy", "Laissez vide si le frontend et l’API partagent la même origine.");
        hint.style.marginBottom = "0";
        dialog.appendChild(hint);
        var actions = makeElement("div", "modal-actions");
        var cancel = makeElement("button", "secondary-button", "Annuler");
        cancel.type = "button";
        var save = makeElement("button", "save-button", "Enregistrer et tester");
        save.type = "button";
        actions.appendChild(cancel);
        actions.appendChild(save);
        dialog.appendChild(actions);
        backdrop.appendChild(dialog);
        root.appendChild(backdrop);

        var escapeHandler = function (event) {
          if (event.key === "Escape" && root.contains(backdrop)) close();
        };
        function close() {
          document.removeEventListener("keydown", escapeHandler);
          root.innerHTML = "";
          document.getElementById("connectionButton").focus();
        }
        cancel.addEventListener("click", close);
        backdrop.addEventListener("click", function (event) { if (event.target === backdrop) close(); });
        field.addEventListener("keydown", function (event) { if (event.key === "Enter") save.click(); });
        document.addEventListener("keydown", escapeHandler);
        save.addEventListener("click", function () {
          var value = field.value.trim().replace(/\/+$/, "");
          if (value && !/^https?:\/\//i.test(value)) {
            showToast("L’adresse doit commencer par http:// ou https://.", true);
            field.focus();
            return;
          }
          apiBase = value;
          if (value) localStorage.setItem(API_STORAGE_KEY, value);
          else localStorage.removeItem(API_STORAGE_KEY);
          close();
          loadTickets();
        });
        field.focus();
      }

      document.getElementById("connectionButton").addEventListener("click", openApiSettings);
      loadTickets();
    }());
