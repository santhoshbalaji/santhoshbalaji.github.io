import * as THREE from "./vendor/three.module.min.js";

const stage = document.querySelector("#gravity-stage");
const canvas = document.querySelector("#universe-render");

if (stage && canvas) {
  initialiseUniverse().catch((error) => {
    stage.dataset.threeState = "fallback";
    canvas.hidden = true;
    console.warn("3D universe unavailable; using the accessible CSS fallback.", error);
  });
}

async function initialiseUniverse() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  let rendererPixelRatio = 0;
  function syncPixelRatio() {
    const nextPixelRatio = Math.min(window.devicePixelRatio || 1, window.innerWidth < 640 ? 1.5 : 2);
    if (nextPixelRatio === rendererPixelRatio) return;
    rendererPixelRatio = nextPixelRatio;
    renderer.setPixelRatio(rendererPixelRatio);
  }
  syncPixelRatio();
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 10, 4000);
  camera.position.set(0, 0, 1200);
  camera.lookAt(0, 0, 0);

  const universe = new THREE.Group();
  scene.add(universe);

  scene.add(new THREE.AmbientLight(0xaec3eb, 0.48));
  scene.add(new THREE.HemisphereLight(0xe4edff, 0x02050c, 0.62));
  const keyLight = new THREE.DirectionalLight(0xfff1d0, 1.35);
  keyLight.position.set(-600, 620, 1000);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x4c6dff, 2.15);
  rimLight.position.set(620, -180, 760);
  scene.add(rimLight);

  const textureLoader = new THREE.TextureLoader();
  const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  const productDefinitions = [
    {
      key: "jurisfield",
      color: 0xb8e62e,
      deep: 0x183309,
      radius: 1.35,
      size: 0.21,
      logo: "assets/logos/jurisfield.svg",
      textureStyle: "terrain",
    },
    {
      key: "atlas",
      color: 0x6257ff,
      deep: 0x11104a,
      radius: 1.8,
      size: 0.25,
      logo: "assets/logos/atlas.svg",
      textureStyle: "bands",
      ringed: true,
    },
    {
      key: "nammatn",
      color: 0xd11f27,
      deep: 0x3c080b,
      radius: 2.22,
      size: 0.225,
      logo: "assets/logos/nammatn.svg",
      textureStyle: "craters",
    },
    {
      key: "mapsmith",
      color: 0x34bbb4,
      deep: 0x073338,
      radius: 2.62,
      size: 0.19,
      logo: "assets/logos/mapsmith.svg",
      textureStyle: "grid",
    },
  ];

  const solarSystem = createSolarSystem(textureLoader, maxAnisotropy, productDefinitions);
  universe.add(solarSystem.group);
  const { earth, products, occluders } = solarSystem;

  const raycaster = new THREE.Raycaster();
  const occlusionRaycaster = new THREE.Raycaster();
  const occlusionDirection = new THREE.Vector3();
  const pointer = new THREE.Vector2(4, 4);
  const projected = new THREE.Vector3();
  const worldPosition = new THREE.Vector3();
  const anchors = new Map(
    [...stage.querySelectorAll("[data-orbit-planet]")].map((anchor) => [anchor.dataset.orbitPlanet, anchor]),
  );
  const resetButton = stage.querySelector("#universe-reset");
  let activeProject = stage.dataset.activeOrbit || "jurisfield";
  let hoveredProject = null;
  let motionEnabled = document.documentElement.dataset.motion !== "paused"
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let elapsed = 0;
  let lastFrame = performance.now();
  let animationFrame = 0;
  let baseCameraDistance = 1200;
  let currentZoom = 1;
  let targetZoom = 1;
  let dragging = false;
  let pointerDown = null;
  let dragDistance = 0;
  const defaultRotationX = -0.52;
  const defaultRotationY = -0.18;
  let targetRotationX = defaultRotationX;
  let targetRotationY = defaultRotationY;
  let angularVelocityX = 0;
  let angularVelocityY = 0;
  let lastPointerSample = null;
  let pinchStartDistance = 0;
  let pinchStartZoom = 1;
  let pinching = false;
  let sceneVisible = true;
  const activePointers = new Map();

  stage.dataset.threeState = "ready";
  stage.dataset.threeVersion = THREE.REVISION;
  universe.rotation.set(defaultRotationX, defaultRotationY, 0);
  stage.dataset.threeDepth = "solar-system";
  stage.dataset.threeInteraction = "360-solar-system";
  stage.dataset.solarBodies = "sun-mercury-venus-earth-mars-jupiter-saturn-uranus-neptune";
  stage.classList.add("has-three-universe", "has-actual-solar-system");

  function resize() {
    syncPixelRatio();
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    baseCameraDistance = (height / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.z = baseCameraDistance * currentZoom;
    camera.far = Math.max(4000, baseCameraDistance * 3);
    camera.updateProjectionMatrix();
    solarSystem.resize(width, height);
    render(performance.now(), true);
  }

  function updatePointer(event) {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  }

  function hitTest(event) {
    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);
    const intersections = raycaster.intersectObjects(
      [...occluders, ...products.map((product) => product.hitTarget)],
      false,
    );
    if (!intersections.length || !intersections[0].object.userData.project) return null;
    return intersections[0].object.userData.project || null;
  }

  function setHovered(project) {
    if (hoveredProject === project) return;
    hoveredProject = project;
    canvas.classList.toggle("is-targeting", Boolean(project));
    if (project) {
      window.dispatchEvent(new CustomEvent("universe:active", { detail: { project } }));
    } else {
      window.dispatchEvent(new CustomEvent("universe:release"));
    }
  }

  function render(timestamp = performance.now(), force = false) {
    window.cancelAnimationFrame(animationFrame);
    const delta = Math.min(0.05, Math.max(0, (timestamp - lastFrame) / 1000));
    lastFrame = timestamp;
    if (motionEnabled) elapsed += delta;

    if (!dragging) {
      targetRotationX += angularVelocityX;
      targetRotationY += angularVelocityY;
      angularVelocityX *= 0.925;
      angularVelocityY *= 0.925;
      if (Math.abs(angularVelocityX) < 0.00002) angularVelocityX = 0;
      if (Math.abs(angularVelocityY) < 0.00002) angularVelocityY = 0;
    }

    universe.rotation.x += (targetRotationX - universe.rotation.x) * 0.075;
    universe.rotation.y += (targetRotationY - universe.rotation.y) * 0.075;
    currentZoom += (targetZoom - currentZoom) * 0.09;
    camera.position.z = baseCameraDistance * currentZoom;

    earth.mesh.rotation.y = THREE.MathUtils.degToRad(2.4) * Math.sin(elapsed * 0.14);
    earth.atmosphere.material.uniforms.viewVector.value.copy(camera.position);
    const stageBounds = stage.getBoundingClientRect();
    solarSystem.update(elapsed, delta, hoveredProject || activeProject, motionEnabled);

    products.forEach((product) => {
      const anchor = anchors.get(product.key);
      if (!anchor) return;
      product.group.scale.setScalar((anchor.offsetWidth / 2) / product.size);
      product.surface.rotation.y += motionEnabled ? delta * (0.18 + product.radius * 0.018) : 0;
      product.satellitePivot.rotation.z += motionEnabled ? delta * (0.22 + product.radius * 0.02) : 0;
      const selected = product.key === (hoveredProject || activeProject);
      product.glow.material.opacity += ((selected ? 0.58 : 0.3) - product.glow.material.opacity) * 0.08;
    });

    universe.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    products.forEach((product) => {
      const anchor = anchors.get(product.key);
      if (!anchor) return;
      product.group.getWorldPosition(worldPosition);
      projected.copy(worldPosition).project(camera);
      const perspectiveScale = baseCameraDistance / Math.max(80, camera.position.z - worldPosition.z);
      const distanceToProduct = camera.position.distanceTo(worldPosition);
      occlusionDirection.copy(worldPosition).sub(camera.position).normalize();
      occlusionRaycaster.set(camera.position, occlusionDirection);
      const bodyHit = occlusionRaycaster.intersectObjects(occluders, false)[0];
      const occluded = projected.z < -1
        || projected.z > 1
        || Boolean(bodyHit && bodyHit.distance < distanceToProduct);
      anchor.style.setProperty("--scene-x", `${(projected.x * stageBounds.width * 0.5).toFixed(2)}px`);
      anchor.style.setProperty("--scene-y", `${(-projected.y * stageBounds.height * 0.5).toFixed(2)}px`);
      anchor.style.setProperty("--scene-scale", perspectiveScale.toFixed(3));
      anchor.style.zIndex = String(Math.round(THREE.MathUtils.clamp(11 + worldPosition.z / 28, 6, 16)));
      anchor.classList.toggle("is-occluded", occluded);
    });

    renderer.render(scene, camera);
    const unsettled = Math.abs(targetRotationX - universe.rotation.x) > 0.0005
      || Math.abs(targetRotationY - universe.rotation.y) > 0.0005
      || Math.abs(targetZoom - currentZoom) > 0.0005
      || Math.abs(angularVelocityX) > 0.00002
      || Math.abs(angularVelocityY) > 0.00002;
    if (sceneVisible && (motionEnabled || dragging || force || unsettled)) {
      animationFrame = window.requestAnimationFrame(render);
    }
  }

  function resetView() {
    targetRotationX = defaultRotationX;
    targetRotationY = defaultRotationY;
    targetZoom = 1;
    angularVelocityX = 0;
    angularVelocityY = 0;
    render(performance.now(), true);
  }

  canvas.addEventListener("pointermove", (event) => {
    if (activePointers.has(event.pointerId)) {
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (activePointers.size >= 2) {
      pinching = true;
      const [first, second] = [...activePointers.values()];
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      if (!pinchStartDistance) {
        pinchStartDistance = distance;
        pinchStartZoom = targetZoom;
      }
      targetZoom = THREE.MathUtils.clamp(
        pinchStartZoom * (pinchStartDistance / Math.max(1, distance)),
        0.72,
        1.48,
      );
      pointerDown = null;
      setHovered(null);
      render(performance.now(), true);
      return;
    }
    if (dragging && pointerDown) {
      const dx = event.clientX - pointerDown.x;
      const dy = event.clientY - pointerDown.y;
      dragDistance = Math.max(dragDistance, Math.hypot(dx, dy));
      targetRotationY = pointerDown.rotationY + dx * 0.0037;
      targetRotationX = pointerDown.rotationX + dy * 0.0029;
      if (lastPointerSample) {
        angularVelocityY = (event.clientX - lastPointerSample.x) * 0.0014;
        angularVelocityX = (event.clientY - lastPointerSample.y) * 0.0011;
      }
      lastPointerSample = { x: event.clientX, y: event.clientY };
      setHovered(null);
      render(performance.now(), true);
      return;
    }
    setHovered(hitTest(event));
  }, { passive: true });

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.size === 2) {
      pinching = true;
      const [first, second] = [...activePointers.values()];
      pinchStartDistance = Math.hypot(second.x - first.x, second.y - first.y);
      pinchStartZoom = targetZoom;
      pointerDown = null;
    } else {
      pointerDown = { x: event.clientX, y: event.clientY, rotationX: targetRotationX, rotationY: targetRotationY };
    }
    dragging = true;
    dragDistance = 0;
    lastPointerSample = { x: event.clientX, y: event.clientY };
    angularVelocityX = 0;
    angularVelocityY = 0;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic and assistive pointer sources may not expose a capturable pointer.
    }
    canvas.classList.add("is-dragging");
  });

  canvas.addEventListener("pointerup", (event) => {
    const selected = !pinching && activePointers.size === 1 && dragDistance < 7 ? hitTest(event) : null;
    activePointers.delete(event.pointerId);
    if (!activePointers.size) pinching = false;
    pinchStartDistance = 0;
    dragging = false;
    pointerDown = null;
    lastPointerSample = null;
    canvas.classList.remove("is-dragging");
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (selected) anchors.get(selected)?.click();
  });

  canvas.addEventListener("pointercancel", (event) => {
    activePointers.delete(event.pointerId);
    if (!activePointers.size) pinching = false;
    pinchStartDistance = 0;
    dragging = false;
    pointerDown = null;
    lastPointerSample = null;
    canvas.classList.remove("is-dragging");
  });

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    targetZoom = THREE.MathUtils.clamp(targetZoom + Math.sign(event.deltaY) * 0.085, 0.72, 1.48);
    render(performance.now(), true);
  }, { passive: false });

  canvas.addEventListener("dblclick", resetView);
  resetButton?.addEventListener("click", resetView);

  canvas.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const handled = ["arrowleft", "arrowright", "arrowup", "arrowdown", "+", "=", "-", "_", "r", "0"].includes(key);
    if (!handled) return;
    event.preventDefault();
    if (key === "arrowleft") targetRotationY -= 0.12;
    if (key === "arrowright") targetRotationY += 0.12;
    if (key === "arrowup") targetRotationX -= 0.1;
    if (key === "arrowdown") targetRotationX += 0.1;
    if (["+", "="].includes(key)) targetZoom = THREE.MathUtils.clamp(targetZoom - 0.085, 0.72, 1.48);
    if (["-", "_"].includes(key)) targetZoom = THREE.MathUtils.clamp(targetZoom + 0.085, 0.72, 1.48);
    if (["r", "0"].includes(key)) {
      resetView();
      return;
    }
    render(performance.now(), true);
  });

  canvas.addEventListener("pointerleave", () => {
    if (!dragging) setHovered(null);
  });

  window.addEventListener("orbit:active", (event) => {
    if (!event.detail?.project) return;
    activeProject = event.detail.project;
    if (!motionEnabled) render(performance.now(), true);
  });

  window.addEventListener("motion:change", (event) => {
    motionEnabled = Boolean(event.detail?.running);
    lastFrame = performance.now();
    render(lastFrame, true);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(animationFrame);
      return;
    }
    if (!document.hidden) {
      lastFrame = performance.now();
      render(lastFrame, true);
    }
  });

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    sceneVisible = entry.isIntersecting;
    if (!sceneVisible) {
      window.cancelAnimationFrame(animationFrame);
      return;
    }
    lastFrame = performance.now();
    render(lastFrame, true);
  }, { threshold: 0.02 });
  visibilityObserver.observe(stage);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  resize();
  render(performance.now(), true);
}

