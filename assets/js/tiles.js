// Live tiles: at random, turn a few photo tiles to show their story, then
// turn them back, like a Windows Phone start screen. Hover or focus turns a
// tile by hand. Pauses off-screen; no automatic turning for reduced motion.
(() => {
    const grid = document.querySelector(".live-tiles");
    if (!grid) return;
    const tiles = [...grid.querySelectorAll(".tile")];
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

    tiles.forEach((tile) => {
        const turn = (on) => tile.classList.toggle("is-turned", on);
        tile.addEventListener("pointerenter", () => { tile.dataset.held = "1"; turn(true); });
        tile.addEventListener("pointerleave", () => { delete tile.dataset.held; turn(false); });
        tile.addEventListener("focus", () => { tile.dataset.held = "1"; turn(true); });
        tile.addEventListener("blur", () => { delete tile.dataset.held; turn(false); });
    });

    if (reduceMotion) return;

    // Start-screen entrance: tiles swing in one after another the first time
    // the grid scrolls into view; random turning starts once they've landed.
    grid.classList.add("has-entrance");
    tiles.forEach((tile, i) => tile.style.setProperty("--i", i));
    let landed = false;
    const enter = () => {
        if (grid.classList.contains("is-in")) return;
        const r = grid.getBoundingClientRect();
        if (r.top > innerHeight * 0.9 || r.bottom < 0) return;
        grid.classList.add("is-in");
        removeEventListener("scroll", enter);
        setTimeout(() => { landed = true; }, 720 + tiles.length * 55);
    };
    // A plain scroll check as well as the observer, so the tiles can never
    // stay hidden if observer callbacks are delayed (e.g. background tabs).
    addEventListener("scroll", enter, { passive: true });
    new IntersectionObserver(([entry]) => { if (entry.isIntersecting) enter(); }).observe(grid);
    enter();

    let visible = false;
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.2 }).observe(grid);

    const MAX_TURNED = 3;
    let last = null;
    const pick = () => {
        const free = tiles.filter((t) => !t.classList.contains("is-turned") && !t.dataset.held && t !== last);
        return free[Math.floor(Math.random() * free.length)];
    };

    const step = () => {
        if (landed && visible && !document.hidden) {
            const turned = tiles.filter((t) => t.classList.contains("is-turned") && !t.dataset.held).length;
            const tile = turned < MAX_TURNED ? pick() : null;
            if (tile) {
                last = tile;
                tile.classList.add("is-turned");
                setTimeout(() => { if (!tile.dataset.held) tile.classList.remove("is-turned"); }, 2600 + Math.random() * 1800);
            }
        }
        setTimeout(step, 1100 + Math.random() * 900);
    };
    setTimeout(step, 900);
})();
