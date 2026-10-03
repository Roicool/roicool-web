/**
 * website-ring.js — screenshots of the websites we built, on a cylinder the
 * camera stands inside: five rings of eight cards, drawn with three.js.
 * Dragging turns the cylinder, the camera leans after the pointer until the
 * first drag, a card grows under the pointer and a pill with its domain
 * follows the cursor; a click opens the site in a new tab. The title in the
 * middle tilts after the pointer.
 *
 * Reconstructed from squarespace.com's "Made with Squarespace" section
 * (React Three Fiber there, plain three.js here). Every number — ring radius,
 * card size, camera, controls, damping, springs — is the original's.
 *
 * The sites come from a Webflow Collection List, not from this file: each
 * item is a link to the site holding its screenshot and its domain as text.
 * That list is the section's accessible content — real links, readable by
 * bots and screen readers, reachable by Tab — and the canvas is decoration
 * over it (aria-hidden). The cylinder has 40 places; with fewer sites the
 * code repeats them around it, offsetting each ring so the same site does
 * not stack up in a column. The list itself keeps one link per site.
 *
 * No WebGL, reduced motion or three.js not delivered: no canvas; the
 * `fallback` part shows if there is one, otherwise the list itself does.
 *
 * Structure: README.md in this folder.
 */

import { part, parts, setState } from "../../runtime/dom.js";
import { prefersReducedMotion } from "../../runtime/motion.js";
import { loadThree } from "../../runtime/three.js";
import { warn } from "../../runtime/log.js";

const CARDS_PER_RING = 8;
const RING_RADIUS = 3;
/** Heights of the five rings, bottom to top. */
const RING_HEIGHTS = [-4, -2, 0, 2, 4];
const CARD_WIDTH = 1.5;
const CARD_HEIGHT = 0.9345;

/** The screenshot width the texture is taken at, from the image's srcset. */
const TEXTURE_WIDTH = 800;

/** Below this width, or on any touch device, the scene runs its mobile set. */
const DESKTOP_WIDTH = 1280;

/** The pill keeps this far from the pointer and from the viewport edge. */
const PILL_OFFSET = 16;

/** A press that travels further than this is a drag, not a click. */
const CLICK_SLOP = 2;

/** maath's easing.damp, as the original uses it. */
const expEase = (x) => 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
function damp(target, key, to, smoothTime, delta, eps = 0.001) {
  target.__velocity ??= {};
  target.__velocity[key] ??= 0;
  if (Math.abs(target[key] - to) <= eps) {
    target[key] = to;
    return;
  }
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;
  const t = expEase(omega * delta);
  const change = target[key] - to;
  const temp = (target.__velocity[key] + omega * change) * delta;
  target.__velocity[key] = (target.__velocity[key] - omega * temp) * t;
  let output = to + (change + temp) * t;
  if (to - target[key] > 0 === output > to) {
    output = to;
    target.__velocity[key] = (output - to) / delta;
  }
  target[key] = output;
}
const damp3 = (vector, [x, y, z], smoothTime, delta) => {
  damp(vector, "x", x, smoothTime, delta);
  damp(vector, "y", y, smoothTime, delta);
  damp(vector, "z", z, smoothTime, delta);
};

/** A spring like framer-motion's, stepped with the frame time. */
class Spring {
  constructor(value, { stiffness = 100, damping = 10, mass = 1 } = {}) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = mass;
  }
  set(target) {
    this.target = target;
  }
  jump(value) {
    this.value = this.target = value;
    this.velocity = 0;
  }
  step(dt) {
    // Sub-steps at 240 Hz keep the stiff springs stable at any frame rate.
    const steps = Math.ceil(dt / (1 / 240));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const force =
        -this.stiffness * (this.value - this.target) -
        this.damping * this.velocity;
      this.velocity += (force / this.mass) * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }
}

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    const options = { failIfMajorPerformanceCaveat: true };
    return Boolean(
      canvas.getContext("webgl", options) ||
      canvas.getContext("experimental-webgl", options),
    );
  } catch {
    return false;
  }
}