function createSolarSystem(textureLoader, maxAnisotropy, productDefinitions) {
  const group = new THREE.Group();
  const planetSpecs = [
    { key: "mercury", name: "Mercury", au: 0.387, period: 0.241, inclination: 7.0, radius: 4.0, phase: 0.55, color: 0x9c978f, deep: 0x302d2b, style: "craters" },
    { key: "venus", name: "Venus", au: 0.723, period: 0.615, inclination: 3.39, radius: 6.8, phase: 2.45, color: 0xd6aa62, deep: 0x5b351c, style: "cloud-bands" },
    { key: "earth", name: "Earth", au: 1, period: 1, inclination: 0, radius: 9.2, phase: -0.28, color: 0x4f8cff, deep: 0x07152d, style: "earth" },
    { key: "mars", name: "Mars", au: 1.524, period: 1.881, inclination: 1.85, radius: 5.3, phase: 4.15, color: 0xc65e3a, deep: 0x4a180f, style: "craters" },
    { key: "jupiter", name: "Jupiter", au: 5.203, period: 11.86, inclination: 1.3, radius: 15.8, phase: 2.78, color: 0xc59b75, deep: 0x533b31, style: "gas-bands" },
    { key: "saturn", name: "Saturn", au: 9.537, period: 29.46, inclination: 2.49, radius: 13.4, phase: 5.35, color: 0xd8c38e, deep: 0x5d5030, style: "gas-bands", rings: true },
    { key: "uranus", name: "Uranus", au: 19.19, period: 84.01, inclination: 0.77, radius: 9.8, phase: 1.08, color: 0x83d6dc, deep: 0x184b59, style: "ice", axialTilt: 97.8, faintRings: true },
    { key: "neptune", name: "Neptune", au: 30.06, period: 164.8, inclination: 1.77, radius: 9.5, phase: 3.65, color: 0x426bd6, deep: 0x0b1f5b, style: "ice" },
  ];

  const sun = createSun();
  group.add(sun.group);
  const occluders = [sun.mesh];
  const earth = createEarth(textureLoader, maxAnisotropy);
  const bodies = [];
  let earthCarrier = null;

  planetSpecs.forEach((spec) => {
    const orbitPlane = new THREE.Group();
    orbitPlane.rotation.x = THREE.MathUtils.degToRad(spec.inclination);
    const orbitLine = createOrbitLine(spec.key === "earth" ? 0x74a3ff : 0x7a88a8, spec.key === "earth" ? 0.28 : 0.105);
    orbitPlane.add(orbitLine);
    const carrier = new THREE.Group();
    orbitPlane.add(carrier);
    const visual = spec.key === "earth" ? earth : createSolarPlanet(spec);
    carrier.add(visual.group);
    const label = createPlanetLabel(spec.name, spec.key === "earth");
    carrier.add(label);
    group.add(orbitPlane);
    occluders.push(visual.mesh);
    if (spec.key === "earth") earthCarrier = carrier;
    bodies.push({ spec, orbitPlane, orbitLine, carrier, visual, label, orbitRadius: 1 });
  });

  const missionHub = new THREE.Group();
  earthCarrier.add(missionHub);
  const missionRadii = [17, 22, 27, 32];
  const missionPhases = [0.2, 1.85, 3.55, 5.15];
  const products = productDefinitions.map((definition, index) => {
    const product = createProductWorld(definition, maxAnisotropy);
    missionHub.add(product.group);
    const missionOrbit = createOrbitLine(definition.color, 0.2);
    missionOrbit.scale.setScalar(missionRadii[index]);
    missionOrbit.rotation.x = THREE.MathUtils.degToRad(55 + index * 5);
    missionHub.add(missionOrbit);
    return {
      ...definition,
      ...product,
      missionOrbit,
      missionRadius: missionRadii[index],
      missionPhase: missionPhases[index],
    };
  });

  const asteroidRandom = seededRandom(481516);
  const asteroidPositions = [];
  for (let index = 0; index < 720; index += 1) {
    const angle = asteroidRandom() * Math.PI * 2;
    const radius = 0.92 + asteroidRandom() * 0.16;
    asteroidPositions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, (asteroidRandom() - 0.5) * 0.045);
  }
  const asteroidGeometry = new THREE.BufferGeometry();
  asteroidGeometry.setAttribute("position", new THREE.Float32BufferAttribute(asteroidPositions, 3));
  const asteroidBelt = new THREE.Points(asteroidGeometry, new THREE.PointsMaterial({
    color: 0x9ca7bd,
    size: 1,
    transparent: true,
    opacity: 0.34,
    sizeAttenuation: false,
    depthWrite: false,
  }));
  asteroidBelt.rotation.x = THREE.MathUtils.degToRad(1.5);
  group.add(asteroidBelt);

  const starRandom = seededRandom(20260824);
  const starPositions = [];
  for (let index = 0; index < 360; index += 1) {
    starPositions.push((starRandom() - 0.5) * 2, (starRandom() - 0.5) * 2, -0.25 - starRandom() * 0.75);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
  const depthStars = new THREE.Points(starGeometry, new THREE.PointsMaterial({
    color: 0xaebcf0,
    size: 0.9,
    transparent: true,
    opacity: 0.28,
    sizeAttenuation: false,
    depthWrite: false,
  }));
  group.add(depthStars);

  function resize(width, height) {
    const extent = Math.min(width * 0.47, height * 0.47);
    const compactScale = Math.min(width, height) < 430 ? 0.86 : 1;
    sun.group.scale.setScalar(24 * compactScale);
    bodies.forEach((body) => {
      const normalizedDistance = Math.log1p(body.spec.au) / Math.log1p(30.06);
      body.orbitRadius = extent * (0.105 + normalizedDistance * 0.855);
      body.orbitLine.scale.setScalar(body.orbitRadius);
      const bodyScale = body.spec.radius * compactScale;
      body.visual.group.scale.setScalar(body.spec.key === "earth" ? bodyScale / 0.52 : bodyScale);
      body.label.position.set(0, bodyScale + 6.5, 0);
      body.label.scale.set(Math.max(18, body.spec.name.length * 3.1), 6.2, 1);
    });
    const marsRadius = bodies.find((body) => body.spec.key === "mars").orbitRadius;
    const jupiterRadius = bodies.find((body) => body.spec.key === "jupiter").orbitRadius;
    asteroidBelt.scale.setScalar((marsRadius + jupiterRadius) * 0.5);
    depthStars.scale.set(width * 0.66, height * 0.62, 240);
  }

  function update(elapsed, delta, activeProject, motionEnabled) {
    bodies.forEach((body) => {
      const angularSpeed = 0.34 / Math.pow(body.spec.period, 0.28);
      const angle = body.spec.phase + elapsed * angularSpeed;
      body.carrier.position.set(Math.cos(angle) * body.orbitRadius, Math.sin(angle) * body.orbitRadius, 0);
      if (motionEnabled && body.spec.key !== "earth") {
        body.visual.mesh.rotation.y += delta * (0.16 + 0.18 / Math.sqrt(body.spec.period));
      }
      const targetOpacity = body.spec.key === "earth" ? 0.32 : 0.09;
      body.orbitLine.material.opacity += (targetOpacity - body.orbitLine.material.opacity) * 0.06;
    });
    products.forEach((product, index) => {
      const angle = product.missionPhase + elapsed * (0.46 + index * 0.055);
      product.group.position.set(
        Math.cos(angle) * product.missionRadius,
        Math.sin(angle) * product.missionRadius * 0.55,
        Math.sin(angle) * product.missionRadius * 0.28,
      );
      const selected = product.key === activeProject;
      product.missionOrbit.material.opacity += ((selected ? 0.46 : 0.14) - product.missionOrbit.material.opacity) * 0.08;
    });
    sun.mesh.rotation.y += motionEnabled ? delta * 0.035 : 0;
    sun.glow.material.opacity = 0.54 + Math.sin(elapsed * 0.7) * 0.04;
    if (motionEnabled) {
      asteroidBelt.rotation.z += delta * 0.004;
      depthStars.rotation.z -= delta * 0.0008;
    }
  }

  return { group, earth, products, occluders, resize, update };
}

