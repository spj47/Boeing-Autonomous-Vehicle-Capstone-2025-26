/*-- State --*/
let isLoading = true;
let folderTree = {};
let currentPath = [];

/*-- DOM Elements --*/
const overlay = document.getElementById("overlayPanel");
const overlayDocs = document.getElementById("overlayDocs");
const overlayTitle = document.getElementById("overlayTitle");
const overlayClose = document.getElementById("overlayClose");
const overlayBackdrop = document.getElementById("overlayBackdrop");
const loadingSpinner = document.getElementById("loadingSpinner");
const docsGrid = document.getElementById("docsGrid");
const serverWarning = document.getElementById("serverWarning");
const loadFailed = document.getElementById("loadFailed");

/*-- Spinner Logic --*/
function showSpinner() {
  loadingSpinner.classList.remove("hidden");
  loadingSpinner.style.display = "flex";

  overlayBackdrop.classList.remove("hidden");
  requestAnimationFrame(() => overlayBackdrop.classList.add("show"));
}

function hideSpinner() {
  loadingSpinner.classList.add("hidden");
  loadingSpinner.style.display = "none";

  overlayBackdrop.classList.remove("show");
  setTimeout(() => overlayBackdrop.classList.add("hidden"), 250);
}

/*-- Helpers --*/
function mimeTypeToIcon(mimeType) {
  switch (mimeType) {
    case "pdf": return "pdf";
    case "vnd.openxmlformats-officedocument.wordprocessingml.document": return "docx";
    case "vnd.openxmlformats-officedocument.spreadsheetml.sheet": return "excel";
    case "vnd.openxmlformats-officedocument.presentationml.presentation": return "pptx";
    case "zip": return "zip";
    default: return "NoIcon";
  }
}

function addToTree(path, file) {
  const parts = path.split("/").slice(1); // skip root
  let node = folderTree;

  parts.forEach((part, i) => {
    if (!node[part]) node[part] = { _files: [] };
    if (i === parts.length - 1) node[part]._files.push(file);
    node = node[part];
  });
}

/*-- Render Logic --*/
function renderTopLevelCards() {
  docsGrid.innerHTML = "";

  Object.keys(folderTree).forEach(folderName => {
    const card = document.createElement("div");
    card.classList.add("doc-card-section");
    card.dataset.path = folderName;
    card.innerHTML = `<span>${folderName}</span> <span class="arrow">→</span>`;
    docsGrid.appendChild(card);
  });

  attachTopLevelEvents();
}

function attachTopLevelEvents() {
  document.querySelectorAll(".doc-card-section").forEach(card => {
    card.addEventListener("click", () => {
      currentPath = [card.dataset.path];
      renderOverlay(currentPath);
    });
  });
}

function renderOverlay(pathArray) {
  let node = folderTree;
  for (const p of pathArray) node = node[p];

  overlayTitle.textContent = pathArray.length > 2
    ? ["..", ...pathArray.slice(-2)].join(" /")
    : pathArray.join(" /");

  overlayDocs.innerHTML = "";

  // Render subfolders
  Object.keys(node).forEach(key => {
    if (key === "_files") return;

    const subCard = document.createElement("div");
    subCard.classList.add("doc-card-section");
    subCard.dataset.path = [...pathArray, key].join("/");
    subCard.innerHTML = `<span>${key}</span> <span class="arrow">→</span>`;
    overlayDocs.appendChild(subCard);

    subCard.addEventListener("click", () => {
      currentPath.push(key);
      renderOverlay(currentPath);
    });
  });

  // Render files
  node._files.forEach(doc => {
    const iconType = mimeTypeToIcon(doc.type);
    const docCard = document.createElement("div");
    docCard.classList.add("doc-card-horizontal");
    docCard.innerHTML = `
      <img src="Images/Icons/${iconType}.webp" class="file-icon">
      <div class="doc-details">
        <h3 class="doc-name">${doc.name}</h3>
        <p class="doc-desc">${doc.path.split("/").slice(2).join("/")}${doc.desc ? " - " + doc.desc : ""}</p>
        <p class="doc-date">Added: ${doc.date}</p>
      </div>
      <a href="${doc.link}" target="_blank" class="download-btn">Preview</a>
    `;
    overlayDocs.appendChild(docCard);
  });

  // Show overlay
  overlay.classList.remove("hidden");
  overlayBackdrop.classList.remove("hidden");
  requestAnimationFrame(() => {
    overlay.classList.add("show");
    overlayBackdrop.classList.add("show");
  });
}

/*-- Overlay Navigation --*/
function goBack() {
  if (currentPath.length <= 1) {
    closeOverlay();
  } else {
    currentPath.pop();
    renderOverlay(currentPath);
  }
}

function closeOverlay() {
  overlay.classList.remove("show");
  overlayBackdrop.classList.remove("show");

  setTimeout(() => {
    overlay.classList.add("hidden");
    overlayBackdrop.classList.add("hidden");
  }, 400);
}

/*-- Fallback fetch if google script cannot be used --*/
async function fetchDocumentsFromLocalFolder() {
  try {
    showSpinner();

    const response = await fetch("documents_output.json");

    if (!response.ok) throw new Error("Local JSON fetch failed");

    const json = await response.json();

    folderTree = {};
    json.data.forEach(section => {
      section.files.forEach(file => {
        addToTree(section.section, {
          name: file.documentName || file.name,
          desc: file.desc,
          date: file.date,
          type: file.type,
          link: file.link,
          path: section.section
        });
      });
    });

    console.info("Loaded documents from local JSON");
  } catch (error) {
    console.error("Failed to load local JSON", error);
    throw error; // propagate to fallback handler
  } finally {
    hideSpinner();
  }
}



/*-- Data Fetch --*/
async function fetchDocumentsData() {
  try {
    showSpinner();

    const response = await fetch(
      "https://script.google.com/macros/s/AKfycbz0aEzT4UXX9ZYukToveurjYK4rt4sptZ8NIyypu6U5mPfKsE2OKrfPKTnXPEKEfmKG/exec"
    );

    if (!response.ok) throw new Error("Server fetch failed");

    const json = await response.json();

    folderTree = {};
    json.data.forEach(section => {
      section.files.forEach(file => {
        addToTree(section.section, {
          name: file.documentName || file.name,
          desc: file.desc,
          date: file.date,
          type: file.type,
          link: file.link,
          path: section.section
        });
      });
    });

    console.info("Loaded documents from server");

  } catch (error) {
    console.error("Server failed, falling back to local Documents", error);
    try {
      await fetchDocumentsFromLocalFolder();
      serverWarning.classList.remove("hidden");
    } catch (fallbackError) {
      console.error("Local Documents fallback failed", fallbackError);
      loadFailed.classList.remove("hidden");
    }
  } finally {
    hideSpinner();
    overlayBackdrop.addEventListener("click", closeOverlay);
    renderTopLevelCards();
  }
}

/*-- Event Listeners --*/
overlayClose.addEventListener("click", goBack);

/*-- Initialize --*/
fetchDocumentsData();
