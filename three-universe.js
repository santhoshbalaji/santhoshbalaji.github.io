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

  scene.add(new THREE.AmbientLight(0xaec3eb, 0.82));
  scene.add(new THREE.HemisphereLight(0xe4edff, 0x030812, 0.9));
  const keyLight = new THREE.DirectionalLight(0xfff1d0, 4.2);
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
      logoScale: [0.92, 0.92],
      textureStyle: "terrain",
    },
    {
      key: "atlas",
      color: 0x6257ff,
      deep: 0x11104a,
      radius: 1.8,
      size: 0.25,
      logo: "assets/logos/atlas.svg",
      logoScale: [1.32, 1],
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
      logoScale: [0.96, 0.96],
      textureStyle: "craters",
    },
    {
      key: "mapsmith",
      color: 0x34bbb4,
      deep: 0x073338,
      radius: 2.62,
      size: 0.19,
      logo: "assets/logos/mapsmith.svg",
      logoScale: [0.9, 0.9],
      textureStyle: "grid",
    },
  ];

  const productUniverse = createProductUniverse(textureLoader, maxAnisotropy, productDefinitions);
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
  const activePointers = new Map();

  stage.dataset.threeState = "ready";
  stage.dataset.threeVersion = THREE.REVISION;
  universe.rotation.set(defaultRotationX, defaultRotationY, 0);
  stage.dataset.threeDepth = "product-orbits";
  stage.dataset.threeOcclusion = "depth-buffered-logos";
  stage.dataset.threeOrbitBounds = "planet-safe";
  stage.dataset.threeInteraction = "360-product-orbits";
  stage.dataset.portfolioBodies = "earth-jurisfield-atlas-nammatn-mapsmith";
  stage.classList.add("has-three-universe", "has-product-orrery");

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

    earth.mesh.rotation.y = THREE.MathUtils.degToRad(0.8) * Math.sin(elapsed * 0.16);
    earth.atmosphere.material.uniforms.viewVector.value.copy(camera.position);
    const stageBounds = stage.getBoundingClientRect();
    productUniverse.update(elapsed, delta, hoveredProject || activeProject, motionEnabled);

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
      logoFacingPoint.copy(camera.position);
      product.group.worldToLocal(logoFacingPoint);
      logoFacingPoint.normalize();
      product.logoBackdrop.position.copy(logoFacingPoint).multiplyScalar(product.size * 1.025);
      product.logoSprite.position.copy(logoFacingPoint).multiplyScalar(product.size * 1.045);
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

