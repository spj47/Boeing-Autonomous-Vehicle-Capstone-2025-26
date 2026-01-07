/*-- State --*/
let fadeElements = [];

/*-- DOM Elements --*/
const fadeObserverOptions = {
  threshold: 0.2
};

/*-- Intersection Observer --*/
let fadeObserver;

/*-- Initialization --*/
function initFadeElements() {
  fadeElements = document.querySelectorAll(".fade-in");

  if (fadeElements.length === 0) return;

  fadeObserver = new IntersectionObserver(handleFadeIn, fadeObserverOptions);

  fadeElements.forEach(el => fadeObserver.observe(el));
}

/*-- Observer Callback --*/
function handleFadeIn(entries, observer) {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;

    entry.target.classList.add("visible");
    observer.unobserve(entry.target);
  });
}

/*-- Event Listeners --*/
document.addEventListener("DOMContentLoaded", initFadeElements);
