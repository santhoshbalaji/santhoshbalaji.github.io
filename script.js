const root = document.documentElement;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let motionRunning = !prefersReducedMotion.matches;

const projectData = {
  jurisfield: { name: "JurisField", className: "Field operations system", orbitClass: "Field operations", orbitCode: "01 / 04", orbitNote: "Trusted evidence from field to office.", logo: "assets/logos/jurisfield.svg" },
  atlas: { name: "Atlas", className: "AI media system", orbitClass: "AI media", orbitCode: "02 / 04", orbitNote: "An inspectable path from research to video.", logo: "assets/logos/atlas.svg" },
  nammatn: { name: "NammaTN", className: "Civic technology system", orbitClass: "Civic technology", orbitCode: "03 / 04", orbitNote: "Public reporting with visible follow-through.", logo: "assets/logos/nammatn.svg" },
  mapsmith: { name: "MapSmith", className: "GIS infrastructure system", orbitClass: "GIS infrastructure", orbitCode: "04 / 04", orbitNote: "A programmable core for spatial systems.", logo: "assets/logos/mapsmith.svg" },
};

const missionTabs = [...document.querySelectorAll(".mission-tab")];
const missionPanels = [...document.querySelectorAll(".mission-panel")];
const missionExplorer = document.querySelector("#mission-explorer");

function selectProject(project, { focus = false } = {}) {
  const selectedTab = missionTabs.find((tab) => tab.dataset.project === project);
  const selectedPanel = missionPanels.find((panel) => panel.dataset.panel === project);
  if (!selectedTab || !selectedPanel || !projectData[project]) return;

  missionTabs.forEach((tab) => {
    const selected = tab === selectedTab;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  missionPanels.forEach((panel) => {
    const selected = panel === selectedPanel;
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
  });

  missionExplorer.dataset.activeProject = project;
  if (focus) selectedTab.focus();
}

missionTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectProject(tab.dataset.project));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (["ArrowRight", "ArrowDown"].includes(event.key)) nextIndex = (index + 1) % missionTabs.length;
    if (["ArrowLeft", "ArrowUp"].includes(event.key)) nextIndex = (index - 1 + missionTabs.length) % missionTabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = missionTabs.length - 1;
    selectProject(missionTabs[nextIndex].dataset.project, { focus: true });
  });
});

document.querySelectorAll("[data-select-project]").forEach((link) => {
  link.addEventListener("click", () => selectProject(link.dataset.selectProject));
});

const careerTabs = [...document.querySelectorAll(".career-node")];
const careerPanels = [...document.querySelectorAll(".career-note")];
const careerTrace = document.querySelector(".career-trace");

function selectCareer(career, { focus = false } = {}) {
  const selectedTab = careerTabs.find((tab) => tab.dataset.career === career);
  const selectedPanel = careerPanels.find((panel) => panel.dataset.careerPanel === career);
  if (!selectedTab || !selectedPanel) return;

  careerTabs.forEach((tab) => {
    const selected = tab === selectedTab;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  careerPanels.forEach((panel) => {
    const selected = panel === selectedPanel;
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
  });

  careerTrace.dataset.activeCareer = career;

  if (focus) selectedTab.focus();
}

careerTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectCareer(tab.dataset.career));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % careerTabs.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + careerTabs.length) % careerTabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = careerTabs.length - 1;
    selectCareer(careerTabs[nextIndex].dataset.career, { focus: true });
  });
});

const canvas = document.querySelector("#starfield");
const context = canvas.getContext("2d", { alpha: true });
const gravityStage = document.querySelector("#gravity-stage");
const universeCanvas = document.querySelector("#universe-render");
const universeActivate = document.querySelector("#universe-activate");
let threeUniversePromise = null;

function restoreUniversePreview(error) {
  window.clearTimeout(window.__portfolioUniverseBootTimer);
  if (!gravityStage || gravityStage.dataset.threeState === "ready") return;
  gravityStage.classList.remove("has-three-universe", "has-product-orrery");
  gravityStage.dataset.threeState = "fallback";
  if (universeCanvas) universeCanvas.hidden = true;
  if (universeActivate) {
    universeActivate.disabled = false;
    universeActivate.removeAttribute("aria-busy");
  }
  window.dispatchEvent(new CustomEvent("universe:fallback"));
  if (error) console.warn("3D universe unavailable; retaining the lightweight product preview.", error);
}

