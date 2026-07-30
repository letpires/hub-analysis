(function () {
  "use strict";

  var grid = document.getElementById("grid");
  var statusEl = document.getElementById("status");
  var emptyEl = document.getElementById("empty");
  var searchEl = document.getElementById("search");
  var filtersEl = document.getElementById("filters");
  var modal = document.getElementById("modal");
  var form = document.getElementById("add-form");
  var formError = document.getElementById("form-error");
  var submitBtn = document.getElementById("submit-add");

  // Upload de imagem
  var fileInput = document.getElementById("image-file");
  var uploadBtn = document.getElementById("upload-btn");
  var uploadLabel = document.getElementById("upload-label");
  var previewWrap = document.getElementById("upload-preview");
  var previewImg = document.getElementById("preview-img");
  var previewRemove = document.getElementById("preview-remove");

  var state = { items: [], tag: "", query: "" };

  // ---------- helpers ----------
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeUrl(url) {
    if (!url) return "";
    try {
      var u = new URL(url, window.location.href);
      return u.protocol === "http:" || u.protocol === "https:" ? u.href : "";
    } catch (e) {
      return "";
    }
  }

  // Converte links de compartilhamento comuns em URL direta de imagem,
  // para que posts antigos (ex.: link do Google Drive) também apareçam.
  function toDirectImage(url) {
    if (!url) return "";
    var m;
    // Google Drive: .../file/d/ID/view  ou  ...?id=ID  ou  open?id=ID
    m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/) ||
        url.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([^&]+)/);
    if (m) return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w1000";
    // GitHub blob -> raw
    m = url.match(/^https?:\/\/github\.com\/(.+?)\/blob\/(.+)$/);
    if (m) return "https://raw.githubusercontent.com/" + m[1] + "/" + m[2];
    // Dropbox -> raw
    if (/dropbox\.com\//.test(url)) {
      return url.replace(/([?&])dl=0/, "$1raw=1").replace(/([?&])dl=1/, "$1raw=1");
    }
    return url;
  }

  // ---------- rendering ----------
  function cardHtml(item) {
    var link = safeUrl(item.github_link);
    var img = safeUrl(toDirectImage(item.image_url));

    var thumb = img
      ? '<div class="card-thumb"><img src="' + esc(img) + '" alt="" loading="lazy" onerror="this.parentNode.innerHTML=\'<span class=&quot;placeholder&quot;>sem imagem</span>&#39;;"></div>'
      : '<div class="card-thumb"><span class="placeholder">📊 análise</span></div>';

    var linkHtml = link
      ? '<a class="card-link" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">Ver código →</a>'
      : '<span class="card-link soon">Em breve</span>';

    var desc = item.description
      ? '<p class="card-desc">' + esc(item.description) + "</p>"
      : '<p class="card-desc"></p>';

    return (
      '<article class="card">' +
      thumb +
      '<div class="card-body">' +
      '<span class="card-tag">' + esc(item.tag || "—") + "</span>" +
      '<h3 class="card-title">' + esc(item.title) + "</h3>" +
      desc +
      '<div class="card-foot">' +
      '<span class="card-author">por ' + esc(item.author || "anônimo") + "</span>" +
      linkHtml +
      "</div></div></article>"
    );
  }

  function applyFilters() {
    var q = state.query.trim().toLowerCase();
    var tag = state.tag;
    return state.items.filter(function (it) {
      if (tag && it.tag !== tag) return false;
      if (!q) return true;
      var hay = (
        (it.title || "") + " " + (it.description || "") + " " + (it.author || "")
      ).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  function render() {
    var rows = applyFilters();
    if (rows.length === 0) {
      grid.innerHTML = "";
      emptyEl.hidden = false;
    } else {
      emptyEl.hidden = true;
      grid.innerHTML = rows.map(cardHtml).join("");
    }
  }

  // ---------- data ----------
  function load() {
    statusEl.textContent = "Carregando análises…";
    statusEl.className = "status";
    fetch("/api/analyses")
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        state.items = Array.isArray(data) ? data : [];
        statusEl.textContent =
          state.items.length + " análise" + (state.items.length === 1 ? "" : "s");
        render();
      })
      .catch(function (err) {
        statusEl.textContent = "Não foi possível carregar as análises. " + err.message;
        statusEl.className = "status error";
      });
  }

  // ---------- modal ----------
  function openModal() {
    modal.hidden = false;
    formError.hidden = true;
    document.body.style.overflow = "hidden";
    var first = form.querySelector('input[name="title"]');
    if (first) first.focus();
  }
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  document.getElementById("open-add").addEventListener("click", openModal);
  var openAdd2 = document.getElementById("open-add-2");
  if (openAdd2) openAdd2.addEventListener("click", openModal);
  document.getElementById("close-add").addEventListener("click", closeModal);
  document.getElementById("cancel-add").addEventListener("click", closeModal);
  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  // ---------- upload de imagem (seleção + preview) ----------
  uploadBtn.addEventListener("click", function () {
    fileInput.click();
  });

  function clearFile() {
    fileInput.value = "";
    previewWrap.hidden = true;
    previewImg.removeAttribute("src");
    uploadLabel.textContent = "Escolher imagem…";
  }

  previewRemove.addEventListener("click", clearFile);

  fileInput.addEventListener("change", function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return clearFile();
    if (f.size > 5 * 1024 * 1024) {
      formError.textContent = "Imagem muito grande (máx. 5 MB).";
      formError.hidden = false;
      return clearFile();
    }
    formError.hidden = true;
    uploadLabel.textContent = f.name;
    var reader = new FileReader();
    reader.onload = function (ev) {
      previewImg.src = ev.target.result;
      previewWrap.hidden = false;
    };
    reader.readAsDataURL(f);
  });

  // Envia o arquivo para /api/upload e resolve com a URL pública (ou "").
  function uploadIfNeeded() {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return Promise.resolve("");
    var body = new FormData();
    body.append("file", f);
    return fetch("/api/upload", { method: "POST", body: body })
      .then(function (r) {
        return r.json().then(function (b) {
          if (!r.ok) throw new Error(b.error || "Falha no upload da imagem.");
          return b.url || "";
        });
      });
  }

  // ---------- submit ----------
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    formError.hidden = true;

    submitBtn.disabled = true;
    submitBtn.textContent = "Publicando…";

    uploadIfNeeded()
      .then(function (imageUrl) {
        var fd = new FormData(form);
        var payload = {
          title: fd.get("title"),
          description: fd.get("description"),
          tag: fd.get("tag"),
          author: fd.get("author"),
          github_link: fd.get("github_link"),
          image_url: imageUrl,
        };
        return fetch("/api/analyses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      })
      .then(function (r) {
        return r.json().then(function (body) {
          return { ok: r.ok, body: body };
        });
      })
      .then(function (res) {
        if (!res.ok) throw new Error(res.body.error || "Erro ao salvar.");
        // Aparece imediatamente no grid.
        state.items.unshift(res.body);
        state.query = "";
        searchEl.value = "";
        statusEl.textContent = state.items.length + " análises";
        render();
        form.reset();
        clearFile();
        closeModal();
      })
      .catch(function (err) {
        formError.textContent = err.message;
        formError.hidden = false;
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Publicar";
      });
  });

  // ---------- filters + search ----------
  filtersEl.addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    if (!chip) return;
    state.tag = chip.getAttribute("data-tag") || "";
    Array.prototype.forEach.call(filtersEl.querySelectorAll(".chip"), function (c) {
      c.classList.toggle("chip-active", c === chip);
    });
    render();
  });

  searchEl.addEventListener("input", function () {
    state.query = searchEl.value;
    render();
  });

  // ---------- go ----------
  load();

  // Abre o modal automaticamente quando vem da landing com ?add=1
  if (new URLSearchParams(window.location.search).get("add") === "1") {
    openModal();
    history.replaceState(null, "", window.location.pathname);
  }
})();