function createOrbitLine(color, opacity) {
  const points = [];
  for (let index = 0; index < 320; index += 1) {
    const angle = index / 320 * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0));
  }
  return new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  );
}

function createSun() {
  const group = new THREE.Group();
  const texture = createSunTexture();
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 48),
    new THREE.MeshBasicMaterial({ map: texture, color: 0xffb85a, toneMapped: false }),
  );
  group.add(mesh);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createGlowTexture(0xffb53f),
    color: 0xffb53f,
    transparent: true,
    opacity: 0.56,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  glow.scale.setScalar(4.6);
  group.add(glow);
  const light = new THREE.PointLight(0xffd29a, 2600, 900, 1.55);
  group.add(light);
  return { group, mesh, glow };
}

function createSolarPlanet(spec) {
  const group = new THREE.Group();
  group.rotation.z = THREE.MathUtils.degToRad(spec.axialTilt || (spec.key === "saturn" ? 26.7 : 8));
  const texture = createSolarPlanetTexture(spec);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 72, 36),
    new THREE.MeshPhysicalMaterial({
      map: texture,
      color: 0xffffff,
      emissive: spec.deep,
      emissiveIntensity: 0.045,
      roughness: spec.style === "ice" ? 0.54 : 0.78,
      metalness: 0,
      clearcoat: spec.style === "ice" ? 0.16 : 0.04,
      clearcoatRoughness: 0.72,
    }),
  );
  group.add(mesh);
  if (spec.rings || spec.faintRings) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(spec.rings ? 1.35 : 1.2, spec.rings ? 2.25 : 1.62, 160),
      new THREE.MeshBasicMaterial({
        color: spec.rings ? 0xd7c79b : 0x7fc9d0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: spec.rings ? 0.64 : 0.2,
        depthWrite: false,
      }),
    );
    ring.rotation.x = Math.PI / 2.25;
    group.add(ring);
  }
  return { group, mesh };
}

