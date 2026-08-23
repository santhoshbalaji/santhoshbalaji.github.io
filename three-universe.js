import * as THREE from "./vendor/three.module.min.js";

const stage = document.querySelector("#gravity-stage");
const canvas = document.querySelector("#universe-render");

if (stage && canvas) {
  stage.dataset.threeState = "booting";
  initialiseUniverse().catch((error) => {
    window.clearTimeout(window.__portfolioUniverseBootTimer);
    stage.classList.remove("has-three-universe", "has-product-orrery");
    stage.dataset.threeState = "fallback";
    canvas.hidden = true;
    console.warn("3D universe unavailable; using the accessible CSS fallback.", error);
  });
}

async function initialiseUniverse() {
  const initialisationStarted = performance.now();
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
  renderer.toneMappingExposure = 0.98;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 10, 4000);
  camera.position.set(0, 0, 1200);
  camera.lookAt(0, 0, 0);

  const universe = new THREE.Group();
  scene.add(universe);

  scene.add(new THREE.AmbientLight(0x52647b, 0.16));
  scene.add(new THREE.HemisphereLight(0x8fa9c8, 0x01030a, 0.22));
  const keyLight = new THREE.DirectionalLight(0xffedcf, 4.65);
  keyLight.position.set(-760, 420, 980);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x5172a8, 0.34);
  rimLight.position.set(640, -260, 520);
  scene.add(rimLight);
  const sunDirection = keyLight.position.clone().normalize();

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
      logoScale: [0.92, 0.92],
      logoPlateScale: 1.52,
      textureStyle: "terrain",
    },
    {
      key: "atlas",
      color: 0x6257ff,
      deep: 0x11104a,
      radius: 1.8,
      size: 0.25,
      logo: "assets/logos/atlas.svg",
      logoScale: [1.08, 0.82],
      logoPlateScale: 1.54,
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
      logoScale: [0.9, 0.9],
      logoPlateScale: 1.52,
      textureStyle: "craters",
    },
    {
      key: "mapsmith",
      color: 0x34bbb4,
      deep: 0x073338,
      radius: 2.62,
      size: 0.19,
      logo: "assets/logos/mapsmith.svg",
      logoScale: [0.98, 0.98],
      logoPlateScale: 1.58,
      textureStyle: "grid",
    },
  ];

  const productUniverse = createProductUniverse(textureLoader, maxAnisotropy, productDefinitions, sunDirection);
  universe.add(productUniverse.group);
  const { earth, products, occluders } = productUniverse;

  const raycaster = new THREE.Raycaster();
  const occlusionRaycaster = new THREE.Raycaster();
  const occlusionDirection = new THREE.Vector3();
  const pointer = new THREE.Vector2(4, 4);
  const projected = new THREE.Vector3();
  const worldPosition = new THREE.Vector3();
  const logoFacingPoint = new THREE.Vector3();
  const anchors = new Map(
    [...stage.querySelectorAll("[data-orbit-planet]")].map((anchor) => [anchor.dataset.orbitPlanet, anchor]),
  );
  const resetButton = stage.querySelector("#universe-reset");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeProject = stage.dataset.activeOrbit || "jurisfield";
  let hoveredProject = null;
  let motionEnabled = document.documentElement.dataset.motion !== "paused"
    && !reducedMotion.matches;
  let elapsed = 0;
  let lastFrame = performance.now();
  let animationFrame = 0;
  let baseCameraDistance = 1200;
  let currentZoom = 1;
  let targetZoom = 1;
  let currentFieldScale = 1;
  let dragging = false;
  let pointerDown = null;
  let dragDistance = 0;
  const defaultRotationX = -0.26;
  const defaultRotationY = -0.08;
  let targetRotationX = defaultRotationX;
  let targetRotationY = defaultRotationY;
  let angularVelocityX = 0;
  let angularVelocityY = 0;
  let lastPointerSample = null;
  let pinchStartDistance = 0;
  let pinchStartZoom = 1;
  let pinching = false;
  let sceneVisible = true;
  let discoveryDismissed = false;
  let discoveryRevealTimer = 0;
  let discoveryReturnTimer = 0;
  let discoveryHideTimer = 0;
  let discoveryNudgeActive = false;
  let discoveryScheduled = false;
  const activePointers = new Map();

  stage.dataset.threeVersion = THREE.REVISION;
  universe.rotation.set(defaultRotationX, defaultRotationY, 0);
  stage.dataset.threeDepth = "product-orbits";
  stage.dataset.threeOcclusion = "depth-buffered-logos";
  stage.dataset.threeOrbitBounds = "planet-safe";
  stage.dataset.threeAdaptiveFit = "rotation-safe";
  stage.dataset.threeOrbitVisibility = "persistent-traces";
  stage.dataset.threeLighting = "single-sun-physical";
  stage.dataset.threeSurfaces = "terrain-roughness-atmosphere";
  stage.dataset.threeInteraction = "360-product-orbits";
  stage.dataset.threeLogoTreatment = "camera-facing-product-plates";
  stage.dataset.threeLogoFit = "asset-specific-optical";
  stage.dataset.portfolioBodies = "earth-jurisfield-atlas-nammatn-mapsmith";
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
    productUniverse.resize(width, height);
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
    const depthToVerticalRisk = Math.abs(Math.sin(universe.rotation.x)) * Math.abs(Math.sin(universe.rotation.y));
    const targetFieldScale = stage.dataset.threeOrbitField === "full-hero"
      ? 1 - depthToVerticalRisk * 0.38
      : 1;
    currentFieldScale += (targetFieldScale - currentFieldScale) * 0.09;
    universe.scale.setScalar(currentFieldScale);

    earth.mesh.rotation.y = THREE.MathUtils.degToRad(0.8) * Math.sin(elapsed * 0.16);
    earth.atmosphere.material.uniforms.viewVector.value.copy(camera.position);
    const stageBounds = stage.getBoundingClientRect();
    productUniverse.update(elapsed, delta, hoveredProject || activeProject, motionEnabled);

    products.forEach((product) => {
      const anchor = anchors.get(product.key);
      if (!anchor) return;
      product.group.scale.setScalar((anchor.offsetWidth / 2) / product.size);
      product.surface.rotation.y += motionEnabled ? delta * (0.055 + product.radius * 0.012) : 0;
      product.satellitePivot.rotation.z += motionEnabled ? delta * (0.08 + product.radius * 0.01) : 0;
      const selected = product.key === (hoveredProject || activeProject);
      product.glow.material.opacity += ((selected ? 0.095 : 0.028) - product.glow.material.opacity) * 0.08;
      product.logoSprite.material.opacity += ((selected ? 1 : 0.94) - product.logoSprite.material.opacity) * 0.08;
      product.logoBackdrop.material.opacity += ((selected ? 0.96 : 0.78) - product.logoBackdrop.material.opacity) * 0.08;
      product.atmosphere.material.uniforms.strength.value += (
        (selected ? product.atmosphereStrength * 1.18 : product.atmosphereStrength)
        - product.atmosphere.material.uniforms.strength.value
      ) * 0.08;
      product.atmosphere.material.uniforms.viewVector.value.copy(camera.position);
    });

    universe.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    products.forEach((product) => {
      const anchor = anchors.get(product.key);
      if (!anchor) return;
      logoFacingPoint.copy(camera.position);
      product.group.worldToLocal(logoFacingPoint);
      logoFacingPoint.normalize();
      product.logoBackdrop.position.copy(logoFacingPoint).multiplyScalar(product.size * 1.035);
      product.logoSprite.position.copy(logoFacingPoint).multiplyScalar(product.size * 1.065);
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
      anchor.dataset.depthState = occluded ? "behind-earth" : "visible";
      anchor.classList.toggle("is-occluded", occluded);
    });

    renderer.render(scene, camera);
    const unsettled = Math.abs(targetRotationX - universe.rotation.x) > 0.0005
      || Math.abs(targetRotationY - universe.rotation.y) > 0.0005
      || Math.abs(targetZoom - currentZoom) > 0.0005
      || Math.abs(targetFieldScale - currentFieldScale) > 0.0005
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

  function dismissDiscovery(reason = "interaction") {
    if (discoveryDismissed) return;
    discoveryDismissed = true;
    window.clearTimeout(discoveryRevealTimer);
    window.clearTimeout(discoveryReturnTimer);
    window.clearTimeout(discoveryHideTimer);
    if (discoveryNudgeActive) {
      targetRotationX = universe.rotation.x;
      targetRotationY = universe.rotation.y;
      discoveryNudgeActive = false;
    }
    stage.dataset.threeDiscovery = "dismissed";
    stage.dataset.threeDiscoveryReason = reason;
  }

  function revealDiscovery() {
    if (discoveryDismissed || stage.dataset.threeState !== "ready") return;
    stage.dataset.threeDiscovery = "visible";
    if (motionEnabled && !reducedMotion.matches) {
      discoveryNudgeActive = true;
      targetRotationY = defaultRotationY + 0.075;
      render(performance.now(), true);
      discoveryReturnTimer = window.setTimeout(() => {
        if (discoveryDismissed || dragging) return;
        targetRotationY = defaultRotationY;
        discoveryNudgeActive = false;
        render(performance.now(), true);
      }, 780);
    }
    discoveryHideTimer = window.setTimeout(() => dismissDiscovery("timeout"), 7200);
  }

  function scheduleDiscovery() {
    if (discoveryDismissed || discoveryScheduled || stage.dataset.threeState !== "ready") return;
    const bounds = stage.getBoundingClientRect();
    const visibleHeight = Math.max(0, Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0));
    if (visibleHeight < Math.min(140, bounds.height * 0.28)) return;
    discoveryScheduled = true;
    discoveryRevealTimer = window.setTimeout(revealDiscovery, 560);
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
    dismissDiscovery("pointer");
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
    dismissDiscovery("zoom");
    targetZoom = THREE.MathUtils.clamp(targetZoom + Math.sign(event.deltaY) * 0.085, 0.72, 1.48);
    render(performance.now(), true);
  }, { passive: false });

  canvas.addEventListener("dblclick", () => {
    dismissDiscovery("reset");
    resetView();
  });
  resetButton?.addEventListener("click", () => {
    dismissDiscovery("reset");
    resetView();
  });
  anchors.forEach((anchor) => anchor.addEventListener("pointerdown", () => dismissDiscovery("planet")));

  canvas.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const handled = ["arrowleft", "arrowright", "arrowup", "arrowdown", "+", "=", "-", "_", "r", "0"].includes(key);
    if (!handled) return;
    event.preventDefault();
    dismissDiscovery("keyboard");
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
    if (!motionEnabled && discoveryNudgeActive) {
      window.clearTimeout(discoveryReturnTimer);
      targetRotationX = universe.rotation.x;
      targetRotationY = universe.rotation.y;
      discoveryNudgeActive = false;
    }
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
    scheduleDiscovery();
    lastFrame = performance.now();
    render(lastFrame, true);
  }, { threshold: 0.02 });
  visibilityObserver.observe(stage);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  resize();
  render(performance.now(), true);
  window.clearTimeout(window.__portfolioUniverseBootTimer);
  canvas.hidden = false;
  stage.classList.add("has-three-universe", "has-product-orrery");
  stage.dataset.threeInitMs = String(Math.round(performance.now() - initialisationStarted));
  stage.dataset.threeState = "ready";
  scheduleDiscovery();
}