function createProductUniverse(textureLoader, maxAnisotropy, productDefinitions) {
  const group = new THREE.Group();
  const earth = createEarth(textureLoader, maxAnisotropy);
  group.add(earth.group);

  const earthGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createGlowTexture(0x4f8cff),
    color: 0x4f8cff,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  earthGlow.position.z = -8;
  group.add(earthGlow);

  const orbitSpecs = [
    { radius: 0.25, ellipse: 0.54, tiltX: 58, tiltY: -7, tiltZ: -8, phase: 0.2, speed: 0.49 },
    { radius: 0.34, ellipse: 0.58, tiltX: 66, tiltY: 5, tiltZ: 4, phase: 1.82, speed: 0.39 },
    { radius: 0.43, ellipse: 0.61, tiltX: 52, tiltY: -5, tiltZ: 11, phase: 3.58, speed: 0.31 },
    { radius: 0.52, ellipse: 0.64, tiltX: 70, tiltY: 8, tiltZ: -3, phase: 5.08, speed: 0.245 },
  ];

  const products = productDefinitions.map((definition, index) => {
    const spec = orbitSpecs[index];
    const orbitPlane = new THREE.Group();
    orbitPlane.rotation.set(
      THREE.MathUtils.degToRad(spec.tiltX),
      THREE.MathUtils.degToRad(spec.tiltY),
      THREE.MathUtils.degToRad(spec.tiltZ),
    );
    const orbitLine = createOrbitLine(definition.color, 0.13);
    orbitLine.renderOrder = 1;
    orbitPlane.add(orbitLine);
    const product = createProductWorld(definition, textureLoader, maxAnisotropy);
    orbitPlane.add(product.group);
    group.add(orbitPlane);
    return { ...definition, ...product, ...spec, orbitPlane, orbitLine, orbitRadius: 1 };
  });

  const depthRandom = seededRandom(20260824);
  const starPositions = [];
  const starColors = [];
  for (let index = 0; index < 280; index += 1) {
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
    opacity: 0.3,
    sizeAttenuation: false,
    depthWrite: false,
  }));
  group.add(depthField);

  function resize(width, height) {
    const extent = Math.min(width, height);
    const compactScale = extent < 430 ? 0.9 : 1;
    const earthRadius = extent * 0.16 * compactScale;
    const maximumOrbitRatio = Math.max(...products.map((product) => product.radius));
    const edgeReserve = THREE.MathUtils.clamp(extent * 0.085, 42, 64);
    const perspectiveAllowance = 1.04;
    const horizontalExtent = (width * 0.5 - edgeReserve) / (maximumOrbitRatio * perspectiveAllowance);
    const verticalExtent = (height * 0.5 - edgeReserve) / (maximumOrbitRatio * perspectiveAllowance);
    const safeOrbitExtent = Math.max(180, Math.min(horizontalExtent, verticalExtent));
    earth.group.scale.setScalar(earthRadius / 0.52);
    earthGlow.scale.setScalar(earthRadius * 3.35);
    products.forEach((product) => {
      product.orbitRadius = safeOrbitExtent * product.radius;
      product.orbitLine.scale.set(product.orbitRadius, product.orbitRadius * product.ellipse, 1);
    });
    depthField.scale.set(width * 0.94, height * 0.88, 220);
  }

  function update(elapsed, delta, activeProject, motionEnabled) {
    products.forEach((product, index) => {
      const angle = product.phase + elapsed * product.speed;
      product.group.position.set(
        Math.cos(angle) * product.orbitRadius,
        Math.sin(angle) * product.orbitRadius * product.ellipse,
        0,
      );
      const selected = product.key === activeProject;
      product.orbitLine.material.opacity += ((selected ? 0.52 : 0.11) - product.orbitLine.material.opacity) * 0.08;
      product.orbitPlane.rotation.z += motionEnabled ? delta * (index % 2 ? -0.006 : 0.004) : 0;
    });
    earthGlow.material.opacity = 0.2 + Math.sin(elapsed * 0.62) * 0.025;
    if (motionEnabled) depthField.rotation.z -= delta * 0.0012;
  }

  return { group, earth, products, occluders: [earth.mesh], resize, update };
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

function createProductWorld(definition, textureLoader, maxAnisotropy) {
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

  const logoTexture = definition.key === "atlas"
    ? createAtlasLogoTexture()
    : textureLoader.load(definition.logo);
  logoTexture.colorSpace = THREE.SRGBColorSpace;
  logoTexture.anisotropy = maxAnisotropy;
  const logoSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: logoTexture,
    color: 0xffffff,
    transparent: true,
    opacity: 1,
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
    map: createLogoBackdropTexture(),
    color: 0xffffff,
    transparent: true,
    opacity: 0.88,
    alphaTest: 0.012,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  }));
  logoBackdrop.scale.setScalar(definition.size * 1.54);
  logoBackdrop.renderOrder = 7;
  group.add(logoBackdrop);

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

  return { group, surface, glow, hitTarget, satellitePivot, logoBackdrop, logoSprite };
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

function createLogoBackdropTexture() {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 256;
  canvasTexture.height = 256;
  const context = canvasTexture.getContext("2d");
  const gradient = context.createRadialGradient(128, 128, 18, 128, 128, 126);
  gradient.addColorStop(0, "rgba(0,4,12,0.82)");
  gradient.addColorStop(0.52, "rgba(0,4,12,0.68)");
  gradient.addColorStop(0.78, "rgba(0,4,12,0.26)");
  gradient.addColorStop(1, "rgba(0,4,12,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvasTexture);
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
