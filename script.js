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
const earthCanvas = document.querySelector("#earth-render");
const activeOrbitOrder = ["jurisfield", "atlas", "nammatn", "mapsmith"];
const activeOrbitCycleMs = 3200;
const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
let stars = [];
let starFrame;
let activeOrbitTimer;
let activeOrbitInteractionLocked = false;
let scrollDepth = 0;
let orbitalElapsed = 0;
let lastFrameTime = performance.now();

function renderCloudlessEarth() {
  if (!earthCanvas) return;
  const earthContext = earthCanvas.getContext("2d", { alpha: true });
  if (!earthContext) return;

  const texture = new Image();
  texture.decoding = "async";
  texture.addEventListener("load", () => {
    const source = document.createElement("canvas");
    source.width = texture.naturalWidth;
    source.height = texture.naturalHeight;
    const sourceContext = source.getContext("2d", { willReadFrequently: true });
    if (!sourceContext) return;
    sourceContext.drawImage(texture, 0, 0);

    const sourcePixels = sourceContext.getImageData(0, 0, source.width, source.height).data;
    const output = earthContext.createImageData(earthCanvas.width, earthCanvas.height);
    const outputPixels = output.data;
    const radius = earthCanvas.width * 0.494;
    const centre = earthCanvas.width / 2;
    const earthFocus = { latitude: 20.6, longitude: 78.9 };
    const centreLatitude = earthFocus.latitude * Math.PI / 180;
    const centreLongitude = earthFocus.longitude * Math.PI / 180;
    const sinLatitude = Math.sin(centreLatitude);
    const cosLatitude = Math.cos(centreLatitude);
    const sinLongitude = Math.sin(centreLongitude);
    const cosLongitude = Math.cos(centreLongitude);
    const centreVector = [cosLatitude * cosLongitude, cosLatitude * sinLongitude, sinLatitude];
    const eastVector = [-sinLongitude, cosLongitude, 0];
    const northVector = [-sinLatitude * cosLongitude, -sinLatitude * sinLongitude, cosLatitude];

    const sample = (x, y, channel) => sourcePixels[(y * source.width + x) * 4 + channel];
    const lightVector = [-0.36, 0.3, 0.884];
    const halfVector = [-0.187, 0.156, 0.97];
    const atmosphereColor = [0.018, 0.055, 0.14];

    for (let y = 0; y < earthCanvas.height; y += 1) {
      const north = -(y + 0.5 - centre) / radius;
      for (let x = 0; x < earthCanvas.width; x += 1) {
        const east = (x + 0.5 - centre) / radius;
        const distanceSquared = east * east + north * north;
        if (distanceSquared > 1) continue;

        const forward = Math.sqrt(1 - distanceSquared);
        const sphereX = forward * centreVector[0] + east * eastVector[0] + north * northVector[0];
        const sphereY = forward * centreVector[1] + east * eastVector[1] + north * northVector[1];
        const sphereZ = forward * centreVector[2] + east * eastVector[2] + north * northVector[2];
        const latitude = Math.asin(Math.max(-1, Math.min(1, sphereZ)));
        const longitude = Math.atan2(sphereY, sphereX);
        const sourceX = ((longitude + Math.PI) / (2 * Math.PI)) * source.width;
        const sourceY = ((Math.PI / 2 - latitude) / Math.PI) * source.height;
        const x0 = Math.floor(sourceX) % source.width;
        const x1 = (x0 + 1) % source.width;
        const y0 = Math.max(0, Math.min(source.height - 1, Math.floor(sourceY)));
        const y1 = Math.min(source.height - 1, y0 + 1);
        const mixX = sourceX - Math.floor(sourceX);
        const mixY = sourceY - Math.floor(sourceY);
        const outputIndex = (y * earthCanvas.width + x) * 4;
        const sampledColor = [0, 0, 0];
        for (let channel = 0; channel < 3; channel += 1) {
          const top = sample(x0, y0, channel) * (1 - mixX) + sample(x1, y0, channel) * mixX;
          const bottom = sample(x0, y1, channel) * (1 - mixX) + sample(x1, y1, channel) * mixX;
          sampledColor[channel] = (top * (1 - mixY) + bottom * mixY) / 255;
        }

        const diffuse = Math.max(0, east * lightVector[0] + north * lightVector[1] + forward * lightVector[2]);
        const limbDarkening = 0.76 + forward * 0.24;
        const surfaceLight = (0.37 + diffuse * 0.78) * limbDarkening;
        const fresnel = Math.pow(1 - forward, 3.2);
        const atmosphere = fresnel * (0.22 + diffuse * 0.78);
        const isOcean = sampledColor[2] > sampledColor[0] * 1.4 && sampledColor[2] > sampledColor[1] * 1.22;
        const specularAngle = Math.max(0, east * halfVector[0] + north * halfVector[1] + forward * halfVector[2]);
        const specular = isOcean ? Math.pow(specularAngle, 44) * 0.18 : 0;

        for (let channel = 0; channel < 3; channel += 1) {
          const linearSurface = Math.pow(sampledColor[channel], 2.2) * surfaceLight;
          const linearColor = linearSurface + atmosphereColor[channel] * atmosphere + specular;
          outputPixels[outputIndex + channel] = Math.min(255, Math.pow(linearColor, 1 / 2.2) * 255);
        }

        const edgeFeather = Math.min(1, (1 - Math.sqrt(distanceSquared)) * 110);
        outputPixels[outputIndex + 3] = 255 * edgeFeather;
      }
    }

    earthContext.putImageData(output, 0, 0);
  });
  texture.src = earthCanvas.dataset.texture;
}

