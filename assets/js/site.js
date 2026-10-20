// Shared behaviour for the sub-pages: icons and the mobile menu.
lucide.createIcons();

const menuToggle = document.querySelector(".menu-toggle");
const siteMenu = document.querySelector("#site-menu");

if (menuToggle && siteMenu) {
    menuToggle.addEventListener("click", () => {
        const isOpen = siteMenu.classList.toggle("is-open");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", (event) => {
        if (!siteMenu.contains(event.target) && !menuToggle.contains(event.target)) {
            siteMenu.classList.remove("is-open");
            menuToggle.setAttribute("aria-expanded", "false");
        }
    });
}

// Concept films play while on screen or hovered; the poster shows otherwise.
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
document.querySelectorAll(".concept").forEach((card) => {
    const video = card.querySelector("video");
    if (!video) return;
    const play = () => video.play().then(() => card.classList.add("is-playing")).catch(() => {});
    const pause = () => { video.pause(); card.classList.remove("is-playing"); };
    card.addEventListener("pointerenter", play);
    card.addEventListener("pointerleave", () => { if (!card.dataset.inView) pause(); });
    if (reduceMotion) return;
    new IntersectionObserver(([entry]) => {
        card.dataset.inView = entry.isIntersecting ? "1" : "";
        if (entry.isIntersecting) play();
        else pause();
    }, { threshold: 0.6 }).observe(card);
});

// Highlight the sub-nav link for the section in view.
const subLinks = [...document.querySelectorAll(".sub-nav a")];
if (subLinks.length) {
    const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            subLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`));
        });
    }, { rootMargin: "-45% 0px -50% 0px" });
    subLinks
        .map((a) => document.querySelector(a.getAttribute("href")))
        .filter(Boolean)
        .forEach((section) => spy.observe(section));
}