function createPlanetLabel(name, highlighted = false) {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 384;
  labelCanvas.height = 96;
  const context = labelCanvas.getContext("2d");
  context.font = "600 34px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = highlighted ? "rgba(153,190,255,.96)" : "rgba(203,214,238,.68)";
  context.fillText(name.toUpperCase(), 192, 48);
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  }));
  sprite.renderOrder = 7;
  return sprite;
}

function createSunTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 768;
  textureCanvas.height = 384;
  const context = textureCanvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, textureCanvas.width, textureCanvas.height);
  gradient.addColorStop(0, "#fff3b0");
  gradient.addColorStop(0.36, "#ffc14f");
  gradient.addColorStop(0.75, "#f47d24");
  gradient.addColorStop(1, "#a82f11");
  context.fillStyle = gradient;
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
  const random = seededRandom(57721);
  context.globalCompositeOperation = "soft-light";
  for (let index = 0; index < 420; index += 1) {
    const radius = 2 + random() * 18;
    context.fillStyle = random() > 0.38 ? "rgba(255,255,210,.24)" : "rgba(112,24,4,.2)";
    context.beginPath();
    context.arc(random() * textureCanvas.width, random() * textureCanvas.height, radius, 0, Math.PI * 2);
    context.fill();
  }
  return new THREE.CanvasTexture(textureCanvas);
}