renderCloudlessEarth();

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

function scheduleActiveOrbitCycle() {
  stopActiveOrbitCycle();
  if (!motionRunning || prefersReducedMotion.matches || document.hidden) return;

  activeOrbitTimer = window.setTimeout(() => {
    if (!activeOrbitInteractionLocked) {
      const currentIndex = activeOrbitOrder.indexOf(gravityStage.dataset.activeOrbit);
      const nextIndex = (currentIndex + 1 + activeOrbitOrder.length) % activeOrbitOrder.length;
      setActiveOrbit(activeOrbitOrder[nextIndex]);
    }
    scheduleActiveOrbitCycle();
  }, activeOrbitCycleMs);
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
scheduleActiveOrbitCycle();

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopActiveOrbitCycle();
  else scheduleActiveOrbitCycle();
});

function createStars() {
  const density = Math.max(110, Math.min(260, Math.floor(window.innerWidth / 5.5)));
  stars = Array.from({ length: density }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
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
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * ratio);
  canvas.height = Math.round(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  createStars();
  updateProductOrbits();
  drawStarfield();
}

function drawStarfield(timestamp = performance.now()) {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  pointer.x += (pointer.targetX - pointer.x) * 0.035;
  pointer.y += (pointer.targetY - pointer.y) * 0.035;

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

function updateProductOrbits(elapsed = orbitalElapsed) {
  if (!gravityStage || gravityStage.classList.contains("has-three-universe")) return;
  const bounds = gravityStage.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;

  const compactX = bounds.width < 500 ? 0.9 : 1;
  const compactY = 1;

  orbitPlanets.forEach((planet) => {
    const orbitName = planet.dataset.orbitPlanet;
    const configuration = orbitConfiguration[orbitName];
    if (!configuration) return;

    const radiusX = bounds.width * configuration.radiusX * compactX;
    const radiusY = bounds.height * configuration.radiusY * compactY;
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

function animateStarfield(timestamp) {
  const frameTime = Number.isFinite(timestamp) ? timestamp : performance.now();
  const frameDelta = Math.min(64, Math.max(0, frameTime - lastFrameTime));
  lastFrameTime = frameTime;
  orbitalElapsed += frameDelta;
  updateProductOrbits();
  drawStarfield(frameTime);
  if (motionRunning) starFrame = window.requestAnimationFrame(animateStarfield);
}

function startStarfield() {
  window.cancelAnimationFrame(starFrame);
  lastFrameTime = performance.now();
  updateProductOrbits();
  drawStarfield();
  if (motionRunning) starFrame = window.requestAnimationFrame(animateStarfield);
}

window.addEventListener("pointermove", (event) => {
  pointer.targetX = event.clientX / window.innerWidth - 0.5;
  pointer.targetY = event.clientY / window.innerHeight - 0.5;
}, { passive: true });

window.addEventListener("resize", sizeStarfield, { passive: true });
sizeStarfield();
startStarfield();

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
  startStarfield();
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
}
window.addEventListener("scroll", updateFlightPosition, { passive: true });
updateFlightPosition();

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
