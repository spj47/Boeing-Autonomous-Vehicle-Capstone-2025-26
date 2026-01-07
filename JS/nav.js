/*-- DOM Elements --*/
const navbar = document.querySelector(".navbar");
const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav-right");

/*-- Navbar Shadow on Scroll --*/
function handleScroll() {
  navbar.classList.toggle("scrolled", window.scrollY > 0);
}

function initScrollShadow() {
  window.addEventListener("scroll", handleScroll);
  handleScroll(); // Apply shadow on load if needed
}

/*-- Mobile Menu Toggle --*/
function toggleMobileMenu() {
  const isOpen = navMenu.classList.toggle("active");
  navToggle.setAttribute("aria-expanded", isOpen);
}

function initMobileMenu() {
  navToggle.addEventListener("click", toggleMobileMenu);
}

/*-- Initialization --*/
function initNavbar() {
  initScrollShadow();
  initMobileMenu();
}

/*-- Init --*/
initNavbar();
