/*-- DOM Elements --*/
let navbar;
let navToggle;
let navMenu;

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
  navbar = document.querySelector(".navbar");
  navToggle = document.querySelector(".nav-toggle");
  navMenu = document.querySelector(".nav-right");

  initScrollShadow();
  initMobileMenu();
}


/*-- Place Navbar in DOC --*/
fetch("HTML_Utilities/nav.html")
  .then(response => response.text())
  .then(data => {
    document.getElementById("navbar-wrapper").innerHTML = data;

    // Init the Navbar
    initNavbar();
  });