/** The srcset candidate closest above TEXTURE_WIDTH, else the largest. */
function textureSource(img) {
  if (!img) return null;
  const candidates = (img.getAttribute("srcset") || "")
    .split(/,\s+/)
    .map((entry) => {
      const [url, descriptor = ""] = entry.trim().split(/\s+/);
      return { url, width: Number.parseInt(descriptor, 10) || 0 };
    })
    .filter((c) => c.url && c.width > 0)
    .sort((a, b) => a.width - b.width);
  const pick =
    candidates.find((c) => c.width >= TEXTURE_WIDTH) ?? candidates.at(-1);
  const url = pick?.url || img.getAttribute("src");
  return url ? new URL(url, document.baseURI).href : null;
}

/** The sites in the list: link, screenshot and the domain to show. */
function readSites(root) {
  return parts(root, "card")
    .map((card) => {
      const src = textureSource(card.querySelector("img"));
      if (!src || !card.href) return null;
      const label = part(card, "label")?.textContent.trim();
      return {
        href: card.href,
        src,
        title: label || new URL(card.href).hostname.replace(/^www\./, ""),
      };
    })
    .filter(Boolean);
}

/**
 * The site for each place on the cylinder, ring by ring. When the count
 * divides a ring evenly, each ring starts one site later so the same site
 * never lines up in a column.
 */
function fillPlaces(sites) {
  const shift = CARDS_PER_RING % sites.length === 0 ? 1 : 0;
  return RING_HEIGHTS.map((y, ring) =>
    Array.from({ length: CARDS_PER_RING }, (_, i) => ({
      y,
      i,
      site: sites[(ring * CARDS_PER_RING + i + ring * shift) % sites.length],
    })),
  ).flat();
}

function revealTitle(title) {
  if (!title) return;
  const watcher = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      watcher.disconnect();
      setState(title, "revealed");
    },
    { threshold: 0.1 },
  );
  watcher.observe(title);
}