function createSolarPlanetTexture(spec) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 768;
  textureCanvas.height = 384;
  const context = textureCanvas.getContext("2d");
  const color = new THREE.Color(spec.color);
  const deep = new THREE.Color(spec.deep);
  const gradient = context.createLinearGradient(0, 0, textureCanvas.width, textureCanvas.height);
  gradient.addColorStop(0, `#${color.clone().lerp(new THREE.Color(0xffffff), 0.22).getHexString()}`);
  gradient.addColorStop(0.48, `#${color.getHexString()}`);
  gradient.addColorStop(1, `#${deep.getHexString()}`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
  const random = seededRandom(hashString(spec.key));
  if (["gas-bands", "cloud-bands", "ice"].includes(spec.style)) {
    for (let y = 4; y < textureCanvas.height; y += spec.style === "ice" ? 28 : 15) {
      const light = random() > 0.42;
      context.fillStyle = light ? `rgba(255,245,220,${0.04 + random() * 0.16})` : `rgba(25,15,28,${0.035 + random() * 0.11})`;
      context.fillRect(0, y, textureCanvas.width, 3 + random() * (spec.style === "ice" ? 7 : 12));
    }
    if (spec.key === "jupiter") {
      context.fillStyle = "rgba(133,47,35,.58)";
      context.beginPath();
      context.ellipse(560, 245, 58, 22, -0.08, 0, Math.PI * 2);
      context.fill();
    }
  } else {
    context.globalCompositeOperation = "soft-light";
    for (let index = 0; index < 180; index += 1) {
      const radius = 3 + random() * (spec.key === "mars" ? 24 : 16);
      context.fillStyle = random() > 0.5 ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.22)";
      context.beginPath();
      context.arc(random() * textureCanvas.width, random() * textureCanvas.height, radius, 0, Math.PI * 2);
      context.fill();
    }
  }
  return new THREE.CanvasTexture(textureCanvas);
}

