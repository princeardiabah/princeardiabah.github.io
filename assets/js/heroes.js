// Interactive heroes for the Work and Consulting pages.
// Work: a laptop + phone showcase that flips between products I've shipped.
// Consulting: a strategy "roadmap" where a question travels from situation to
// next step. Both take turns on their own while visible and pause for a
// while after the visitor picks something. Reduced motion: no auto-play.
(() => {
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

    // Runs `step` every `ms` while `el` is on screen, unless the visitor
    // interacted in the last 12 seconds.
    const autoplay = (el, ms, step) => {
        let visible = false;
        let lastPick = -Infinity;
        new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.3 }).observe(el);
        if (!reduceMotion) setInterval(() => {
            if (visible && !document.hidden && performance.now() - lastPick > 12000) step();
        }, ms);
        return () => { lastPick = performance.now(); };
    };

    const selectTab = (tabs, index) => tabs.forEach((t, i) => {
        t.classList.toggle("is-active", i === index);
        t.setAttribute("aria-selected", String(i === index));
    });

    // ---- Work: product showcase ----
    const showcase = document.querySelector("[data-showcase]");
    if (showcase) {
        const tabs = [...showcase.querySelectorAll("[role=tab]")];
        const browserShots = [...showcase.querySelectorAll(".sc-browser .sc-shot")];
        const phoneShots = [...showcase.querySelectorAll(".sc-phone .sc-shot")];
        const url = showcase.querySelector(".sc-url");
        const kind = showcase.querySelector(".sc-kind");
        let current = 0;

        const show = (i) => {
            current = i;
            selectTab(tabs, i);
            [browserShots, phoneShots].forEach((set) => set.forEach((img, j) => {
                if (j === i && img.loading === "lazy") img.loading = "eager";
                img.classList.toggle("is-on", j === i);
            }));
            url.textContent = tabs[i].dataset.url;
            kind.textContent = tabs[i].dataset.kind;
            showcase.classList.remove("is-swapping");
            void showcase.offsetWidth;
            showcase.classList.add("is-swapping");
        };
        const picked = autoplay(showcase, 4200, () => show((current + 1) % tabs.length));
        tabs.forEach((t, i) => t.addEventListener("click", () => { picked(); show(i); }));

        // Gentle 3D tilt that follows the cursor on desktop
        if (finePointer && !reduceMotion) {
            const stage = showcase.querySelector(".sc-stage");
            showcase.addEventListener("pointermove", (e) => {
                const r = showcase.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width - 0.5;
                const y = (e.clientY - r.top) / r.height - 0.5;
                stage.style.transform = `perspective(1200px) rotateY(${(x * 10).toFixed(2)}deg) rotateX(${(-y * 7).toFixed(2)}deg)`;
            });
            showcase.addEventListener("pointerleave", () => { stage.style.transform = ""; });
        }
    }

    // ---- Consulting: strategy roadmap ----
    const roadmap = document.querySelector("[data-roadmap]");
    if (roadmap) {
        const answers = [
            ["An idea, a small budget, no plan yet", "Three ways in, smallest to boldest", "Start with what you can test this month", "A 30-day plan with real costs"],
            ["Busy, but the margins feel thin", "Cost-plus, value-based or packages", "A price you can defend, with the numbers", "A pricing test on your next clients"],
            ["Growing, eyeing a new market", "Expand, partner or wait, side by side", "Go, wait or adjust, and why", "Milestones to hit before you commit"],
        ];
        const tabs = [...roadmap.querySelectorAll("[data-q]")];
        const stops = [...roadmap.querySelectorAll(".rm-stop")];
        const road = roadmap.querySelector(".rm-road");
        const svg = roadmap.querySelector(".rm-svg");
        const path = roadmap.querySelector(".rm-path");
        const dot = roadmap.querySelector(".rm-dot");
        const total = path.getTotalLength();
        const marks = [0.07, 0.36, 0.65, 0.94];
        let current = 0;
        let raf = 0;

        // Place each stop beside its point on the curve (the SVG is stretched
        // to the box, so map viewBox units to pixels).
        const toPx = (len) => {
            const pt = path.getPointAtLength(len);
            const vb = svg.viewBox.baseVal;
            const r = road.getBoundingClientRect();
            return { x: (pt.x / vb.width) * r.width, y: (pt.y / vb.height) * r.height };
        };
        const layout = () => {
            stops.forEach((stop, i) => {
                const { x, y } = toPx(total * marks[i]);
                stop.style.setProperty("--x", `${x}px`);
                stop.style.setProperty("--y", `${y}px`);
                stop.classList.toggle("is-right", i % 2 === 0);
            });
        };
        const placeDot = (len) => {
            const { x, y } = toPx(len);
            dot.style.transform = `translate(${x}px, ${y}px)`;
        };

        const run = (q) => {
            current = q;
            selectTab(tabs, q);
            cancelAnimationFrame(raf);
            stops.forEach((s, i) => { s.querySelector("span").textContent = answers[q][i]; s.classList.remove("is-lit"); });
            roadmap.classList.remove("is-done");
            if (reduceMotion) {
                stops.forEach((s) => s.classList.add("is-lit"));
                path.style.strokeDashoffset = "0";
                placeDot(total * marks[3]);
                roadmap.classList.add("is-done");
                return;
            }
            const start = performance.now();
            const DURATION = 3200;
            const frame = (now) => {
                const p = Math.min((now - start) / DURATION, 1);
                const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
                const len = total * (marks[0] + (marks[3] - marks[0]) * eased);
                path.style.strokeDashoffset = String(total - len);
                placeDot(len);
                stops.forEach((s, i) => { if (len >= total * marks[i] - 1) s.classList.add("is-lit"); });
                if (p < 1) raf = requestAnimationFrame(frame);
                else roadmap.classList.add("is-done");
            };
            raf = requestAnimationFrame(frame);
        };

        path.style.strokeDasharray = String(total);
        path.style.strokeDashoffset = String(total);
        layout();
        addEventListener("resize", () => { layout(); });
        const picked = autoplay(roadmap, 6200, () => run((current + 1) % tabs.length));
        tabs.forEach((t, i) => t.addEventListener("click", () => { picked(); run(i); }));
        // Start the first run once it's on screen
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { run(current); io.disconnect(); } }, { threshold: 0.3 });
        io.observe(roadmap);
        stops.forEach((s, i) => { s.querySelector("span").textContent = answers[0][i]; });
        selectTab(tabs, 0);
        placeDot(total * marks[0]);
    }
})();
