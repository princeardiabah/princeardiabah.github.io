// Portrait "portal": skill chips orbit the cut-out portrait on a tilted
// ellipse, passing behind it on the far side and in front on the near side,
// while the layers drift apart with the cursor for depth.
(() => {
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

    document.querySelectorAll("[data-portal]").forEach((portal) => {
        const chips = [...portal.querySelectorAll(".orbit-chip")];
        const layers = {
            halo: portal.querySelector(".portal-halo"),
            person: portal.querySelector(".portal-person"),
        };
        // Chips stay direct children of the portal so their z-index can put
        // them behind or in front of the portrait; parallax is folded into
        // their position instead of moving a wrapper.
        const drift = { x: 0, y: 0 };
        const offset = (Math.PI * 2) / chips.length;
        let angle = 0;

        const place = () => {
            const { width, height } = portal.getBoundingClientRect();
            // Narrow screens: tighter orbit so chips never push past the viewport
            const rx = width * (innerWidth < 560 ? 0.3 : 0.5);
            const ry = height * 0.08;
            const cx = width / 2;
            const cy = height * 0.46;
            chips.forEach((chip, i) => {
                const a = angle + i * offset;
                const depth = Math.sin(a);
                const x = cx + Math.cos(a) * rx + drift.x * 26;
                const y = cy + depth * ry - Math.cos(a) * height * 0.06 + drift.y * 14;
                const scale = 0.82 + (depth + 1) * 0.12;
                chip.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(3)})`;
                chip.style.zIndex = depth > 0 ? 4 : 1;
                chip.style.opacity = (0.55 + (depth + 1) * 0.225).toFixed(3);
                chip.style.filter = depth > 0 ? "none" : `blur(${(-depth * 1.2).toFixed(2)}px)`;
            });
        };

        place();
        new ResizeObserver(place).observe(portal);
        if (reduceMotion) return;

        let visible = true;
        new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(portal);
        let last = performance.now();
        const spin = (now) => {
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            if (visible && !portal.matches(":hover")) angle += dt * 0.32;
            else if (visible) angle += dt * 0.12;
            if (visible) place();
            requestAnimationFrame(spin);
        };
        requestAnimationFrame(spin);

        if (!finePointer) return;
        const target = { x: 0, y: 0 };
        const eased = drift;
        addEventListener("pointermove", (e) => {
            target.x = e.clientX / innerWidth - 0.5;
            target.y = e.clientY / innerHeight - 0.5;
        }, { passive: true });
        const follow = () => {
            eased.x += (target.x - eased.x) * 0.06;
            eased.y += (target.y - eased.y) * 0.06;
            if (visible) {
                layers.halo.style.transform = `translate(${eased.x * -22}px, ${eased.y * -14}px)`;
                layers.person.style.transform = `translate(${eased.x * 12}px, ${eased.y * 6}px)`;
                portal.style.setProperty("--lx", `${50 + eased.x * 60}%`);
            }
            requestAnimationFrame(follow);
        };
        follow();
    });
})();
