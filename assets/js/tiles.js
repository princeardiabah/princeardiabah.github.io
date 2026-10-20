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

    let visible = false;
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.2 }).observe(grid);

    const MAX_TURNED = 3;
    let last = null;
    const pick = () => {
        const free = tiles.filter((t) => !t.classList.contains("is-turned") && !t.dataset.held && t !== last);
        return free[Math.floor(Math.random() * free.length)];
    };

    const step = () => {
        if (visible && !document.hidden) {
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