function activateThreeUniverse(reason = "control") {
  if (!gravityStage || gravityStage.dataset.threeState === "ready") return threeUniversePromise;
  if (threeUniversePromise) return threeUniversePromise;

  gravityStage.dataset.threeState = "booting";
  gravityStage.dataset.threeActivation = reason;
  if (universeActivate) {
    universeActivate.disabled = true;
    universeActivate.setAttribute("aria-busy", "true");
  }
  window.__portfolioUniverseBootTimer = window.setTimeout(() => restoreUniversePreview(), 8000);
  threeUniversePromise = import("./three-universe.js?v=35").catch((error) => {
    threeUniversePromise = null;
    restoreUniversePreview(error);
  });
  return threeUniversePromise;
}

universeActivate?.addEventListener("click", () => activateThreeUniverse("explicit-control"));
window.addEventListener("universe:ready", () => {
  window.clearTimeout(window.__portfolioUniverseBootTimer);
  universeActivate?.removeAttribute("aria-busy");
});
const orbitPlanets = [...document.querySelectorAll("[data-orbit-planet]")];
const orbitPaths = new Map(
  [...document.querySelectorAll("[data-orbit-path]")].map((path) => [path.dataset.orbitPath, path]),
);
const orbitConfiguration = {
  jurisfield: { radiusX: 0.24, radiusY: 0.11, duration: 18000, phase: Math.PI * 0.55, rotation: -4 },
  atlas: { radiusX: 0.32, radiusY: 0.15, duration: 26000, phase: -Math.PI / 2, rotation: 2 },
  nammatn: { radiusX: 0.4, radiusY: 0.19, duration: 38000, phase: Math.PI * 0.05, rotation: -1 },
  mapsmith: { radiusX: 0.47, radiusY: 0.235, duration: 54000, phase: Math.PI * 1.05, rotation: 4 },
};
const orbitReadoutCode = document.querySelector("#orbit-readout-code");
const orbitReadoutLogo = document.querySelector("#orbit-readout-logo");
const orbitReadoutName = document.querySelector("#orbit-readout-name");
const orbitReadoutClass = document.querySelector("#orbit-readout-class");
const orbitReadoutNote = document.querySelector("#orbit-readout-note");
const activeOrbitOrder = ["jurisfield", "atlas", "nammatn", "mapsmith"];
const activeOrbitCycleMs = 3200;
const initialActiveOrbitDelayMs = 6400;
const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
let stars = [];
let starFrame;
let starfieldReady = false;
let activeOrbitTimer;
let activeOrbitInteractionLocked = false;
let scrollDepth = 0;
let orbitalElapsed = 0;

function setActiveOrbit(project) {
  const data = projectData[project];
  if (!data || !gravityStage) return;
  gravityStage.dataset.activeOrbit = project;
  orbitReadoutCode.textContent = data.orbitCode;
  orbitReadoutLogo.src = data.logo;
  orbitReadoutName.textContent = data.name;
  orbitReadoutClass.textContent = data.orbitClass;
  orbitReadoutNote.textContent = data.orbitNote;
  window.dispatchEvent(new CustomEvent("orbit:active", { detail: { project } }));
}

function stopActiveOrbitCycle() {
  window.clearTimeout(activeOrbitTimer);
}

function scheduleActiveOrbitCycle(delay = activeOrbitCycleMs) {
  stopActiveOrbitCycle();
  if (!motionRunning || prefersReducedMotion.matches || document.hidden) return;

  activeOrbitTimer = window.setTimeout(() => {
    if (!activeOrbitInteractionLocked) {
      const currentIndex = activeOrbitOrder.indexOf(gravityStage.dataset.activeOrbit);
      const nextIndex = (currentIndex + 1 + activeOrbitOrder.length) % activeOrbitOrder.length;
      setActiveOrbit(activeOrbitOrder[nextIndex]);
    }
    scheduleActiveOrbitCycle();
  }, delay);
}

orbitPlanets.forEach((planet) => {
  const activate = () => {
    activeOrbitInteractionLocked = true;
    stopActiveOrbitCycle();
    setActiveOrbit(planet.dataset.orbitPlanet);
  };
  const release = () => {
    activeOrbitInteractionLocked = false;
    scheduleActiveOrbitCycle();
  };
  planet.addEventListener("pointerenter", activate);
  planet.addEventListener("pointerleave", release);
  planet.addEventListener("focus", activate);
  planet.addEventListener("blur", release);
});
window.addEventListener("universe:active", (event) => {
  if (!event.detail?.project) return;
  activeOrbitInteractionLocked = true;
  stopActiveOrbitCycle();
  setActiveOrbit(event.detail.project);
});
window.addEventListener("universe:release", () => {
  activeOrbitInteractionLocked = false;
  scheduleActiveOrbitCycle();
});
setActiveOrbit("jurisfield");
scheduleActiveOrbitCycle(initialActiveOrbitDelayMs);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopActiveOrbitCycle();
  else scheduleActiveOrbitCycle();
});

