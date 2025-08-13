/* ===========================
   Digital Library – script.js
   =========================== */

/* ---------- State ---------- */
let library = JSON.parse(localStorage.getItem("library") || "[]");
let currentBookId = null;
let editingBookId = null;
let editingAnnotationId = null;
let statFilter = "all"; // 'all' | 'questions' | 'non-questions'

// --- THEME INIT ---
(function initTheme(){
  const saved = localStorage.getItem("uiTheme") || "rose";
  document.body.setAttribute("data-theme", saved);
})();

/* ---------- Helpers ---------- */
const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const byId = (id) => document.getElementById(id);
const saveLibrary = () => localStorage.setItem("library", JSON.stringify(library));

function showPage(id) {
  $$(".page").forEach(p => p.classList.remove("active"));
  byId(id).classList.add("active");
}

/* ---------- Elements ---------- */
// Pages
const pageHome = byId("page-home");
const pageBook = byId("page-book");

// Lists
const bookList = byId("book-list");
const annotationList = byId("annotation-list");

// Modals
const modalBook = byId("modal-book");
const modalAnnotation = byId("modal-annotation");
const modalFabSelect = byId("fab-book-select");

// Inputs (book)
const inputBookTitle  = byId("input-book-title");
const inputBookAuthor = byId("input-book-author");
const inputBookPages  = byId("input-book-pages");

// Inputs (annotation)
const inputPage = byId("input-page");
const inputType = byId("input-type");
const inputText = byId("input-text");

// FAB select
const fabBookDropdown = byId("fab-book-dropdown");