export default async function websiteRing(root) {
  const scene = part(root, "scene");
  const title = part(root, "title");
  const pill = part(root, "pill");
  const pillText = pill ? part(pill, "pill-text") : null;
  const fallback = part(root, "fallback");
  const stillState = fallback ? "fallback" : "static";

  revealTitle(title);

  const sites = readSites(root);
  if (!scene || sites.length === 0) {
    if (!scene) warn('website-ring needs a [data-rc-part="scene"].', root);
    setState(root, stillState);
    return;
  }
  if (prefersReducedMotion() || !webglAvailable()) {
    setState(root, stillState);
    return;
  }

  const three = await loadThree();
  if (!three) {
    setState(root, stillState);
    return;
  }
  const { THREE, OrbitControls } = three;
  setState(root, "running");

  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  let isMobile = innerWidth < DESKTOP_WIDTH || isTouch;

  // The title follows the pointer over the scene, 0..1 from the centre.
  const mouseX = new Spring(0.5, { stiffness: 100, damping: 40, mass: 2 });
  const mouseY = new Spring(0.5, { stiffness: 100, damping: 40, mass: 2 });
  scene.addEventListener("mousemove", (event) => {
    mouseX.set(event.clientX / innerWidth);
    mouseY.set(event.clientY / innerHeight);
  });

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    stencil: false,
    depth: true,
  });
  renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio, 1), 2));
  // React Three Fiber's defaults, which the original renders with.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  scene.append(renderer.domElement);

  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(isMobile ? 80 : 65, 1, 0.1, 1000);
  camera.position.set(0, 0, -3);

  // Bound to the scene box, as R3F binds them, not to the canvas: the
  // controls set touch-action: none on their element, and the box hands
  // vertical swipes back to the page below.
  const tilt = isMobile ? 0 : 0.25;
  const controls = new OrbitControls(camera, scene);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI / 2 - tilt;
  controls.maxPolarAngle = Math.PI / 2 + tilt;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = -1;
  scene.style.touchAction = "pan-y";

  let hasDragged = false;
  let isDragging = false;
  let activeTitle = null;
  const syncCursor = () => {
    scene.style.cursor = isDragging
      ? "grabbing"
      : activeTitle
        ? "pointer"
        : "grab";
  };
  controls.addEventListener("start", () => {
    hasDragged = true;
    isDragging = true;
    syncCursor();
  });
  controls.addEventListener("end", () => {
    isDragging = false;
    syncCursor();
  });
  syncCursor();

  // Cards: a grey stand-in at 10% until the screenshot arrives.
  const geometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT, 20, 20);
  const cards = fillPlaces(sites).map(({ y, i, site }) => {
    const angle = (i / CARDS_PER_RING) * Math.PI * 2;
    const material = new THREE.MeshBasicMaterial({
      color: "#666",
      transparent: true,
      opacity: 0.1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      Math.sin(angle) * RING_RADIUS,
      y,
      Math.cos(angle) * RING_RADIUS,
    );
    mesh.rotation.set(0, Math.PI + angle, 0);
    mesh.userData = { ...site, hovered: false, loaded: false };
    world.add(mesh);
    return mesh;
  });

  // One download per screenshot, however often it repeats on the cylinder.
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  const textures = new Map();
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const textureFor = (src) => {
    let pending = textures.get(src);
    if (!pending) {
      pending = loader.loadAsync(src).then((texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = true;
        texture.anisotropy = Math.min(8, maxAnisotropy);
        // object-fit: cover on the card's plane.
        const imageAspect = texture.image.width / texture.image.height;
        const planeAspect = CARD_WIDTH / CARD_HEIGHT;
        if (imageAspect > planeAspect) {
          texture.repeat.set(planeAspect / imageAspect, 1);
          texture.offset.set((1 - texture.repeat.x) / 2, 0);
        } else {
          texture.repeat.set(1, imageAspect / planeAspect);
          texture.offset.set(0, (1 - texture.repeat.y) / 2);
        }
        return texture;
      });
      textures.set(src, pending);
    }
    return pending;
  };
  let reportedFailure = false;
  for (const mesh of cards) {
    textureFor(mesh.userData.src).then(
      (texture) => {
        mesh.material.dispose();
        // Full opacity on arrival, then damped down to the resting value.
        mesh.material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 1,
        });
        mesh.userData.loaded = true;
      },
      (cause) => {
        if (reportedFailure) return;
        reportedFailure = true;
        warn(
          "website-ring: a screenshot did not load as a texture (CORS?).",
          mesh.userData.src,
          cause,
        );
      },
    );
  }

  // The canvas fades in once the scene is half on screen.
  const viewWatcher = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      viewWatcher.disconnect();
      setState(scene, "visible");
    },
    { threshold: 0.5 },
  );
  viewWatcher.observe(scene);

  // The pill: follows the pointer, shows the domain of the card under it.
  const canHover = matchMedia("(hover: hover)").matches && pill && pillText;
  const pillX = new Spring(0, { stiffness: 400, damping: 50, mass: 2 });
  const pillY = new Spring(0, { stiffness: 400, damping: 50, mass: 2 });
  const pillScale = new Spring(0.75, { stiffness: 250, damping: 15 });
  const pillOpacity = new Spring(0, { stiffness: 250, damping: 15 });
  const pillTurn = new Spring(15, { stiffness: 250, damping: 15 });
  let pillVisible = false;
  if (canHover) {
    document.addEventListener("mousemove", (event) => {
      pillX.set(
        Math.min(
          event.clientX + PILL_OFFSET,
          innerWidth - (pill.offsetWidth || 0) - PILL_OFFSET,
        ),
      );
      pillY.set(event.clientY + PILL_OFFSET);
    });
  }

  function setActive(siteTitle) {
    activeTitle = siteTitle;
    syncCursor();
    if (!canHover) return;
    if (siteTitle) {
      pillText.textContent = siteTitle;
      if (!pillVisible) {
        pillVisible = true;
        setState(pill, "active");
        pillScale.jump(0.75);
        pillOpacity.jump(0);
        pillTurn.jump(15);
        wake();
      }
      pillScale.set(1);
      pillOpacity.set(1);
      pillTurn.set(0);
    } else {
      pillScale.set(0.75);
      pillOpacity.set(0);
      pillTurn.set(15);
    }
  }

  // Pointer: the camera leans after it, the nearest card under it is active.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(0, 0);
  let hovered = null;
  let downAt = null;
  const updatePointer = (event) => {
    const box = scene.getBoundingClientRect();
    pointer.x = ((event.clientX - box.left) / box.width) * 2 - 1;
    pointer.y = -((event.clientY - box.top) / box.height) * 2 + 1;
  };
  const pick = () => {
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(cards, false)[0]?.object ?? null;
  };
  scene.addEventListener("pointermove", (event) => {
    updatePointer(event);
    const card = pick();
    if (card === hovered) return;
    if (hovered) {
      hovered.userData.hovered = false;
      setActive(null);
    }
    if (card) {
      card.userData.hovered = true;
      setActive(card.userData.title);
    }
    hovered = card;
  });
  scene.addEventListener("pointerleave", () => {
    if (!hovered) return;
    hovered.userData.hovered = false;
    hovered = null;
    setActive(null);
  });
  scene.addEventListener("pointerdown", (event) => {
    downAt = [event.clientX, event.clientY];
  });
  scene.addEventListener("click", (event) => {
    if (
      downAt &&
      Math.hypot(event.clientX - downAt[0], event.clientY - downAt[1]) >
        CLICK_SLOP
    ) {
      return;
    }
    updatePointer(event);
    const card = pick();
    if (card) window.open(card.userData.href, "_blank", "noopener");
  });

  function resize() {
    const width = scene.clientWidth;
    const height = scene.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    isMobile = innerWidth < DESKTOP_WIDTH || isTouch;
    camera.fov = isMobile ? 80 : 65;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(scene);
  resize();

  // The loop runs while the section is on screen, or while the pill is
  // still fading out after it.
  let onScreen = false;
  let frame = 0;
  let last = 0;
  function wake() {
    if (frame) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) wake();
  }).observe(root);

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    // Title tilt, [0,1] → ±30°; the CSS applies it at 1280px and up.
    if (title) {
      const mx = mouseX.step(dt);
      const my = mouseY.step(dt);
      title.style.setProperty(
        "--rc-website-ring-rotate-x",
        `${30 - 60 * my}deg`,
      );
      title.style.setProperty(
        "--rc-website-ring-rotate-y",
        `${-30 + 60 * mx}deg`,
      );
    }

    if (pillVisible) {
      const x = pillX.step(dt);
      const y = pillY.step(dt);
      const scale = pillScale.step(dt);
      const opacity = pillOpacity.step(dt);
      const turn = pillTurn.step(dt);
      pill.style.transform = `translate3d(${x}px, ${y}px, 0) perspective(600px) rotateY(${turn}deg) scale(${scale})`;
      pill.style.opacity = String(Math.max(0, Math.min(1, opacity)));
      if (!activeTitle && opacity < 0.01) {
        pillVisible = false;
        setState(pill, null);
      }
    } else {
      pillX.jump(pillX.target);
      pillY.jump(pillY.target);
    }

    if (!onScreen) {
      frame = pillVisible ? requestAnimationFrame(tick) : 0;
      return;
    }

    controls.update();
    // The camera leans after the pointer until the visitor first drags.
    if (!hasDragged)
      damp3(camera.position, [pointer.x, -pointer.y, -3], 0.3, dt);

    const rest = isMobile ? 0.8 : 0.5;
    for (const card of cards) {
      if (!card.userData.loaded) continue;
      const on = card.userData.hovered;
      if (!isMobile) {
        damp3(card.scale, on ? [1.2, 1.2, 1.2] : [1, 1, 1], 0.1, dt);
      }
      damp(card.material, "opacity", on ? 1 : rest, 0.2, dt);
    }

    renderer.render(world, camera);
    frame = requestAnimationFrame(tick);
  }
}