function createStars(viewportWidth, viewportHeight) {
  const density = Math.max(72, Math.min(170, Math.floor(viewportWidth / 8)));
  stars = Array.from({ length: density }, () => ({
    x: Math.random() * viewportWidth,
    y: Math.random() * viewportHeight,
    z: 0.18 + Math.random() * 0.82,
    size: 0.35 + Math.random() * 1.15,
    alpha: 0.22 + Math.random() * 0.68,
    warm: Math.random() > 0.88,
    ice: Math.random() > 0.72,
    twinkle: 0.00035 + Math.random() * 0.00065,
    phase: Math.random() * Math.PI * 2,
    spark: Math.random() > 0.955,
  }));
}

function sizeStarfield() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(viewportWidth * ratio);
  canvas.height = Math.round(viewportHeight * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  createStars(viewportWidth, viewportHeight);
  drawStarfield();
}

function ensureStarfield() {
  if (starfieldReady) return;
  starfieldReady = true;
  sizeStarfield();
}

function drawStarfield(timestamp = performance.now()) {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  pointer.x = pointer.targetX;
  pointer.y = pointer.targetY;

  stars.forEach((star) => {
    const depthX = pointer.x * star.z * 18;
    const depthY = pointer.y * star.z * 12 + scrollDepth * star.z * 0.025;
    const x = (star.x + depthX + window.innerWidth) % window.innerWidth;
    const y = (star.y + depthY + window.innerHeight) % window.innerHeight;
    const radius = star.size * star.z;
    const alpha = star.alpha * (0.78 + Math.sin(timestamp * star.twinkle + star.phase) * 0.22);
    context.beginPath();
    context.fillStyle = star.warm
      ? `rgba(242, 201, 109, ${alpha})`
      : star.ice
        ? `rgba(184, 198, 255, ${alpha})`
        : `rgba(220, 231, 255, ${alpha})`;
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    if (star.spark && radius > 0.72) {
      const flare = radius * 4.4;
      context.beginPath();
      context.strokeStyle = `rgba(220, 231, 255, ${alpha * 0.34})`;
      context.lineWidth = 0.35;
      context.moveTo(x - flare, y);
      context.lineTo(x + flare, y);
      context.moveTo(x, y - flare * 0.58);
      context.lineTo(x, y + flare * 0.58);
      context.stroke();
    }
  });
}

const orbitStageSize = { width: 0, height: 0 };

function updateProductOrbits(elapsed = orbitalElapsed) {
  if (!gravityStage || !orbitStageSize.width || !orbitStageSize.height) return;

  const compactX = orbitStageSize.width < 500 ? 0.9 : 1;
  const compactY = 1;

  orbitPlanets.forEach((planet) => {
    const orbitName = planet.dataset.orbitPlanet;
    const configuration = orbitConfiguration[orbitName];
    if (!configuration) return;

    const radiusX = orbitStageSize.width * configuration.radiusX * compactX;
    const radiusY = orbitStageSize.height * configuration.radiusY * compactY;
    const rotation = configuration.rotation * Math.PI / 180;
    const angle = configuration.phase + elapsed / configuration.duration * Math.PI * 2;
    const ellipseX = Math.cos(angle) * radiusX;
    const ellipseY = Math.sin(angle) * radiusY;
    const orbitX = ellipseX * Math.cos(rotation) - ellipseY * Math.sin(rotation);
    const orbitY = ellipseX * Math.sin(rotation) + ellipseY * Math.cos(rotation);
    const depth = (Math.sin(angle) + 1) / 2;

    planet.style.setProperty("--orbit-x", `${orbitX.toFixed(2)}px`);
    planet.style.setProperty("--orbit-y", `${orbitY.toFixed(2)}px`);
    planet.style.setProperty("--orbit-scale", (0.9 + depth * 0.19).toFixed(3));
    planet.style.setProperty("--orbit-brightness", (0.84 + depth * 0.24).toFixed(3));
    planet.style.zIndex = String(6 + Math.round(depth * 8));

    const path = orbitPaths.get(orbitName);
    if (path) {
      path.style.width = `${(radiusX * 2).toFixed(2)}px`;
      path.style.height = `${(radiusY * 2).toFixed(2)}px`;
      path.style.setProperty("--orbit-rotation", `${configuration.rotation}deg`);
    }
  });
}

