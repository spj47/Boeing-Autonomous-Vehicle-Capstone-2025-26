/*-- State --*/
let galleryData = {};
let galleryImages = [];
let galleryIndex = 0;
let isLoading = true;
let pendingGalleryKey = null;
let carouselImageSelected = false;
let currentImage = null;

/*-- DOM Elements --*/
// Modal & Overlay
const galleryModal = document.getElementById("galleryModal");
const overlayBackdrop = document.getElementById("overlayBackdrop");
const closeGalleryBtn = document.getElementById("closeGallery");

// Carousel Elements
const prevImage = document.getElementById("prevImage");
const carouselImage = document.getElementById("carouselImage");
const nextImage = document.getElementById("nextImage");
const prevBtn = document.getElementById("prevImg");
const nextBtn = document.getElementById("nextImg");

// Modal Content
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");

// Loading Spinner
const loadingSpinner = document.getElementById("loadingSpinner");
const EMPTY_IMG =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

/*-- Helpers --*/
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

function getThumbnailOfSize(thumbnail, w, h) {
  return `${thumbnail}&sz=w${w}-h${h}`;
}

function resetModalImages() {
  prevImage.src = EMPTY_IMG;
  carouselImage.src = EMPTY_IMG;
  nextImage.src = EMPTY_IMG;

  modalTitle.textContent = "";
  modalDescription.textContent = "";

  carouselImage.classList.remove("selected");
  carouselImageSelected = false;
}

/*-- Modal Logic --*/
function openGallery(key) {
  galleryImages = galleryData[key] || [];
  galleryIndex = 0;

  if (!galleryImages.length) return;

  resetModalImages();

  galleryModal.classList.remove("hidden");
  overlayBackdrop.classList.remove("hidden");

  requestAnimationFrame(() => {
    galleryModal.classList.add("show");
    overlayBackdrop.classList.add("show");
  });

  updateModal();
}

function closeGallery() {
  galleryModal.classList.remove("show");
  overlayBackdrop.classList.remove("show");

  setTimeout(() => {
    galleryModal.classList.add("hidden");
    overlayBackdrop.classList.add("hidden");
  }, 250);
}

function loadMainImage(src) {
  const img = new Image();
  img.onload = () => (carouselImage.src = src);
  img.src = src;
}

function updateModal() {
  const prev =
    galleryImages[(galleryIndex - 1 + galleryImages.length) % galleryImages.length];
  currentImage = galleryImages[galleryIndex];
  const next = galleryImages[(galleryIndex + 1) % galleryImages.length];

  prevImage.src = getThumbnailOfSize(prev.thumb, 200, 200);
  nextImage.src = getThumbnailOfSize(next.thumb, 200, 200);

  loadMainImage(getThumbnailOfSize(currentImage.thumb, 600, 600));

  modalTitle.textContent = currentImage.title;
  modalDescription.textContent = currentImage.description;
}

function setCurrentPicture(isLarge) {
  if (!currentImage) return;
  const size = isLarge ? 2048 : 600;
  carouselImage.src = getThumbnailOfSize(currentImage.thumb, size, size);
}

/*-- Event Listeners --*/
// Close modal
closeGalleryBtn?.addEventListener("click", closeGallery);
galleryModal.addEventListener("click", e => {
  if (e.target === galleryModal) closeGallery();
});

// Navigation
prevBtn?.addEventListener("click", () => {
  if (!galleryImages.length) return;
  galleryIndex = (galleryIndex - 1 + galleryImages.length) % galleryImages.length;
  carouselImageSelected = false;
  carouselImage.classList.remove("selected");
  updateModal();
});

nextBtn?.addEventListener("click", () => {
  if (!galleryImages.length) return;
  galleryIndex = (galleryIndex + 1) % galleryImages.length;
  carouselImageSelected = false;
  carouselImage.classList.remove("selected");
  updateModal();
});

// Expand/collapse main image
carouselImage?.addEventListener("click", () => {
  carouselImageSelected = !carouselImageSelected;
  setCurrentPicture(carouselImageSelected);
  carouselImage.classList.toggle("selected", carouselImageSelected);
});

// Gallery buttons
document.querySelectorAll(".gallery-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.gallery;
    if (isLoading) {
      pendingGalleryKey = key;
      showSpinner();
      return;
    }
    openGallery(key);
  });
});

/*-- Data Fetch --*/
fetch(
  "https://script.google.com/macros/s/AKfycbw3LRKCPxRKN8UXcu9dm1cbagts9xgGG7NkTSOObN6y8YuYx9rarVe2OokddW533Yd8/exec"
)
  .then(res => res.json())
  .then(json => {
    json.data.forEach(section => {
      galleryData[section.section] = section.files.map(file => {
        const rawName = file.galleryName || "";
        const title = rawName.includes(".") ? rawName.replace(/\.[^/.]+$/, "") : rawName;
        return {
          thumb: file.thumbnail,
          full: file.url,
          title,
          description: file.description || ""
        };
      });
    });

    isLoading = false;
    hideSpinner();

    if (pendingGalleryKey) {
      openGallery(pendingGalleryKey);
      pendingGalleryKey = null;
    }
  })
  .catch(err => {
    console.error("Failed to load gallery data:", err);
    isLoading = false;
    hideSpinner();
  });
