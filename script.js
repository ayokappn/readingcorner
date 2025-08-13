let library = JSON.parse(localStorage.getItem("library") || "[]");
let currentBookId = null;

function saveLibrary() {
  localStorage.setItem("library", JSON.stringify(library));
}

function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// Rendu liste livres
function renderBooks() {
  const search = document.getElementById("search-book").value.toLowerCase();
  const sort = document.getElementById("sort-books").value;
  let books = library.filter(b =>
    b.title.toLowerCase().includes(search) ||
    b.author.toLowerCase().includes(search)
  );
  books.sort((a,b) => a[sort].localeCompare(b[sort]));
  const list = document.getElementById("book-list");
  list.innerHTML = "";
  books.forEach(book => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${book.title}</span><span>${book.author}</span>`;
    li.addEventListener("click", () => openBook(book.id));
    list.appendChild(li);
  });
}

// Ouvrir un livre
function openBook(id) {
  currentBookId = id;
  const book = library.find(b => b.id === id);
  document.getElementById("book-title").textContent = book.title;
  document.getElementById("book-author").textContent = book.author;
  renderAnnotations();
  showPage("page-book");
}

function renderAnnotations() {
  const filter = document.getElementById("filter-annotations").value;
  const book = library.find(b => b.id === currentBookId);
  let notes = [...book.annotations];
  if (filter !== "all") notes = notes.filter(n => n.type === filter);
  notes.sort((a,b) => a.page - b.page);
  
  const list = document.getElementById("annotation-list");
  list.innerHTML = "";

  notes.forEach(n => {
    const li = document.createElement("li");

    const typeEl = document.createElement("div");
    typeEl.className = "annotation-type";
    typeEl.textContent = n.type;

    const textEl = document.createElement("div");
    textEl.className = "annotation-text";
    textEl.textContent = n.text;

    const pageEl = document.createElement("div");
    pageEl.className = "annotation-page";
    pageEl.textContent = `p.${n.page}`;

    li.appendChild(typeEl);
    li.appendChild(textEl);
    li.appendChild(pageEl);

    list.appendChild(li);
  });
}


// Add livre
document.getElementById("btn-add-book").onclick = () => {
  document.getElementById("modal-book-title").textContent = "Ajouter un livre";
  document.getElementById("input-book-title").value = "";
  document.getElementById("input-book-author").value = "";
  document.getElementById("modal-book").classList.add("active");
};
document.getElementById("save-book").onclick = () => {
  const title = document.getElementById("input-book-title").value.trim();
  const author = document.getElementById("input-book-author").value.trim();
  if (!title || !author) return;
  library.push({id: Date.now(), title, author, annotations: []});
  saveLibrary();
  renderBooks();
  document.getElementById("modal-book").classList.remove("active");
};

// Add annotation
document.getElementById("btn-add-annotation").onclick = () => {
  document.getElementById("modal-annotation").classList.add("active");
};
document.getElementById("save-annotation").onclick = () => {
  const page = parseInt(document.getElementById("input-page").value, 10);
  const type = document.getElementById("input-type").value;
  const text = document.getElementById("input-text").value.trim();
  if (!page || !text) return;
  const book = library.find(b => b.id === currentBookId);
  book.annotations.push({page, type, text});
  saveLibrary();
  renderAnnotations();
  document.getElementById("modal-annotation").classList.remove("active");
};

// Export JSON
document.getElementById("btn-export-json").onclick = () => {
  const blob = new Blob([JSON.stringify(library)], {type: "application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "library.json";
  a.click();
};

// Import JSON
document.getElementById("btn-import").onclick = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      library = JSON.parse(reader.result);
      saveLibrary();
      renderBooks();
    };
    reader.readAsText(file);
  };
  input.click();
};

// Export PDF avec jsPDF
document.getElementById("btn-export-pdf").onclick = () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const book = library.find(b => b.id === currentBookId);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Annotations de "${book.title}"`, 10, 10);
  doc.setFontSize(12);
  doc.text(`Auteur : ${book.author}`, 10, 18);

  let y = 28;
  book.annotations.sort((a,b) => a.page - b.page).forEach(n => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "normal");
    doc.text(`[p.${n.page}] (${n.type}) ${n.text}`, 10, y);
    y += 8;
  });

  doc.save(`${book.title}-annotations.pdf`);
};

document.getElementById("btn-back").onclick = () => showPage("page-home");

// Filters & search
document.getElementById("search-book").oninput = renderBooks;
document.getElementById("sort-books").onchange = renderBooks;
document.getElementById("filter-annotations").onchange = renderAnnotations;

// Init
renderBooks();