/* ---------- Book List ---------- */
function renderBooks() {
  bookList.innerHTML = "";

  const search = (byId("search-book")?.value || "").toLowerCase();
  const sort   = (byId("sort-books")?.value || "title");

  const books = [...library]
    .filter(b =>
      b.title.toLowerCase().includes(search) ||
      b.author.toLowerCase().includes(search)
    )
    .sort((a,b) => (a[sort] || "").localeCompare(b[sort] || ""));

  books.forEach(book => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="book-item">
        <div class="book-info">
          <span>${(book.title || "").toUpperCase()}</span>
          <span>${(book.author || "").toUpperCase()}</span>
        </div>
      </div>
    `;
    li.addEventListener("click", () => openBook(book.id));
    bookList.appendChild(li);
  });
}

function openBook(id) {
  currentBookId = id;
  renderBookDetails();
  renderAnnotations();
  renderProgressBar();
  renderStats();
  showPage("page-book");
}

function renderBookDetails() {
  const book = library.find(b => b.id === currentBookId);
  if (!book) return;
  byId("book-title").textContent = book.title || "";
  byId("book-author").textContent = book.author || "";
}

/* ---------- Annotations ---------- */
function renderAnnotations() {
  const book = library.find(b => b.id === currentBookId);
  if (!book) return;

  const filter = byId("filter-annotations")?.value || "all";

  let notes = [...book.annotations];

  // Filtre par sélecteur
  if (filter !== "all") notes = notes.filter(n => n.type === filter);

  // Filtre par stats
  if (statFilter === "questions") notes = notes.filter(n => n.type === "question");
  if (statFilter === "non-questions") notes = notes.filter(n => n.type !== "question");

  // Tri par page
  notes.sort((a,b) => (a.page || 0) - (b.page || 0));

  annotationList.innerHTML = "";

  notes.forEach((n) => {
    const li = document.createElement("li");
    li.className = "annotation-card-li";

    // On garde un identifiant stable (pour édition / réordonnancement)
    const absIndex = book.annotations.indexOf(n);
    li.dataset.noteKey = String(absIndex);

    li.innerHTML = `
      <div class="annotation-type">${n.type}</div>
      <div class="annotation-text">${escapeHTML(n.text)}</div>
      <div class="annotation-page">p.${n.page || 0}</div>
    `;

    // Éditer au clic
    li.addEventListener("click", (e) => {
  e.stopPropagation();
  openAnnotationEditor(n);
});

    annotationList.appendChild(li);
  });
}

// Petite animation douce + réordonnancement en fin de pile
/*function liftAnnotationCard(li) {
  // Animation CSS légère
  li.style.transition = "transform .22s ease, box-shadow .22s ease";
  li.style.transform  = "translateY(-2px) scale(1.015)";
  li.style.boxShadow  = "0 16px 40px rgba(0,0,0,.12)";
  setTimeout(() => {
    li.style.transform = "";
    li.style.boxShadow = "";
  }, 240);

  // Le dernier enfant apparaît visuellement au-dessus vu notre pile superposée
  annotationList.appendChild(li);
}*/

function openAnnotationEditor(note) {
  editingAnnotationId = note.id;
  inputPage.value = note.page || "";
  inputType.value = note.type || "citation";
  inputText.value = note.text || "";
  modalAnnotation.classList.add("active");
}

function openAnnotationModal(defaultType = "citation") {
  editingAnnotationId = null;
  inputPage.value = "";
  inputType.value = defaultType;
  inputText.value = "";
  modalAnnotation.classList.add("active");
}

function saveAnnotation() {
  const page = parseInt(inputPage.value, 10) || 0;
  const type = inputType.value;
  const text = inputText.value.trim();

  const book = library.find(b => b.id === currentBookId);
  if (!book || !text) return;

  if (editingAnnotationId) {
    // édition
    const ann = book.annotations.find(a => a.id === editingAnnotationId);
    if (ann) {
      ann.page = page;
      ann.type = type;
      ann.text = text;
    }
  } else {
    // création
    book.annotations.push({
      id: String(Date.now()),
      page,
      type,
      text
    });
  }

  saveLibrary();
  modalAnnotation.classList.remove("active");
  renderAnnotations();
  renderProgressBar();
  renderStats();
}

function deleteAnnotation(id) {
  const book = library.find(b => b.id === currentBookId);
  if (!book) return;
  book.annotations = book.annotations.filter(a => a.id !== id);
  saveLibrary();
  renderAnnotations();
  renderProgressBar();
  renderStats();
}

/* ---------- Stats (Annotations vs Questions) ---------- */
function renderStats() {
  const book = library.find(b => b.id === currentBookId);
  if (!book) return;

  const questions = book.annotations.filter(n => n.type === "question").length;
  const nonQuestions = book.annotations.filter(n => n.type !== "question").length;

  const elA = byId("count-annotations");
  const elQ = byId("count-questions");
  if (elA) elA.textContent = String(nonQuestions);
  if (elQ) elQ.textContent = String(questions);

  // état visuel des boutons
  const btnA = byId("stat-annotations");
  const btnQ = byId("stat-questions");
  if (btnA) btnA.setAttribute("aria-pressed", String(statFilter === "non-questions"));
  if (btnQ) btnQ.setAttribute("aria-pressed", String(statFilter === "questions"));
}

/* ---------- Progress Bar (segments + marqueurs + ?) ---------- */
function renderProgressBar(){
  const track = document.getElementById("progress-track");
  const marks = document.getElementById("progress-marks");
  if(!track || !marks) return;

  marks.innerHTML = "";

  const book = library.find(b => b.id === currentBookId);
  if(!book) return;

  const maxPageInNotes = book.annotations.length
    ? Math.max(...book.annotations.map(n => Number(n.page)||0))
    : 0;
  const totalPages = Math.max(Number(book.pages||0), maxPageInNotes, 1);

  // Taille relative par rapport à la plus longue annotation
  const lengths = book.annotations.map(n => (n.text||"").length || 1);
  const maxLen  = Math.max(...lengths, 1);

  book.annotations.forEach(n=>{
    const pctLeft = (Math.min(Math.max(Number(n.page)||0, 0), totalPages) / totalPages) * 100;

    // largeur en % proportionnelle à la taille du texte (bornée pour rester élégante)
    const len = (n.text||"").length || 1;
    const widthPct = Math.max(1.6, Math.min(18, (len / maxLen) * 12 + 2)); // 2–18%

    const tick = document.createElement("div");
    tick.className = "progress-tick";
    tick.dataset.type = n.type;   // pour la couleur via CSS
    tick.style.left = `${pctLeft}%`;
    tick.style.width = `${widthPct}%`;

    // petit tooltip natif
    tick.title = `${n.type} • p.${n.page}`;

    marks.appendChild(tick);
  });

  const start = document.getElementById("progress-start");
  const end   = document.getElementById("progress-end");
  if (start){
  start.textContent = "";         // pas de "1"
  start.style.visibility = "hidden";
}
if (end) end.textContent = String(totalPages);
}


/* ---------- Books CRUD ---------- */
function openBookModal(book = null) {
  if (book) {
    editingBookId = book.id;
    inputBookTitle.value  = book.title  || "";
    inputBookAuthor.value = book.author || "";
    inputBookPages.value  = book.pages  || "";
  } else {
    editingBookId = null;
    inputBookTitle.value  = "";
    inputBookAuthor.value = "";
    inputBookPages.value  = "";
  }
  modalBook.classList.add("active");
}

function saveBook() {
  const title  = (inputBookTitle.value || "").trim();
  const author = (inputBookAuthor.value || "").trim();
  const pages  = parseInt(inputBookPages.value, 10) || null;
  if (!title || !author) return;

  if (editingBookId) {
    // edit
    const book = library.find(b => b.id === editingBookId);
    if (book) {
      book.title = title;
      book.author = author;
      book.pages = pages;
    }
  } else {
    // create
    library.push({
      id: String(Date.now()),
      title, author, pages,
      annotations: []
    });
  }

  saveLibrary();
  modalBook.classList.remove("active");
  renderBooks();

  // si on est sur la page du livre en cours
  if (currentBookId) {
    renderBookDetails();
    renderProgressBar();
    renderStats();
  }
}

function deleteBook(id) {
  if (!confirm("Supprimer ce livre ?")) return;
  library = library.filter(b => b.id !== id);
  saveLibrary();
  showHome();
}

/* ---------- Navigation ---------- */
function showHome() {
  currentBookId = null;
  statFilter = "all";
  showPage("page-home");
  renderBooks();
}

/* ---------- Events (Header / Controls) ---------- */
byId("btn-back")?.addEventListener("click", showHome);

byId("btn-edit-book")?.addEventListener("click", () => {
  const book = library.find(b => b.id === currentBookId);
  if (book) openBookModal(book);
});

byId("btn-delete-book")?.addEventListener("click", () => {
  if (!currentBookId) return;
  deleteBook(currentBookId);
});

byId("btn-add-annotation")?.addEventListener("click", () => {
  if (!currentBookId) return;
  openAnnotationModal("citation");
});

byId("save-book")?.addEventListener("click", saveBook);
byId("cancel-book")?.addEventListener("click", () => modalBook.classList.remove("active"));

byId("save-annotation")?.addEventListener("click", saveAnnotation);
byId("cancel-annotation")?.addEventListener("click", () => modalAnnotation.classList.remove("active"));

// Fermer modales en cliquant le backdrop
$$(".modal").forEach(m => {
  m.addEventListener("click", e => { if (e.target === m) m.classList.remove("active"); });
});

// Filtres
byId("search-book")?.addEventListener("input", renderBooks);
byId("sort-books")?.addEventListener("change", renderBooks);
byId("filter-annotations")?.addEventListener("change", () => {
  statFilter = "all"; // éviter double-filtre déroutant
  renderAnnotations(); renderProgressBar(); renderStats();
});

/* ---------- Stats toggles ---------- */
byId("stat-annotations")?.addEventListener("click", () => {
  statFilter = (statFilter === "non-questions") ? "all" : "non-questions";
  const sel = byId("filter-annotations"); if (sel) sel.value = "all";
  renderAnnotations(); renderProgressBar(); renderStats();
});

byId("stat-questions")?.addEventListener("click", () => {
  statFilter = (statFilter === "questions") ? "all" : "questions";
  const sel = byId("filter-annotations"); if (sel) sel.value = "all";
  renderAnnotations(); renderProgressBar(); renderStats();
});

/* ---------- FAB (expandable) ---------- */
const fab = byId("fab");
const fabMain = byId("fab-main");
const fabAddBook = byId("fab-add-book");
const fabAddAnnotation = byId("fab-add-annotation");
const fabAddQuestion = byId("fab-add-question");

fabMain?.addEventListener("click", () => {
  fab?.classList.toggle("open");
});

// Ajout livre direct
fabAddBook?.addEventListener("click", () => {
  fab?.classList.remove("open");
  openBookModal();
});

// Ajout annotation / question : si pas sur un livre → choisir un livre d’abord
let fabPendingType = null;

function openFabBookSelect(type) {
  fabPendingType = type;
  fabBookDropdown.innerHTML = "";
  library.forEach(book => {
    const opt = document.createElement("option");
    opt.value = book.id;
    opt.textContent = `${book.title} — ${book.author}`;
    fabBookDropdown.appendChild(opt);
  });
  modalFabSelect.classList.add("active");
}

fabAddAnnotation?.addEventListener("click", () => {
  fab?.classList.remove("open");
  if (currentBookId) {
    openAnnotationModal("citation");
  } else {
    openFabBookSelect("annotation");
  }
});

fabAddQuestion?.addEventListener("click", () => {
  fab?.classList.remove("open");
  if (currentBookId) {
    openAnnotationModal("question");
  } else {
    openFabBookSelect("question");
  }
});

byId("fab-book-cancel")?.addEventListener("click", () => {
  modalFabSelect.classList.remove("active");
});

byId("fab-book-continue")?.addEventListener("click", () => {
  const chosenId = fabBookDropdown.value;
  modalFabSelect.classList.remove("active");
  currentBookId = chosenId;
  if (fabPendingType === "annotation") {
    openBook(currentBookId); // pour afficher la page du livre
    openAnnotationModal("citation");
  } else if (fabPendingType === "question") {
    openBook(currentBookId);
    openAnnotationModal("question");
  }
});

// --- THEME PICKER ---
const btnTheme   = document.getElementById("btn-theme");
const themeSheet = document.getElementById("theme-sheet");

if (btnTheme && themeSheet) {
  btnTheme.addEventListener("click", () => {
    themeSheet.classList.toggle("open");
  });

  themeSheet.querySelectorAll(".theme-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      const theme = pill.getAttribute("data-theme");
      document.body.setAttribute("data-theme", theme);
      localStorage.setItem("uiTheme", theme);
      themeSheet.classList.remove("open");
    });
  });

  // fermer si on clique ailleurs
  document.addEventListener("click", (e) => {
    if (!themeSheet.contains(e.target) && e.target !== btnTheme) {
      themeSheet.classList.remove("open");
    }
  });
}


/* ---------- Import / Export ---------- */
// Export JSON
// Export JSON (amélioré iOS : Web Share si dispo)
byId("btn-export-json")?.addEventListener("click", async () => {
  const json = JSON.stringify(library);
  try {
    const file = new File([json], "library.json", { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "Digital Library", text: "Export JSON" });
      return;
    }
  } catch(e){ /* silencieux, on passe au fallback */ }

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "library.json";
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(url);

  alert('Sur iPhone, le fichier est disponible dans l’app "Fichiers" → Téléchargements.');
});

// Import JSON
byId("btn-import")?.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data)) {
          library = data;
          saveLibrary();
          renderBooks();
        } else {
          alert("Fichier JSON invalide.");
        }
      } catch (err) {
        alert("Impossible de lire le fichier JSON.");
      }
    };
    reader.readAsText(file);
  };
  input.click();
});

// Export PDF (jsPDF inclus dans index.html)
byId("btn-export-pdf")?.addEventListener("click", () => {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) return;
  const book = library.find(b => b.id === currentBookId);
  if (!book) return;

  const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Annotations de "${book.title}"`, 10, 10);
  doc.setFontSize(12);
  doc.text(`Auteur : ${book.author || "-"}`, 10, 18);

  let y = 28;
  book.annotations
    .slice()
    .sort((a,b) => (a.page||0) - (b.page||0))
    .forEach(n => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "normal");
      doc.text(`[p.${n.page||0}] (${n.type}) ${n.text}`, 10, y);
      y += 8;
    });

  doc.save(`${book.title || "annotations"}.pdf`);
});

/* ---------- Utils ---------- */
function escapeHTML(str) {
  return (str || "").replace(/[&<>'"]/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"
  }[c]));
}

// Auto-grow pour <textarea class="auto-grow">
function autosize(el){
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}
function enableAutosize(selector){
  document.addEventListener('input', e=>{
    if(e.target.matches(selector)) autosize(e.target);
  });
  document.querySelectorAll(selector).forEach(autosize);
}

/* Hauteur viewport fiable sur mobile (iOS) */
function setVH(){
  document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
}
window.addEventListener('resize', setVH);
window.addEventListener('orientationchange', setVH);
setVH();

/* Auto-grow pour le textarea d'annotation */
enableAutosize('#input-text');

/* ---------- Init ---------- */
renderBooks();
