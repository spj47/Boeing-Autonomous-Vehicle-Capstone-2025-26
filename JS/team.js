/*-- State --*/
let teamData = {};

/*-- DOM Elements --*/
// Modal & Overlay
const teamModal = document.getElementById("teamModal");
const overlayBackdrop = document.getElementById("overlayBackdrop");
const closeBtn = document.querySelector(".team-modal-close");

// Modal Fields
const teamImg = document.getElementById("teamImg");
const teamName = document.getElementById("teamName");
const teamRoleOne = document.getElementById("teamRoleOne");
const teamRoleTwo = document.getElementById("teamRoleTwo");
const teamLinkedIn = document.getElementById("teamLinkedIn");
const teamBio = document.getElementById("teamBio");

/*-- Team Cards --*/
function initTeamCards() {
  document.querySelectorAll(".team-card").forEach(card => {
    const memberKey = card.dataset.member;
    const memberData = teamData[memberKey];

    if (!memberData) return;

    setupCardLinkedIn(card, memberData.linkedin);
    card.addEventListener("click", () => openTeamModal(memberData));
  });
}

function setupCardLinkedIn(card, linkedin) {
  const link = card.querySelector("a");
  if (!link) return;

  if (linkedin && linkedin !== "#") {
    link.href = linkedin;
    link.target = "_blank";
  } else {
    link.href = "#";
  }

  // Prevent LinkedIn click from opening modal
  link.addEventListener("click", e => e.stopPropagation());
}

/*-- Modal Logic --*/
function openTeamModal(data) {
  document.body.style.overflow = "hidden";

  teamImg.loading = "lazy";
  teamImg.src = data.img;
  
  teamName.textContent = data.name;
  teamRoleOne.textContent = data.roleone;
  teamRoleTwo.textContent = data.roletwo;
  teamBio.textContent = data.bio;

  teamLinkedIn.href = data.linkedin || "#";
  teamLinkedIn.target = "_blank";

  showModal();
}

function showModal() {
  overlayBackdrop.classList.remove("hidden");
  teamModal.classList.remove("hidden");

  requestAnimationFrame(() => {
    overlayBackdrop.classList.add("show");
    teamModal.classList.add("show");
  });
}

function closeTeamModal() {
  document.body.style.overflow = "";
  teamModal.classList.remove("show");
  overlayBackdrop.classList.remove("show");

  setTimeout(() => {
    teamModal.classList.add("hidden");
    overlayBackdrop.classList.add("hidden");
  }, 250);
}

/*-- Event Listeners --*/
closeBtn?.addEventListener("click", closeTeamModal);

// Close modal when clicking backdrop
teamModal.addEventListener("click", e => {
  if (e.target === teamModal) {
    closeTeamModal();
  }
});

/*-- Data Fetch --*/
fetch("Json/teamData.json")
  .then(res => res.json())
  .then(data => {
    teamData = data;
    initTeamCards();
  })
  .catch(err => console.error("Error loading team data:", err));
