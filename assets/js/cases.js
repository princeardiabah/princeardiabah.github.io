// Landing page: workflow diagrams on the project cards and the stat counters.
// Moved out of index.html so the page can run under a Content Security Policy
// that blocks inline scripts.
        const makeWorkflow = (card) => {
            const title = card.dataset.title;
            const pattern = card.dataset.pattern || "hub";
            const labels = {
                source: card.dataset.source,
                logic: card.dataset.logic,
                ai: card.dataset.ai,
                data: card.dataset.data,
                output: card.dataset.output
            };
            const paths = {
                linear: `
                        <path class="wire" d="M70 144 H160"></path>
                        <path class="wire" d="M240 144 H320"></path>
                        <path class="wire" d="M390 144 C430 144 430 188 452 188"></path>
                        <path class="wire" d="M204 168 V224"></path>
                        <path class="wire" d="M204 224 C292 250 350 226 428 206"></path>`,
                hub: `
                        <path class="wire" d="M94 58 C168 58 188 118 244 138"></path>
                        <path class="wire" d="M430 58 C354 58 330 118 276 138"></path>
                        <path class="wire" d="M96 226 C170 226 190 166 244 144"></path>
                        <path class="wire" d="M426 226 C350 226 328 166 276 144"></path>`,
                loop: `
                        <path class="wire" d="M106 58 C210 18 328 22 426 62"></path>
                        <path class="wire" d="M454 92 C486 148 484 192 422 224"></path>
                        <path class="wire" d="M338 226 C260 256 168 256 100 226"></path>
                        <path class="wire" d="M70 198 C36 142 38 92 106 58"></path>
                        <path class="wire" d="M242 140 C184 112 142 94 106 74"></path>`,
                split: `
                        <path class="wire" d="M78 140 C138 140 156 140 204 140"></path>
                        <path class="wire" d="M278 130 C332 82 364 60 424 58"></path>
                        <path class="wire" d="M278 154 C338 198 368 224 424 224"></path>
                        <path class="wire" d="M244 170 V226"></path>`,
                stack: `
                        <path class="wire" d="M74 58 C132 72 138 112 74 140"></path>
                        <path class="wire" d="M148 78 C232 78 274 90 384 104"></path>
                        <path class="wire" d="M386 132 C388 174 388 188 386 210"></path>
                        <path class="wire" d="M318 226 C210 244 150 236 76 226"></path>
                        <path class="wire" d="M148 152 C226 166 278 188 320 216"></path>`
            };

            card.innerHTML = `
                <div class="workflow-topbar">
                    <b>${title}</b>
                    <span>Active</span>
                </div>
                <div class="workflow-canvas" data-pattern="${pattern}">
                    <svg class="lines" viewBox="0 0 520 280" preserveAspectRatio="none" aria-hidden="true">
                        ${paths[pattern] || paths.hub}
                    </svg>
                    <div class="mini-node source"><i data-lucide="webhook"></i><div><b>${labels.source}</b><span>Trigger</span></div></div>
                    <div class="mini-node logic"><i data-lucide="workflow"></i><div><b>${labels.logic}</b><span>n8n branch</span></div></div>
                    <div class="mini-node ai"><i data-lucide="brain-circuit"></i><div><b>${labels.ai}</b><span>Decision layer</span></div></div>
                    <div class="mini-node data"><i data-lucide="database"></i><div><b>${labels.data}</b><span>Source of truth</span></div></div>
                    <div class="mini-node output"><i data-lucide="send"></i><div><b>${labels.output}</b><span>Outcome</span></div></div>
                </div>
            `;
        };

        document.querySelectorAll(".workflow-card").forEach(makeWorkflow);
        lucide.createIcons();

        const menuToggle = document.querySelector(".menu-toggle");
        const siteMenu = document.querySelector("#site-menu");

        if (menuToggle && siteMenu) {
            menuToggle.addEventListener("click", () => {
                const isOpen = siteMenu.classList.toggle("is-open");
                menuToggle.setAttribute("aria-expanded", String(isOpen));
            });

            siteMenu.querySelectorAll("a").forEach((link) => {
                link.addEventListener("click", () => {
                    siteMenu.classList.remove("is-open");
                    menuToggle.setAttribute("aria-expanded", "false");
                });
            });

            document.addEventListener("click", (event) => {
                if (!siteMenu.contains(event.target) && !menuToggle.contains(event.target)) {
                    siteMenu.classList.remove("is-open");
                    menuToggle.setAttribute("aria-expanded", "false");
                }
            });
        }

        const readMoreButton = document.querySelector(".read-more");
        const aboutMore = document.querySelector("#about-more");

        if (readMoreButton && aboutMore) {
            readMoreButton.addEventListener("click", () => {
                const isExpanded = readMoreButton.getAttribute("aria-expanded") === "true";
                readMoreButton.setAttribute("aria-expanded", String(!isExpanded));
                aboutMore.hidden = isExpanded;
                readMoreButton.innerHTML = isExpanded
                    ? 'Read More <i data-lucide="chevron-down"></i>'
                    : 'Show Less <i data-lucide="chevron-up"></i>';
                lucide.createIcons();
            });
        }

        const runCounter = () => {
            document.querySelectorAll(".counter").forEach((counter) => {
                const target = Number(counter.dataset.target);
                let current = 0;
                const steps = 56;
                const tick = () => {
                    current += target / steps;
                    if (current < target) {
                        counter.textContent = Math.ceil(current).toLocaleString();
                        window.setTimeout(tick, 20);
                    } else {
                        counter.textContent = `${target.toLocaleString()}+`;
                    }
                };
                tick();
            });
        };

        const stats = document.querySelector("#stats");
        if (stats) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        runCounter();
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.45 });
            observer.observe(stats);
        }
