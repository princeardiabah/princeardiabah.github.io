// Hero "live workflow": a five-step automation that runs in front of the
// visitor. Each scenario is one of the systems I build; tapping a tab runs
// it, otherwise the scenarios take turns on their own while the panel is on
// screen. With reduced motion the steps are shown completed, without motion.
(() => {
    const panel = document.querySelector("[data-live-flow]");
    if (!panel) return;

    const scenarios = [
        {
            steps: [
                "Lead fills in the website form",
                "Reads the message, scores intent",
                "Enriches the company, saves to CRM",
                "Hot lead, routed to sales",
                "Team alerted, reply drafted",
            ],
            done: "Lead handled",
        },
        {
            steps: [
                "Meeting recording uploaded",
                "Transcribes, pulls out decisions",
                "Matches actions to team tasks",
                "Assigns each action to an owner",
                "Summary posted to the team",
            ],
            done: "Meeting turned into tasks",
        },
        {
            steps: [
                "Student emails an assignment",
                "Checks it against past submissions",
                "Logged with a tracking number",
                "Cleared, or flagged for review",
                "Receipt sent, professor alerted if flagged",
            ],
            done: "Submission checked",
        },
    ];

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tabs = [...panel.querySelectorAll("[data-scenario]")];
    const nodes = [...panel.querySelectorAll(".lf-node")];
    const status = panel.querySelector(".lf-status-text");
    const STEP_MS = 720;

    let current = 0;
    let timers = [];
    let visible = false;
    let userPicked = 0;
    let cycle = 0;

    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));

    const run = (index) => {
        clear();
        current = index;
        const sc = scenarios[index];
        tabs.forEach((t, i) => {
            t.setAttribute("aria-selected", String(i === index));
            t.classList.toggle("is-active", i === index);
        });
        nodes.forEach((node, i) => {
            node.querySelector("small").textContent = sc.steps[i];
            node.classList.remove("is-active", "is-done");
        });
        panel.classList.remove("is-complete");

        if (reduceMotion) {
            nodes.forEach((n) => n.classList.add("is-done"));
            panel.classList.add("is-complete");
            status.textContent = sc.done;
            return;
        }

        status.textContent = "Running";
        nodes.forEach((node, i) => {
            later(() => {
                if (i > 0) { nodes[i - 1].classList.remove("is-active"); nodes[i - 1].classList.add("is-done"); }
                node.classList.add("is-active");
            }, 260 + i * STEP_MS);
        });
        later(() => {
            nodes[nodes.length - 1].classList.remove("is-active");
            nodes[nodes.length - 1].classList.add("is-done");
            panel.classList.add("is-complete");
            status.textContent = sc.done;
        }, 260 + nodes.length * STEP_MS);
    };

    // Auto-play: next scenario every few seconds while on screen, pausing
    // for a while after the visitor picks one themselves.
    const tick = () => {
        clearTimeout(cycle);
        cycle = setTimeout(() => {
            if (visible && performance.now() - userPicked > 12000) run((current + 1) % scenarios.length);
            tick();
        }, 260 + nodes.length * STEP_MS + 2600);
    };

    tabs.forEach((tab) => tab.addEventListener("click", () => {
        userPicked = performance.now();
        run(Number(tab.dataset.scenario));
        tick();
    }));

    new IntersectionObserver(([entry]) => {
        const was = visible;
        visible = entry.isIntersecting;
        if (visible && !was) { run(current); tick(); }
        if (!visible) { clear(); clearTimeout(cycle); }
    }, { threshold: 0.25 }).observe(panel);

    run(0);
})();