function createProductUniverse(textureLoader, maxAnisotropy, productDefinitions, sunDirection) {
  const group = new THREE.Group();
  const earth = createEarth(textureLoader, maxAnisotropy, sunDirection);
  group.add(earth.group);

  const earthGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createGlowTexture(0x4f8cff),
    color: 0x4f8cff,
    transparent: true,
    opacity: 0.055,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  earthGlow.position.z = -8;
  group.add(earthGlow);

  const orbitSpecs = [
    { radius: 0.25, ellipse: 0.54, tiltX: 58, tiltY: -7, tiltZ: -8, phase: 0.2, speed: 0.19 },
    { radius: 0.34, ellipse: 0.58, tiltX: 66, tiltY: 5, tiltZ: 4, phase: 1.82, speed: 0.15 },
    { radius: 0.43, ellipse: 0.61, tiltX: 52, tiltY: -5, tiltZ: 11, phase: 3.58, speed: 0.118 },
    { radius: 0.52, ellipse: 0.64, tiltX: 70, tiltY: 8, tiltZ: -3, phase: 5.08, speed: 0.092 },
  ];

  const products = productDefinitions.map((definition, index) => {
    const spec = orbitSpecs[index];
    const orbitPlane = new THREE.Group();
    orbitPlane.rotation.set(
      THREE.MathUtils.degToRad(spec.tiltX),
      THREE.MathUtils.degToRad(spec.tiltY),
      THREE.MathUtils.degToRad(spec.tiltZ),
    );
    const orbitTrace = createOrbitLine(definition.color, 0.025, false);
    orbitTrace.renderOrder = 0;
    orbitPlane.add(orbitTrace);
    const orbitLine = createOrbitLine(definition.color, 0.1);
    orbitLine.renderOrder = 1;
    orbitPlane.add(orbitLine);
    const product = createProductWorld(definition, textureLoader, maxAnisotropy, sunDirection);
    orbitPlane.add(product.group);
    group.add(orbitPlane);
    return { ...definition, ...product, ...spec, orbitPlane, orbitTrace, orbitLine, orbitRadiusX: 1, orbitRadiusY: 1 };
  });

  const depthRandom = seededRandom(20260824);
  const starPositions = [];
  const starColors = [];
  for (let index = 0; index < 520; index += 1) {
    starPositions.push(depthRandom() - 0.5, depthRandom() - 0.5, -0.25 - depthRandom() * 0.75);
    const warm = depthRandom() > 0.93;
    starColors.push(warm ? 1 : 0.62, warm ? 0.78 : 0.72, warm ? 0.48 : 1);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
  starGeometry.setAttribute("color", new THREE.Float32BufferAttribute(starColors, 3));
  const depthField = new THREE.Points(starGeometry, new THREE.PointsMaterial({
    size: 1,
    vertexColors: true,
    transparent: true,
    opacity: 0.46,
    sizeAttenuation: false,
    depthWrite: false,
  }));
  group.add(depthField);

  function resize(width, height) {
    const extent = Math.min(width, height);
    const compactScale = extent < 430 ? 0.9 : 1;
    const earthRadius = extent * 0.16 * compactScale;
    const fullField = width > 820;
    const maximumHorizontalRatio = Math.max(...products.map((product) => product.radius));
    const maximumVerticalRatio = Math.max(...products.map((product) => product.radius * product.ellipse));
    const edgeReserve = THREE.MathUtils.clamp(extent * 0.085, 42, 64);
    const perspectiveAllowance = 1.06;
    const centerShiftX = fullField ? width * 0.08 : 0;
    const horizontalExtent = (width * 0.5 - edgeReserve - Math.abs(centerShiftX))
      / (maximumHorizontalRatio * perspectiveAllowance);
    const verticalExtent = (height * 0.5 - edgeReserve)
      / (maximumVerticalRatio * perspectiveAllowance);
    const compactOrbitExtent = Math.max(180, Math.min(horizontalExtent, verticalExtent));
    const orbitExtentX = fullField ? Math.max(260, horizontalExtent) : compactOrbitExtent;
    const orbitExtentY = fullField ? Math.max(210, Math.min(verticalExtent, orbitExtentX * 0.82)) : compactOrbitExtent;
    group.position.x = centerShiftX;
    earth.group.scale.setScalar(earthRadius / 0.52);
    earthGlow.scale.setScalar(earthRadius * 2.45);
    products.forEach((product) => {
      product.orbitRadiusX = orbitExtentX * product.radius;
      product.orbitRadiusY = orbitExtentY * product.radius * product.ellipse;
      product.orbitTrace.scale.set(product.orbitRadiusX, product.orbitRadiusY, 1);
      product.orbitLine.scale.set(product.orbitRadiusX, product.orbitRadiusY, 1);
    });
    depthField.scale.set(width * 0.94, height * 0.88, 220);
    stage.dataset.threeOrbitField = fullField ? "full-hero" : "contained";
    stage.dataset.threeOrbitShape = fullField ? "extended-ellipses" : "compact-ellipses";
  }

  function update(elapsed, delta, activeProject, motionEnabled) {
    products.forEach((product, index) => {
      const angle = product.phase + elapsed * product.speed;
      product.group.position.set(
        Math.cos(angle) * product.orbitRadiusX,
        Math.sin(angle) * product.orbitRadiusY,
        0,
      );
      const selected = product.key === activeProject;
      product.orbitLine.material.opacity += ((selected ? 0.15 : 0.11) - product.orbitLine.material.opacity) * 0.08;
      product.orbitTrace.material.opacity += ((selected ? 0.035 : 0.025) - product.orbitTrace.material.opacity) * 0.08;
    });
    earthGlow.material.opacity = 0.052 + Math.sin(elapsed * 0.36) * 0.008;
    if (motionEnabled) depthField.rotation.z -= delta * 0.0012;
  }

  return { group, earth, products, occluders: [earth.mesh], resize, update };
}

function createOrbitLine(color, opacity, depthTest = true) {
  const points = [];
  for (let index = 0; index < 320; index += 1) {
    const angle = index / 320 * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0));
  }
  return new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest, depthWrite: false }),
  );
}

