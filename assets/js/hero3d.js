// 3D hero scenes. Each page puts <div class="fx-3d" data-shape="..."> in its
// hero; this module fills it with a WebGL scene:
//   sphere - an automation network globe with data pulses walking its edges
//   helix  - a double helix of nodes, two strands growing together
//   wave   - a terrain of points rippling like a voice waveform
//   orbit  - screens orbiting a core, wired back to it
// Scenes follow the cursor, react to scroll, and pause off-screen.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const host = document.querySelector(".fx-3d");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const PURPLE = new THREE.Color("#8b5cf6");
const VIOLET = new THREE.Color("#a78bfa");
const ORANGE = new THREE.Color("#ff7a45");
const CYAN = new THREE.Color("#38bdf8");

if (host && !reduceMotion) {
    try {
        mount(host);
    } catch (err) {
        console.warn("3D hero disabled:", err);
    }
}

function glowTexture() {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.75)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function pointsMaterial(size, sprite, opacity = 1) {
    return new THREE.PointsMaterial({
        size,
        map: sprite,
        vertexColors: true,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
    });
}

// A graph of nodes and edges with pulses that walk from edge to edge.
function buildGraph(nodes, edges, sprite, { nodeSize = 0.09, pulseCount = 40, pulseSize = 0.16 } = {}) {
    const group = new THREE.Group();

    const nodePos = new Float32Array(nodes.length * 3);
    const nodeCol = new Float32Array(nodes.length * 3);
    nodes.forEach((v, i) => {
        v.toArray(nodePos, i * 3);
        const c = VIOLET.clone().lerp(CYAN, Math.random() * 0.35).lerp(ORANGE, Math.random() < 0.12 ? 0.8 : 0);
        c.toArray(nodeCol, i * 3);
    });
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodePos, 3));
    nodeGeo.setAttribute("color", new THREE.BufferAttribute(nodeCol, 3));
    group.add(new THREE.Points(nodeGeo, pointsMaterial(nodeSize, sprite)));

    const linePos = new Float32Array(edges.length * 6);
    const lineCol = new Float32Array(edges.length * 6);
    edges.forEach(([a, b], i) => {
        nodes[a].toArray(linePos, i * 6);
        nodes[b].toArray(linePos, i * 6 + 3);
        PURPLE.toArray(lineCol, i * 6);
        VIOLET.toArray(lineCol, i * 6 + 3);
    });
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    lineGeo.setAttribute("color", new THREE.BufferAttribute(lineCol, 3));
    group.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    })));

    const adjacency = nodes.map(() => []);
    edges.forEach(([a, b]) => { adjacency[a].push(b); adjacency[b].push(a); });

    const pulses = Array.from({ length: pulseCount }, () => {
        const from = (Math.random() * nodes.length) | 0;
        const next = adjacency[from];
        return { from, to: next.length ? next[(Math.random() * next.length) | 0] : from, t: Math.random(), speed: 0.4 + Math.random() * 0.9 };
    });
    const pulsePos = new Float32Array(pulseCount * 3);
    const pulseCol = new Float32Array(pulseCount * 3);
    pulses.forEach((_, i) => (i % 3 === 0 ? CYAN : ORANGE).toArray(pulseCol, i * 3));
    const pulseGeo = new THREE.BufferGeometry();
    pulseGeo.setAttribute("position", new THREE.BufferAttribute(pulsePos, 3));
    pulseGeo.setAttribute("color", new THREE.BufferAttribute(pulseCol, 3));
    group.add(new THREE.Points(pulseGeo, pointsMaterial(pulseSize, sprite)));

    const tmp = new THREE.Vector3();
    group.userData.update = (dt) => {
        pulses.forEach((p, i) => {
            p.t += dt * p.speed;
            if (p.t >= 1) {
                p.t = 0;
                const options = adjacency[p.to].filter((n) => n !== p.from);
                p.from = p.to;
                p.to = options.length ? options[(Math.random() * options.length) | 0] : adjacency[p.to][0] ?? p.to;
            }
            tmp.copy(nodes[p.from]).lerp(nodes[p.to], p.t).toArray(pulsePos, i * 3);
        });
        pulseGeo.attributes.position.needsUpdate = true;
    };
    return group;
}

function nearestEdges(nodes, k) {
    const seen = new Set();
    const edges = [];
    nodes.forEach((v, i) => {
        nodes
            .map((w, j) => [j, v.distanceToSquared(w)])
            .filter(([j]) => j !== i)
            .sort((a, b) => a[1] - b[1])
            .slice(0, k)
            .forEach(([j]) => {
                const key = i < j ? `${i}-${j}` : `${j}-${i}`;
                if (!seen.has(key)) { seen.add(key); edges.push([i, j]); }
            });
    });
    return edges;
}

