// Shared UI on every page: "Show more" for long lists and a floating
// booking button. Works with or without the motion layer.
(() => {
    const BOOKING_URL = "https://calendly.com/princeardiabah/lets-automate-your-workflow";

    // Long lists: show the first N children and put the rest behind a button.
    // <div data-collapse="3" data-collapse-label="systems">…</div>
    document.querySelectorAll("[data-collapse]").forEach((list) => {
        const keep = Number(list.dataset.collapse);
        const extra = [...list.children].slice(keep);
        if (!extra.length) return;
        const label = list.dataset.collapseLabel || "more";
        extra.forEach((el) => el.classList.add("is-collapsed"));

        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn show-more";
        button.setAttribute("aria-expanded", "false");
        const render = (open) => {
            button.innerHTML = open
                ? `Show less <i data-lucide="chevron-up"></i>`
                : `Show ${extra.length} more ${label} <i data-lucide="chevron-down"></i>`;
            window.lucide?.createIcons();
        };
        render(false);
        list.after(button);

        button.addEventListener("click", () => {
            const open = button.getAttribute("aria-expanded") !== "true";
            button.setAttribute("aria-expanded", String(open));
            extra.forEach((el, i) => {
                el.classList.toggle("is-collapsed", !open);
                if (open) {
                    el.style.setProperty("--d", `${Math.min(i, 6) * 70}ms`);
                    el.classList.add("is-unfolding");
                    el.addEventListener("animationend", () => el.classList.remove("is-unfolding"), { once: true });
                }
            });
            render(open);
            if (!open) list.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    // Floating "Book a call" button: appears after the header, hides near
    // the page's own booking section so the two never compete.
    const hero = document.querySelector(".hero, .page-hero");
    const finale = document.querySelector("#contact, #book");
    if (!hero) return;
    const fab = document.createElement("a");
    fab.className = "book-fab";
    fab.href = BOOKING_URL;
    fab.target = "_blank";
    fab.rel = "noreferrer";
    fab.innerHTML = `<span class="book-fab-dot"></span>Book a 30-min call <i data-lucide="calendar"></i>`;
    document.body.append(fab);
    window.lucide?.createIcons();

    let pastHero = false;
    let atFinale = false;
    const update = () => fab.classList.toggle("is-visible", pastHero && !atFinale);
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; update(); }).observe(hero);
    if (finale) new IntersectionObserver(([e]) => { atFinale = e.isIntersecting; update(); }, { threshold: 0.15 }).observe(finale);
})();

// Event photos and flyers aren't meant to be saved: block the context menu,
// dragging and long-press save on them.
document.querySelectorAll("[data-protect]").forEach((area) => {
    area.addEventListener("contextmenu", (e) => { if (e.target.closest("img")) e.preventDefault(); });
    area.addEventListener("dragstart", (e) => e.preventDefault());
});
