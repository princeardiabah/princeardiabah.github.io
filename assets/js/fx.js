// Motion layer shared by every page: scroll reveals, headline rise, cursor
// light, card spotlights, 3D tilt, magnetic buttons, decoding kickers and
// the scroll progress bar. All of it switches off for reduced motion.
(() => {
    const root = document.documentElement;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

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

    // Scroll progress
    const bar = document.createElement("div");
    bar.className = "fx-progress";
    document.body.append(bar);
    const onScroll = () => {
        const max = root.scrollHeight - innerHeight;
        bar.style.setProperty("--fx-progress", max > 0 ? (scrollY / max).toFixed(4) : 0);
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

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
        ".concept", ".portal", ".pins-head",
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

    // Section kickers decode from random glyphs when they appear
    const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>#*+";
    const decode = (el) => {
        const finalText = el.textContent;
        const start = performance.now();
        const duration = 700 + finalText.length * 18;
        const tick = (now) => {
            const p = Math.min((now - start) / duration, 1);
            const settled = Math.floor(finalText.length * p);
            el.textContent = finalText.split("").map((ch, idx) => {
                if (idx < settled || ch === " " || ch === "·") return ch;
                return glyphs[(Math.random() * glyphs.length) | 0];
            }).join("");
            if (p < 1) requestAnimationFrame(tick);
            else el.textContent = finalText;
        };
        requestAnimationFrame(tick);
    };
    const decodeIo = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            decode(entry.target);
            decodeIo.unobserve(entry.target);
        });
    }, { threshold: 1 });
    document.querySelectorAll(".section-kicker").forEach((el) => {
        if (el.children.length) return;
        el.classList.add("fx-decode");
        decodeIo.observe(el);
    });

    if (!finePointer) return;

    // Page-wide cursor light
    const glow = document.createElement("div");
    glow.className = "fx-glow";
    document.body.prepend(glow);
    let gx = innerWidth / 2, gy = innerHeight / 3, tx = gx, ty = gy;
    addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    const followGlow = () => {
        gx += (tx - gx) * 0.08;
        gy += (ty - gy) * 0.08;
        glow.style.setProperty("--gx", `${gx}px`);
        glow.style.setProperty("--gy", `${gy}px`);
        requestAnimationFrame(followGlow);
    };
    followGlow();

    // Card spotlights with a lit border that tracks the cursor
    const spotSelectors = ".build-card, .process-step, .sector-card, .case-study, .explore-card, .product, .offer, .audience, .quote-card, .topic, .format, .cta-band, .stat, .role-card, .concept, .impact, .app-feature";
    document.querySelectorAll(spotSelectors).forEach((card) => {
        if (getComputedStyle(card).position === "static") card.style.position = "relative";
        card.classList.add("fx-spot");
        const layer = document.createElement("span");
        layer.className = "fx-spot-layer";
        layer.setAttribute("aria-hidden", "true");
        card.prepend(layer);
        card.addEventListener("pointermove", (e) => {
            const r = card.getBoundingClientRect();
            card.style.setProperty("--mx", `${e.clientX - r.left}px`);
            card.style.setProperty("--my", `${e.clientY - r.top}px`);
        });
    });

    // 3D tilt with a moving sheen
    document.querySelectorAll(".product-shot, .portrait-card, .orbit-panel, .explore-thumb").forEach((el) => {
        el.dataset.tilt = "";
        const sheen = document.createElement("span");
        sheen.className = "fx-sheen";
        el.append(sheen);
        const host = el.closest(".product, .explore-card") || el;
        const max = el.matches(".explore-thumb") ? 6 : 9;
        host.addEventListener("pointermove", (e) => {
            const r = el.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            el.classList.add("is-tilting");
            el.style.transform = `perspective(1100px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
            el.style.setProperty("--sheen", `${((px + 0.5) * 100).toFixed(1)}%`);
        });
        host.addEventListener("pointerleave", () => {
            el.classList.remove("is-tilting");
            el.style.transform = "";
        });
    });

    // Magnetic buttons
    document.querySelectorAll(".btn").forEach((btn) => {
        btn.classList.add("fx-magnet");
        btn.addEventListener("pointermove", (e) => {
            const r = btn.getBoundingClientRect();
            const dx = e.clientX - (r.left + r.width / 2);
            const dy = e.clientY - (r.top + r.height / 2);
            btn.classList.add("is-pulled");
            btn.style.transform = `translate(${dx * 0.18}px, ${dy * 0.28}px)`;
        });
        btn.addEventListener("pointerleave", () => {
            btn.classList.remove("is-pulled");
            btn.style.transform = "";
        });
    });
})();