function sphereScene(sprite, small) {
    const count = small ? 140 : 240;
    const radius = 2.3;
    const nodes = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
        const y = 1 - (i / (count - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const theta = golden * i;
        const jitter = 1 + (Math.random() - 0.5) * 0.06;
        nodes.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(radius * jitter));
    }
    const group = buildGraph(nodes, nearestEdges(nodes, 3), sprite, { pulseCount: small ? 30 : 56 });

    // Inner core and a tilted ring give the globe some depth
    const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.9, 1),
        new THREE.MeshBasicMaterial({ color: PURPLE, wireframe: true, transparent: true, opacity: 0.18 }),
    );
    group.add(core);
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.1, 0.006, 8, 160),
        new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.45 }),
    );
    ring.rotation.x = Math.PI / 2.3;
    group.add(ring);

    const update = group.userData.update;
    group.userData.update = (dt, t) => {
        update(dt);
        core.rotation.x += dt * 0.25;
        core.rotation.y -= dt * 0.35;
        ring.rotation.z += dt * 0.12;
        group.rotation.y += dt * 0.08;
    };
    group.userData.layout = (aspect, place) => {
        const wide = aspect > 1.25;
        if (place === "cta") {
            // A planet rising behind the closing call to action
            group.position.set(0, wide ? -3.0 : -2.9, 0);
            group.scale.setScalar(wide ? 1.35 : 0.95);
            return;
        }
        group.position.set(wide ? 2.6 : 0, wide ? 0.15 : -2.4, 0);
        group.scale.setScalar(wide ? 1 : 0.75);
    };
    return group;
}

function helixScene(sprite, small) {
    const perStrand = small ? 70 : 120;
    const length = 16;
    const radius = 1.25;
    const nodes = [];
    const edges = [];
    for (let s = 0; s < 2; s++) {
        for (let i = 0; i < perStrand; i++) {
            const t = i / (perStrand - 1);
            const angle = t * Math.PI * 7 + s * Math.PI;
            nodes.push(new THREE.Vector3((t - 0.5) * length, Math.cos(angle) * radius, Math.sin(angle) * radius));
            if (i > 0) edges.push([s * perStrand + i - 1, s * perStrand + i]);
        }
    }
    for (let i = 0; i < perStrand; i += 3) edges.push([i, perStrand + i]);
    const group = buildGraph(nodes, edges, sprite, { pulseCount: small ? 30 : 60, nodeSize: 0.14, pulseSize: 0.22 });
    group.rotation.z = -0.12;
    const update = group.userData.update;
    group.userData.update = (dt) => {
        update(dt);
        group.rotation.x += dt * 0.35;
    };
    group.userData.layout = (aspect, place) => {
        if (place === "cta") {
            // Runs along the bottom of the booking band
            group.position.set(0, aspect > 1.25 ? -2.7 : -2.9, 0);
            group.scale.setScalar(aspect > 1.25 ? 0.95 : 0.5);
            return;
        }
        group.position.set(0, aspect > 1.25 ? -2.05 : -2.2, 0);
        group.scale.setScalar(aspect > 1.25 ? 1.05 : 0.6);
    };
    return group;
}

function waveScene(sprite, small) {
    const cols = small ? 70 : 120;
    const rows = small ? 26 : 42;
    const width = 18;
    const depth = 7;
    const count = cols * rows;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const base = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            const x = (c / (cols - 1) - 0.5) * width;
            const z = (r / (rows - 1) - 0.5) * depth;
            base.push([x, z]);
            pos[i * 3] = x;
            pos[i * 3 + 2] = z;
            VIOLET.clone().lerp(ORANGE, r / rows * 0.9).toArray(col, i * 3);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const points = new THREE.Points(geo, pointsMaterial(0.1, sprite, 1));
    const group = new THREE.Group();
    group.add(points);
    group.rotation.x = 0.55;

    let time = 0;
    group.userData.update = (dt, _t, mouse) => {
        time += dt;
        // A "voice" envelope: bursts of energy like syllables
        const energy = 0.55 + 0.45 * Math.abs(Math.sin(time * 1.7) * Math.sin(time * 0.63 + 1));
        const mx = mouse.x * width * 0.4;
        for (let i = 0; i < count; i++) {
            const [x, z] = base[i];
            const d = Math.hypot(x - mx, z);
            const center = Math.exp(-(x * x) / 30);
            const y =
                Math.sin(x * 1.1 + time * 2.4) * 0.55 * center * energy +
                Math.sin(x * 2.7 - time * 3.1 + z) * 0.18 * energy +
                Math.sin(d * 2.2 - time * 4) * 0.35 * Math.exp(-d * 0.35);
            pos[i * 3 + 1] = y;
        }
        geo.attributes.position.needsUpdate = true;
    };
    group.userData.layout = (aspect) => {
        group.position.set(0, aspect > 1.25 ? -1.9 : -2.2, 0);
        group.scale.setScalar(aspect > 1.25 ? 1 : 0.6);
    };
    return group;
}

