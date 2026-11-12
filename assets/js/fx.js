// Motion layer shared by every page, kept deliberately quiet: the headline
// rises word by word and sections ease in as they scroll into view.
// All of it switches off for reduced motion.
(() => {
    const root = document.documentElement;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The active tab gets a pill element that view transitions carry between pages.
    const active = document.querySelector('.page-tabs a[aria-current="page"]');
    if (active) {
        const pill = document.createElement("span");
        pill.className = "tab-pill";
        active.prepend(pill);
        active.classList.add("has-pill");
    }

    if (reduceMotion) return;
    root.classList.add("fx-ready");

    // Headline: split into words that rise in sequence
    const h1 = document.querySelector(".hero h1, .page-hero h1");
    if (h1) {
        let i = 0;
        const split = (node) => {
            [...node.childNodes].forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) {
                    const frag = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach((part) => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.append(part); return; }
                        const outer = document.createElement("span");
                        outer.className = "fx-word";
                        const inner = document.createElement("span");
                        inner.textContent = part;
                        inner.style.setProperty("--d", `${120 + i++ * 70}ms`);
                        outer.append(inner);
                        frag.append(outer);
                    });
                    child.replaceWith(frag);
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    split(child);
                }
            });
        };
        split(h1);
    }

    // Scroll reveals, staggered among siblings
    const revealSelectors = [
        ".section-head > *", ".hero-copy", ".hero-actions", ".chip-row", ".eyebrow",
        ".stat", ".build-card", ".process-step", ".sector-card", ".case-study",
        ".media-card", ".explore-card", ".product", ".offer", ".audience",
        ".quote-card", ".faq details", ".topic", ".format", ".event", ".cta-band",
        ".about-copy", ".insight-panel", ".orbit-panel", ".portrait-card",
        ".contact > *", ".site-footer", ".role-card", ".pins-wrap", ".impact", ".app-feature",
        ".concept", ".portal", ".pins-head", ".built-live-photo", ".built-live-copy",
    ];
    // Reveal once a meaningful slice is on screen. Judged by visible height,
    // not a share of the element's area: very wide or very tall elements (the
    // certification strip is ~3,300px wide) never reach a percentage on phones.
    const reveal = (el) => {
        el.classList.add("is-in");
        revealIo.unobserve(el);
    };
    const revealIo = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const seen = entry.intersectionRect.height;
            if (seen >= Math.min(60, entry.boundingClientRect.height * 0.5) || entry.intersectionRatio >= 0.12) reveal(entry.target);
        });
    }, { threshold: [0, 0.05, 0.12, 0.25, 0.5, 1], rootMargin: "0px 0px -6% 0px" });

    // Safety net: anything already above the bottom of the screen is shown,
    // e.g. after a fast scroll, an anchor jump or a skipped observer callback.
    // At the bottom of the page everything left is shown: the last elements
    // can never scroll far enough up to pass the observer's bottom margin.
    const sweep = () => {
        const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
        document.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => {
            if (atBottom || el.getBoundingClientRect().top < innerHeight * 0.94) reveal(el);
        });
    };
    // Throttled while scrolling, plus one trailing check once scrolling stops,
    // so the final scroll position (e.g. the very bottom) is always checked.
    let lastSweep = 0;
    let trailing = 0;
    addEventListener("scroll", () => {
        const now = performance.now();
        if (now - lastSweep > 200) { lastSweep = now; sweep(); }
        clearTimeout(trailing);
        trailing = setTimeout(sweep, 160);
    }, { passive: true });
    addEventListener("load", () => setTimeout(sweep, 300));

    document.querySelectorAll(revealSelectors.join(",")).forEach((el) => {
        if (el.closest("[data-reveal]") || el.matches(".fx-3d")) return;
        const siblings = [...el.parentElement.children].filter((s) => s.matches(revealSelectors.join(",")));
        const index = Math.max(0, siblings.indexOf(el));
        el.dataset.reveal = "";
        el.style.setProperty("--d", `${Math.min(index, 6) * 90}ms`);
        revealIo.observe(el);
    });

})();