function scheduleStarfieldDraw() {
  if (!starfieldReady) return;
  if (starFrame) return;
  starFrame = window.requestAnimationFrame((timestamp) => {
    starFrame = 0;
    drawStarfield(timestamp);
  });
}

window.addEventListener("pointermove", (event) => {
  pointer.targetX = event.clientX / window.innerWidth - 0.5;
  pointer.targetY = event.clientY / window.innerHeight - 0.5;
  if (motionRunning) {
    ensureStarfield();
    scheduleStarfieldDraw();
  }
}, { passive: true });

window.addEventListener("resize", () => {
  if (starfieldReady) sizeStarfield();
}, { passive: true });

if (gravityStage && "ResizeObserver" in window) {
  const orbitResizeObserver = new ResizeObserver(([entry]) => {
    orbitStageSize.width = entry.contentRect.width;
    orbitStageSize.height = entry.contentRect.height;
    updateProductOrbits();
  });
  orbitResizeObserver.observe(gravityStage);
}
window.addEventListener("universe:fallback", () => updateProductOrbits());

gravityStage.addEventListener("pointermove", (event) => {
  if (!motionRunning || gravityStage.classList.contains("has-three-universe")) return;
  const bounds = gravityStage.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width - 0.5;
  const y = (event.clientY - bounds.top) / bounds.height - 0.5;
  gravityStage.style.setProperty("--tilt-x", `${y * -5}deg`);
  gravityStage.style.setProperty("--tilt-y", `${x * 6}deg`);
});
gravityStage.addEventListener("pointerleave", () => {
  gravityStage.style.setProperty("--tilt-x", "0deg");
  gravityStage.style.setProperty("--tilt-y", "0deg");
});

const motionControl = document.querySelector("#motion-control");
function setMotion(running) {
  motionRunning = running && !prefersReducedMotion.matches;
  root.dataset.motion = motionRunning ? "running" : "paused";
  motionControl.setAttribute("aria-pressed", String(!motionRunning));
  motionControl.querySelector(".motion-label").textContent = motionRunning ? "Pause motion" : "Resume motion";
  scheduleStarfieldDraw();
  if (motionRunning) scheduleActiveOrbitCycle();
  else stopActiveOrbitCycle();
  window.dispatchEvent(new CustomEvent("motion:change", { detail: { running: motionRunning } }));
}
motionControl.addEventListener("click", () => setMotion(!motionRunning));
prefersReducedMotion.addEventListener("change", () => setMotion(!prefersReducedMotion.matches));

const header = document.querySelector("#site-header");
const navLinks = [...document.querySelectorAll(".site-nav a")];
const flightLinks = [...document.querySelectorAll("[data-flight-section]")];
const sections = [...document.querySelectorAll("main > section[id], #experience")];
const flightMarker = document.querySelector("#flight-marker");

function updateFlightPosition() {
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
  flightMarker.style.top = `${progress * 100}%`;
  header.classList.toggle("is-scrolled", window.scrollY > 32);
  scrollDepth = window.scrollY;
  scheduleStarfieldDraw();
}
let flightFrame = 0;
function scheduleFlightPosition() {
  if (flightFrame) return;
  flightFrame = window.requestAnimationFrame(() => {
    flightFrame = 0;
    updateFlightPosition();
  });
}
window.addEventListener("scroll", scheduleFlightPosition, { passive: true });
scheduleFlightPosition();

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      [...navLinks, ...flightLinks].forEach((link) => {
        link.toggleAttribute("aria-current", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: "-38% 0px -52%", threshold: 0 });
  sections.forEach((section) => sectionObserver.observe(section));
}

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const menuButton = document.querySelector("#menu-button");
const mobileNav = document.querySelector("#mobile-nav");
menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!open));
  menuButton.textContent = open ? "Menu" : "Close";
  mobileNav.hidden = open;
});
mobileNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.textContent = "Menu";
    mobileNav.hidden = true;
  });
});

const copyButton = document.querySelector("#copy-email");
const toast = document.querySelector("#toast");
let toastTimer;
copyButton.addEventListener("click", async () => {
  const email = copyButton.dataset.email;
  try {
    await navigator.clipboard.writeText(email);
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = email;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.append(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
  }
  document.querySelector(".copy-label").textContent = "Copied";
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
    document.querySelector(".copy-label").textContent = "Copy email";
  }, 1600);
});

document.querySelector("#current-year").textContent = new Date().getFullYear();