function orbitScene(sprite, small) {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.7, 1),
        new THREE.MeshBasicMaterial({ color: VIOLET, wireframe: true, transparent: true, opacity: 0.35 }),
    );
    group.add(core);

    const screens = [];
    const count = small ? 7 : 11;
    const frameMat = new THREE.LineBasicMaterial({ color: VIOLET, transparent: true, opacity: 0.6 });
    const barMat = new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const wireMat = new THREE.LineBasicMaterial({ color: PURPLE, transparent: true, opacity: 0.25 });
    for (let i = 0; i < count; i++) {
        const w = 0.9 + Math.random() * 0.5;
        const h = w * 0.62;
        const screen = new THREE.Group();
        const outline = new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-w / 2, -h / 2, 0), new THREE.Vector3(w / 2, -h / 2, 0),
                new THREE.Vector3(w / 2, h / 2, 0), new THREE.Vector3(-w / 2, h / 2, 0),
            ]),
            frameMat,
        );
        const bar = new THREE.Mesh(new THREE.PlaneGeometry(w, h * 0.14), barMat);
        bar.position.y = h / 2 - h * 0.07;
        screen.add(outline, bar);
        const radius = 2.4 + Math.random() * 1.2;
        const angle = (i / count) * Math.PI * 2;
        const tilt = (Math.random() - 0.5) * 1.2;
        screen.userData = { radius, angle, tilt, speed: 0.12 + Math.random() * 0.1 };
        const wireGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        const wire = new THREE.Line(wireGeo, wireMat);
        group.add(screen, wire);
        screens.push({ screen, wire });
    }

    group.userData.update = (dt) => {
        core.rotation.y += dt * 0.4;
        core.rotation.x += dt * 0.2;
        screens.forEach(({ screen, wire }) => {
            const u = screen.userData;
            u.angle += dt * u.speed;
            screen.position.set(Math.cos(u.angle) * u.radius, Math.sin(u.angle * 1.3) * 0.6 + u.tilt, Math.sin(u.angle) * u.radius);
            screen.lookAt(0, screen.position.y, 0);
            const p = wire.geometry.attributes.position;
            p.setXYZ(1, screen.position.x, screen.position.y, screen.position.z);
            p.needsUpdate = true;
        });
    };
    group.userData.layout = (aspect) => {
        group.position.set(aspect > 1.25 ? 5.2 : 0, aspect > 1.25 ? -0.4 : 0.8, 0);
        group.scale.setScalar(aspect > 1.25 ? 0.7 : 0.6);
    };
    return group;
}

function mount(container) {
    const small = innerWidth < 720;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);
    container.append(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    const sprite = glowTexture();
    const builders = { sphere: sphereScene, helix: helixScene, wave: waveScene, orbit: orbitScene };
    const shape = builders[container.dataset.shape] ? container.dataset.shape : "sphere";
    const group = builders[shape](sprite, small);
    const rig = new THREE.Group();
    rig.add(group);
    scene.add(rig);

    const resize = () => {
        const { width, height } = container.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        group.userData.layout?.(camera.aspect, container.dataset.place);
    };
    new ResizeObserver(resize).observe(container);
    resize();

    const mouse = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    addEventListener("pointermove", (e) => {
        mouse.x = e.clientX / innerWidth - 0.5;
        mouse.y = e.clientY / innerHeight - 0.5;
    }, { passive: true });

    let visible = true;
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(container);

    const clock = new THREE.Clock();
    const frame = () => {
        requestAnimationFrame(frame);
        const dt = Math.min(clock.getDelta(), 0.05);
        if (!visible || document.hidden) return;

        eased.x += (mouse.x - eased.x) * 0.04;
        eased.y += (mouse.y - eased.y) * 0.04;
        // 0 when the scene's top enters the viewport, 1 when it has scrolled
        // a full screen past, so scenes lower on the page behave the same.
        const rect = container.getBoundingClientRect();
        const progress = Math.min(Math.max((innerHeight - rect.top) / (innerHeight + rect.height), 0), 1);
        const travel = container.dataset.place === "cta" ? progress - 0.5 : Math.min(scrollY / innerHeight, 1.5);
        rig.rotation.y = eased.x * 0.6 + travel * 0.6;
        rig.rotation.x = eased.y * 0.35 + travel * 0.15;
        rig.position.y = container.dataset.place === "cta" ? travel * -0.8 : travel * 1.2;
        camera.position.z = container.dataset.place === "cta" ? 9 : 9 + travel * 2;

        group.userData.update(dt, clock.elapsedTime, eased);
        renderer.render(scene, camera);
    };
    frame();
    requestAnimationFrame(() => container.classList.add("is-live"));
}