function createEarth(textureLoader, maxAnisotropy) {
  const group = new THREE.Group();
  group.rotation.x = THREE.MathUtils.degToRad(20.6);
  group.rotation.z = THREE.MathUtils.degToRad(-4.2);

  const geometry = new THREE.SphereGeometry(0.52, 128, 64);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: 0x07101d,
    emissiveIntensity: 0.12,
    roughness: 0.76,
    metalness: 0,
    clearcoat: 0.08,
    clearcoatRoughness: 0.78,
  });
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  // NASA Blue Marble Next Generation, cloud-free December 2004 surface.
  textureLoader.load("assets/earth-cloudless-surface.jpg", (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;
    texture.wrapS = THREE.RepeatWrapping;
    texture.offset.x = 0.469;
    material.map = texture;
    material.needsUpdate = true;
  });

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.546, 96, 48),
    new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x4f8cff) },
        viewVector: { value: new THREE.Vector3() },
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
          vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vec3 viewDirection = normalize(viewVector - worldPosition);
          intensity = pow(0.72 - dot(worldNormal, viewDirection), 2.45);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          gl_FragColor = vec4(glowColor, intensity * 0.4);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  );
  group.add(atmosphere);

  return { group, mesh, atmosphere };
}

function createProductWorld(definition, maxAnisotropy) {
  const group = new THREE.Group();
  const texture = createProceduralPlanetTexture(definition);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  const material = new THREE.MeshPhysicalMaterial({
    map: texture,
    color: 0xffffff,
    emissive: definition.color,
    emissiveIntensity: 0.11,
    roughness: definition.key === "atlas" ? 0.5 : 0.72,
    metalness: definition.key === "atlas" ? 0.16 : 0.02,
    clearcoat: 0.14,
    clearcoatRoughness: 0.55,
  });
  const surface = new THREE.Mesh(new THREE.SphereGeometry(definition.size, 64, 32), material);
  group.add(surface);

  const hitTarget = new THREE.Mesh(
    new THREE.SphereGeometry(definition.size * 1.7, 20, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  hitTarget.userData.project = definition.key;
  group.add(hitTarget);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(definition.size * 1.18, definition.size * 1.24, 128),
    new THREE.MeshBasicMaterial({
      color: definition.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  halo.rotation.x = 0.12;
  group.add(halo);

  const satellitePivot = new THREE.Group();
  const satellite = new THREE.Mesh(
    new THREE.SphereGeometry(definition.size * 0.075, 20, 12),
    new THREE.MeshBasicMaterial({ color: definition.color }),
  );
  satellite.position.set(definition.size * 1.62, definition.size * 0.32, definition.size * 0.28);
  satellitePivot.add(satellite);
  group.add(satellitePivot);

  if (definition.ringed) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(definition.size * 1.24, definition.size * 1.74, 128),
      new THREE.MeshBasicMaterial({
        color: definition.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      }),
    );
    ring.rotation.x = Math.PI / 2.45;
    ring.rotation.z = -0.24;
    group.add(ring);
  }

  const glowTexture = createGlowTexture(definition.color);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture,
    color: definition.color,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  glow.scale.setScalar(definition.size * 4.1);
  glow.renderOrder = -1;
  group.add(glow);

  return { group, surface, glow, hitTarget, satellitePivot };
}

function createProceduralPlanetTexture(definition) {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 768;
  canvasTexture.height = 384;
  const context = canvasTexture.getContext("2d");
  const color = new THREE.Color(definition.color);
  const deep = new THREE.Color(definition.deep);
  const gradient = context.createLinearGradient(0, 0, canvasTexture.width, canvasTexture.height);
  gradient.addColorStop(0, `#${color.clone().lerp(new THREE.Color(0xffffff), 0.24).getHexString()}`);
  gradient.addColorStop(0.46, `#${color.getHexString()}`);
  gradient.addColorStop(1, `#${deep.getHexString()}`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvasTexture.width, canvasTexture.height);

  const random = seededRandom(hashString(definition.key));
  context.globalCompositeOperation = "soft-light";
  for (let index = 0; index < 190; index += 1) {
    const x = random() * canvasTexture.width;
    const y = random() * canvasTexture.height;
    const radius = 4 + random() * (definition.textureStyle === "craters" ? 35 : 58);
    const alpha = 0.035 + random() * 0.13;
    context.fillStyle = random() > 0.48 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 1.35})`;
    context.beginPath();
    context.ellipse(x, y, radius * (0.7 + random()), radius * (0.24 + random() * 0.65), random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }

  if (definition.textureStyle === "bands") {
    context.globalCompositeOperation = "screen";
    for (let y = 12; y < canvasTexture.height; y += 22) {
      context.fillStyle = `rgba(224,226,255,${0.025 + random() * 0.08})`;
      context.fillRect(0, y, canvasTexture.width, 4 + random() * 9);
    }
  }

  if (definition.textureStyle === "grid") {
    context.globalCompositeOperation = "screen";
    context.strokeStyle = "rgba(194,255,248,0.12)";
    context.lineWidth = 1;
    for (let x = 0; x < canvasTexture.width; x += 48) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, canvasTexture.height); context.stroke();
    }
    for (let y = 0; y < canvasTexture.height; y += 48) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(canvasTexture.width, y); context.stroke();
    }
  }

  context.globalCompositeOperation = "source-over";
  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function createGlowTexture(colorValue) {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 256;
  canvasTexture.height = 256;
  const context = canvasTexture.getContext("2d");
  const color = new THREE.Color(colorValue);
  const rgb = `${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)}`;
  const gradient = context.createRadialGradient(128, 128, 12, 128, 128, 126);
  gradient.addColorStop(0, `rgba(${rgb},0.82)`);
  gradient.addColorStop(0.28, `rgba(${rgb},0.26)`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvasTexture);
}

function hashString(value) {
  return [...value].reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