function createEarth(textureLoader, maxAnisotropy, sunDirection) {
  const group = new THREE.Group();
  group.rotation.x = THREE.MathUtils.degToRad(20.6);
  group.rotation.z = THREE.MathUtils.degToRad(-4.2);

  const geometry = new THREE.SphereGeometry(0.52, 128, 64);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: 0x01040a,
    emissiveIntensity: 0.018,
    roughness: 1,
    metalness: 0,
    clearcoat: 0.12,
    clearcoatRoughness: 0.42,
    bumpScale: 0.0045,
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
    const surfaceMaps = createEarthSurfaceMaps(texture, maxAnisotropy);
    material.roughnessMap = surfaceMaps.roughnessMap;
    material.bumpMap = surfaceMaps.bumpMap;
    material.needsUpdate = true;
  });

  const atmosphere = createAtmosphere(0.552, 0x4f8cff, 0.34, sunDirection);
  group.add(atmosphere);

  return { group, mesh, atmosphere };
}

function createAtmosphere(radius, color, strength, sunDirection) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 96, 48),
    new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(color) },
        viewVector: { value: new THREE.Vector3() },
        sunDirection: { value: sunDirection.clone() },
        strength: { value: strength },
      },
      vertexShader: `
        uniform vec3 viewVector;
        uniform vec3 sunDirection;
        varying float atmosphereAlpha;
        void main() {
          vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
          vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vec3 viewDirection = normalize(viewVector - worldPosition);
          float fresnel = pow(1.0 - max(dot(worldNormal, viewDirection), 0.0), 2.85);
          float daylight = smoothstep(-0.24, 0.48, dot(worldNormal, normalize(sunDirection)));
          atmosphereAlpha = fresnel * (0.12 + daylight * 0.88);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float strength;
        varying float atmosphereAlpha;
        void main() {
          gl_FragColor = vec4(glowColor, atmosphereAlpha * strength);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  );
}

function createProductWorld(definition, textureLoader, maxAnisotropy, sunDirection) {
  const group = new THREE.Group();
  const maps = createProceduralPlanetMaps(definition, maxAnisotropy);
  const material = new THREE.MeshPhysicalMaterial({
    map: maps.colorMap,
    bumpMap: maps.bumpMap,
    bumpScale: definition.size * (definition.key === "atlas" ? 0.012 : 0.032),
    roughnessMap: maps.roughnessMap,
    color: 0xffffff,
    emissive: definition.deep,
    emissiveIntensity: 0.018,
    roughness: 1,
    metalness: 0,
    clearcoat: definition.key === "mapsmith" ? 0.24 : 0.04,
    clearcoatRoughness: definition.key === "mapsmith" ? 0.32 : 0.78,
  });
  const surface = new THREE.Mesh(new THREE.SphereGeometry(definition.size, 96, 64), material);
  group.add(surface);

  const logoTexture = definition.key === "atlas"
    ? createAtlasLogoTexture()
    : definition.key === "jurisfield"
      ? createJurisFieldLogoTexture()
      : definition.key === "mapsmith"
        ? createMapSmithLogoTexture()
        : textureLoader.load(definition.logo);
  logoTexture.colorSpace = THREE.SRGBColorSpace;
  logoTexture.anisotropy = maxAnisotropy;
  logoTexture.magFilter = THREE.LinearFilter;
  logoTexture.minFilter = THREE.LinearMipmapLinearFilter;
  logoTexture.generateMipmaps = true;
  const logoSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: logoTexture,
    color: 0xffffff,
    transparent: true,
    opacity: 0.94,
    alphaTest: 0.035,
    depthTest: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    toneMapped: false,
  }));
  logoSprite.scale.set(
    definition.size * definition.logoScale[0],
    definition.size * definition.logoScale[1],
    1,
  );
  logoSprite.renderOrder = 8;
  group.add(logoSprite);

  const logoBackdrop = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createLogoPlateTexture(definition.color),
    color: 0xffffff,
    transparent: true,
    opacity: 0.78,
    alphaTest: 0.012,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  }));
  logoBackdrop.scale.setScalar(definition.size * definition.logoPlateScale);
  logoBackdrop.renderOrder = 7;
  group.add(logoBackdrop);

  const hitTarget = new THREE.Mesh(
    new THREE.SphereGeometry(definition.size * 1.7, 20, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  hitTarget.userData.project = definition.key;
  group.add(hitTarget);

  const atmosphereStrength = definition.key === "mapsmith" ? 0.18 : definition.key === "atlas" ? 0.11 : 0.14;
  const atmosphere = createAtmosphere(
    definition.size * 1.045,
    definition.color,
    atmosphereStrength,
    sunDirection,
  );
  group.add(atmosphere);

  const satellitePivot = new THREE.Group();
  const satellite = new THREE.Mesh(
    new THREE.SphereGeometry(definition.size * 0.045, 20, 12),
    new THREE.MeshStandardMaterial({ color: 0x8e918c, roughness: 1, metalness: 0 }),
  );
  satellite.position.set(definition.size * 1.68, definition.size * 0.28, definition.size * 0.22);
  satellitePivot.add(satellite);
  group.add(satellitePivot);

  if (definition.ringed) {
    const ringTexture = createRingTexture(definition.color);
    ringTexture.colorSpace = THREE.SRGBColorSpace;
    ringTexture.anisotropy = maxAnisotropy;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(definition.size * 1.28, definition.size * 1.82, 192),
      new THREE.MeshStandardMaterial({
        map: ringTexture,
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.68,
        alphaTest: 0.018,
        roughness: 0.88,
        metalness: 0,
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
    opacity: 0.028,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  glow.scale.setScalar(definition.size * 2.9);
  glow.renderOrder = -1;
  group.add(glow);

  return {
    group,
    surface,
    atmosphere,
    atmosphereStrength,
    glow,
    hitTarget,
    satellitePivot,
    logoBackdrop,
    logoSprite,
  };
}

function createProceduralPlanetMaps(definition, maxAnisotropy) {
  const width = 640;
  const height = 320;
  const colorCanvas = document.createElement("canvas");
  const bumpCanvas = document.createElement("canvas");
  const roughnessCanvas = document.createElement("canvas");
  [colorCanvas, bumpCanvas, roughnessCanvas].forEach((mapCanvas) => {
    mapCanvas.width = width;
    mapCanvas.height = height;
  });
  const colorContext = colorCanvas.getContext("2d");
  const bumpContext = bumpCanvas.getContext("2d");
  const roughnessContext = roughnessCanvas.getContext("2d");
  const colorData = colorContext.createImageData(width, height);
  const bumpData = bumpContext.createImageData(width, height);
  const roughnessData = roughnessContext.createImageData(width, height);
  const phase = (hashString(definition.key) % 10000) * 0.001;
  const random = seededRandom(hashString(`${definition.key}-craters`));
  const craters = definition.textureStyle === "craters"
    ? Array.from({ length: 18 }, () => {
      const longitude = random() * Math.PI * 2;
      const latitude = Math.asin(random() * 2 - 1);
      const latitudeRadius = Math.cos(latitude);
      return {
        x: Math.cos(longitude) * latitudeRadius,
        y: Math.sin(latitude),
        z: Math.sin(longitude) * latitudeRadius,
        radius: 0.035 + random() * 0.09,
      };
    })
    : [];
  const palettes = {
    terrain: [[5, 11, 7], [19, 33, 17], [60, 70, 34], [139, 135, 91]],
    bands: [[4, 5, 18], [18, 16, 50], [51, 45, 99], [104, 91, 148]],
    craters: [[19, 5, 4], [61, 17, 13], [120, 45, 27], [178, 105, 69]],
    grid: [[2, 13, 18], [3, 35, 44], [19, 62, 54], [104, 124, 94]],
  };
  const palette = palettes[definition.textureStyle];

  for (let y = 0; y < height; y += 1) {
    const latitude = (0.5 - (y + 0.5) / height) * Math.PI;
    const latitudeRadius = Math.cos(latitude);
    const sphereY = Math.sin(latitude);
    for (let x = 0; x < width; x += 1) {
      const longitude = (x + 0.5) / width * Math.PI * 2;
      const sphereX = Math.cos(longitude) * latitudeRadius;
      const sphereZ = Math.sin(longitude) * latitudeRadius;
      const macro = sphericalFbm(sphereX, sphereY, sphereZ, phase);
      const detail = sphericalFbm(sphereX, sphereY, sphereZ, phase + 7.31);
      const ridge = 1 - Math.abs(detail * 2 - 1);
      let elevation = 0.5;
      let palettePosition = macro;
      let roughness = 0.78;

      if (definition.textureStyle === "terrain") {
        elevation = 0.16 + macro * 0.64 + ridge * 0.16;
        palettePosition = THREE.MathUtils.clamp(macro * 0.82 + ridge * 0.18, 0, 1);
        roughness = 0.72 + detail * 0.22;
      } else if (definition.textureStyle === "bands") {
        const band = 0.5 + Math.sin(latitude * 31 + macro * 4.4 + Math.sin(longitude * 2) * 0.8) * 0.27
          + Math.sin(latitude * 67 - detail * 3.1) * 0.09;
        elevation = 0.44 + band * 0.08 + detail * 0.035;
        palettePosition = THREE.MathUtils.clamp(band * 0.74 + macro * 0.2, 0, 1);
        roughness = 0.68 + detail * 0.18;
      } else if (definition.textureStyle === "craters") {
        elevation = 0.2 + macro * 0.58 + ridge * 0.12;
        palettePosition = macro * 0.78 + ridge * 0.16;
        for (const crater of craters) {
          const distance = Math.sqrt(Math.max(0, 2 - 2 * (
            sphereX * crater.x + sphereY * crater.y + sphereZ * crater.z
          )));
          if (distance >= crater.radius) continue;
          const normalized = distance / crater.radius;
          const bowl = 1 - normalized;
          const rim = Math.exp(-Math.pow((normalized - 0.78) / 0.11, 2));
          elevation += rim * 0.18 - bowl * 0.24;
          palettePosition -= bowl * 0.1;
        }
        roughness = 0.82 + detail * 0.16;
      } else {
        const land = macro > 0.53;
        elevation = land ? 0.54 + (macro - 0.53) * 0.9 + ridge * 0.08 : 0.29 + macro * 0.22;
        palettePosition = land ? 0.58 + (macro - 0.53) * 0.82 : macro * 0.7;
        roughness = land ? 0.76 + detail * 0.18 : 0.22 + detail * 0.12;
      }

      elevation = THREE.MathUtils.clamp(elevation, 0, 1);
      palettePosition = THREE.MathUtils.clamp(palettePosition, 0, 1);
      roughness = THREE.MathUtils.clamp(roughness, 0.08, 1);
      const sampledColor = samplePlanetPalette(palette, palettePosition);
      const mineralVariation = 0.82 + detail * 0.26;
      const pixelIndex = (y * width + x) * 4;
      colorData.data[pixelIndex] = Math.round(THREE.MathUtils.clamp(sampledColor[0] * mineralVariation, 0, 255));
      colorData.data[pixelIndex + 1] = Math.round(THREE.MathUtils.clamp(sampledColor[1] * mineralVariation, 0, 255));
      colorData.data[pixelIndex + 2] = Math.round(THREE.MathUtils.clamp(sampledColor[2] * mineralVariation, 0, 255));
      colorData.data[pixelIndex + 3] = 255;
      const heightValue = Math.round(elevation * 255);
      const roughnessValue = Math.round(roughness * 255);
      bumpData.data[pixelIndex] = heightValue;
      bumpData.data[pixelIndex + 1] = heightValue;
      bumpData.data[pixelIndex + 2] = heightValue;
      bumpData.data[pixelIndex + 3] = 255;
      roughnessData.data[pixelIndex] = roughnessValue;
      roughnessData.data[pixelIndex + 1] = roughnessValue;
      roughnessData.data[pixelIndex + 2] = roughnessValue;
      roughnessData.data[pixelIndex + 3] = 255;
    }
  }

  colorContext.putImageData(colorData, 0, 0);
  bumpContext.putImageData(bumpData, 0, 0);
  roughnessContext.putImageData(roughnessData, 0, 0);
  const colorMap = new THREE.CanvasTexture(colorCanvas);
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  const roughnessMap = new THREE.CanvasTexture(roughnessCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  [colorMap, bumpMap, roughnessMap].forEach((texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.anisotropy = maxAnisotropy;
  });
  return { colorMap, bumpMap, roughnessMap };
}

function sphericalFbm(x, y, z, phase) {
  let amplitude = 0.56;
  let frequency = 1.34;
  let total = 0;
  let normalization = 0;
  for (let octave = 0; octave < 5; octave += 1) {
    const waveA = Math.sin((x * 1.31 + y * 1.87 - z * 0.73) * frequency + phase
      + Math.sin((z * 1.43 + y * 0.57) * frequency));
    const waveB = Math.cos((z * 1.17 - x * 0.83 + y * 1.41) * frequency - phase * 0.71
      + Math.sin(x * frequency * 0.91));
    total += (waveA * 0.62 + waveB * 0.38) * amplitude;
    normalization += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return THREE.MathUtils.clamp(0.5 + total / normalization * 0.5, 0, 1);
}

function samplePlanetPalette(palette, position) {
  const scaled = THREE.MathUtils.clamp(position, 0, 1) * (palette.length - 1);
  const index = Math.min(palette.length - 2, Math.floor(scaled));
  const mix = scaled - index;
  return palette[index].map((channel, channelIndex) => (
    channel + (palette[index + 1][channelIndex] - channel) * mix
  ));
}

function createEarthSurfaceMaps(dayTexture, maxAnisotropy) {
  const source = dayTexture.image;
  const width = Math.min(1024, source.naturalWidth || source.width || 1024);
  const height = Math.round(width * ((source.naturalHeight || source.height || 512) / (source.naturalWidth || source.width || 1024)));
  const sourceCanvas = document.createElement("canvas");
  const bumpCanvas = document.createElement("canvas");
  const roughnessCanvas = document.createElement("canvas");
  [sourceCanvas, bumpCanvas, roughnessCanvas].forEach((mapCanvas) => {
    mapCanvas.width = width;
    mapCanvas.height = height;
  });
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  sourceContext.drawImage(source, 0, 0, width, height);
  const sourceData = sourceContext.getImageData(0, 0, width, height).data;
  const bumpContext = bumpCanvas.getContext("2d");
  const roughnessContext = roughnessCanvas.getContext("2d");
  const bumpData = bumpContext.createImageData(width, height);
  const roughnessData = roughnessContext.createImageData(width, height);
  for (let pixelIndex = 0; pixelIndex < sourceData.length; pixelIndex += 4) {
    const red = sourceData[pixelIndex];
    const green = sourceData[pixelIndex + 1];
    const blue = sourceData[pixelIndex + 2];
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const ocean = blue > red * 1.08 && blue > green * 0.82;
    const bump = ocean ? 70 : THREE.MathUtils.clamp(108 + luminance * 0.43, 105, 205);
    const roughness = ocean ? 48 : THREE.MathUtils.clamp(176 + luminance * 0.22, 176, 232);
    bumpData.data[pixelIndex] = bump;
    bumpData.data[pixelIndex + 1] = bump;
    bumpData.data[pixelIndex + 2] = bump;
    bumpData.data[pixelIndex + 3] = 255;
    roughnessData.data[pixelIndex] = roughness;
    roughnessData.data[pixelIndex + 1] = roughness;
    roughnessData.data[pixelIndex + 2] = roughness;
    roughnessData.data[pixelIndex + 3] = 255;
  }
  bumpContext.putImageData(bumpData, 0, 0);
  roughnessContext.putImageData(roughnessData, 0, 0);
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  const roughnessMap = new THREE.CanvasTexture(roughnessCanvas);
  [bumpMap, roughnessMap].forEach((texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.offset.x = 0.469;
    texture.anisotropy = maxAnisotropy;
  });
  return { bumpMap, roughnessMap };
}

function createRingTexture(colorValue) {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 512;
  canvasTexture.height = 512;
  const context = canvasTexture.getContext("2d");
  const color = new THREE.Color(colorValue);
  const pale = color.clone().lerp(new THREE.Color(0xd8d4c6), 0.56);
  const deep = color.clone().lerp(new THREE.Color(0x05060c), 0.58);
  const center = canvasTexture.width / 2;
  for (let radius = 174; radius <= 255; radius += 1) {
    const normalized = (radius - 174) / 81;
    const density = 0.18 + Math.pow(Math.sin(normalized * Math.PI * 11), 2) * 0.36
      + Math.pow(Math.sin(normalized * Math.PI * 3.2), 2) * 0.18;
    const ringColor = deep.clone().lerp(pale, 0.26 + density * 0.62);
    const edgeFade = Math.min(1, normalized * 8, (1 - normalized) * 8);
    context.strokeStyle = `rgba(${Math.round(ringColor.r * 255)},${Math.round(ringColor.g * 255)},${Math.round(ringColor.b * 255)},${density * edgeFade})`;
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.stroke();
  }
  return new THREE.CanvasTexture(canvasTexture);
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

function createLogoPlateTexture(colorValue) {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 384;
  canvasTexture.height = 384;
  const context = canvasTexture.getContext("2d");
  const accent = new THREE.Color(colorValue);
  const rgb = `${Math.round(accent.r * 255)},${Math.round(accent.g * 255)},${Math.round(accent.b * 255)}`;

  const outerGlow = context.createRadialGradient(192, 192, 112, 192, 192, 188);
  outerGlow.addColorStop(0, `rgba(${rgb},0.2)`);
  outerGlow.addColorStop(0.62, `rgba(${rgb},0.08)`);
  outerGlow.addColorStop(1, `rgba(${rgb},0)`);
  context.fillStyle = outerGlow;
  context.fillRect(0, 0, 384, 384);

  const plate = context.createRadialGradient(154, 136, 12, 192, 192, 146);
  plate.addColorStop(0, "rgba(64,78,102,0.98)");
  plate.addColorStop(0.28, "rgba(24,34,51,0.98)");
  plate.addColorStop(0.74, "rgba(5,10,19,0.99)");
  plate.addColorStop(1, "rgba(0,4,12,0.99)");
  context.beginPath();
  context.arc(192, 192, 146, 0, Math.PI * 2);
  context.fillStyle = plate;
  context.fill();

  context.beginPath();
  context.arc(192, 192, 145, 0, Math.PI * 2);
  context.strokeStyle = `rgba(${rgb},0.86)`;
  context.lineWidth = 5;
  context.stroke();

  context.beginPath();
  context.arc(192, 192, 136, 0, Math.PI * 2);
  context.strokeStyle = "rgba(225,235,255,0.16)";
  context.lineWidth = 2;
  context.stroke();

  context.beginPath();
  context.arc(192, 192, 125, Math.PI * 1.05, Math.PI * 1.58);
  context.strokeStyle = "rgba(244,248,255,0.22)";
  context.lineCap = "round";
  context.lineWidth = 3;
  context.stroke();

  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createAtlasLogoTexture() {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 360;
  canvasTexture.height = 256;
  const context = canvasTexture.getContext("2d");
  context.scale(4, 4);
  context.fillStyle = "#6257ff";
  [
    "M8 14.25c0-3.1 2.9-5.35 5.85-4.5l11.35 3.27A5.25 5.25 0 0 1 29 18.05v27.9a5.25 5.25 0 0 1-3.8 5.03l-11.35 3.27C10.9 55.1 8 52.85 8 49.75v-35.5Z",
    "M31.5 7.15c0-3.3 3.1-5.7 6.25-4.8L53.5 6.9A6.3 6.3 0 0 1 58 12.95v38.1a6.3 6.3 0 0 1-4.5 6.05l-15.75 4.55c-3.15.9-6.25-1.5-6.25-4.8V7.15Z",
    "M60.5 14.25c0-3.1 2.9-5.35 5.85-4.5l11.35 3.27a5.25 5.25 0 0 1 3.8 5.03v27.9a5.25 5.25 0 0 1-3.8 5.03l-11.35 3.27c-2.95.85-5.85-1.4-5.85-4.5v-35.5Z",
  ].forEach((path) => context.fill(new Path2D(path)));
  context.globalCompositeOperation = "destination-out";
  context.strokeStyle = "#000";
  context.lineWidth = 4.5;
  context.lineCap = "round";
  context.stroke(new Path2D("M4 37c14-11 26-12 41-6 15 6 26 10 41-3"));
  return new THREE.CanvasTexture(canvasTexture);
}

function createJurisFieldLogoTexture() {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 384;
  canvasTexture.height = 384;
  const context = canvasTexture.getContext("2d");
  context.scale(6, 6);
  context.fillStyle = "#113b2b";
  context.fill(new Path2D("M16 0h32c8.84 0 16 7.16 16 16v32c0 8.84-7.16 16-16 16H16C7.16 64 0 56.84 0 48V16C0 7.16 7.16 0 16 0Z"));
  context.strokeStyle = "#d7f24a";
  context.lineWidth = 3.5;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.stroke(new Path2D("M14 22 19 11 32 9 41 15 52 16 56 27 51 35 55 43 48 51 38 53 29 57 21 50 10 47 9 35 13 28Z"));
  context.stroke(new Path2D("M20 27v-6h6M44 37v6h-6"));
  context.beginPath();
  context.arc(32, 32, 3.25, 0, Math.PI * 2);
  context.fillStyle = "#d7f24a";
  context.fill();
  return new THREE.CanvasTexture(canvasTexture);
}

function createMapSmithLogoTexture() {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 288;
  canvasTexture.height = 288;
  const context = canvasTexture.getContext("2d");
  context.scale(12, 12);
  [
    ["M22 19.2727C22 20.779 20.779 22 19.2727 22H14.7273C13.221 22 12 20.779 12 19.2727V12H19.2727C20.779 12 22 13.221 22 14.7273V19.2727Z", "#20a39a"],
    ["M20 2C21.1046 2 22 2.89543 22 4V7C22 8.10457 21.1046 9 20 9H17C15.8954 9 15 8.10457 15 7V4C15 2.89543 15.8954 2 17 2H20Z", "#4b5fd3"],
    ["M7 15C8.10457 15 9 15.8954 9 17V20C9 21.1046 8.10457 22 7 22H4C2.89543 22 2 21.1046 2 20V17C2 15.8954 2.89543 15 4 15H7Z", "#4b5fd3"],
    ["M12 12H4.72727C3.22104 12 2 10.779 2 9.27273V4.72727C2 3.22104 3.22104 2 4.72727 2H9.27273C10.779 2 12 3.22104 12 4.72727V12Z", "#10231f"],
  ].forEach(([path, fill]) => {
    context.fillStyle = fill;
    context.fill(new Path2D(path));
  });
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
