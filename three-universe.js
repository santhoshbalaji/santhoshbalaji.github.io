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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 10, 4000);
  camera.position.set(0, 0, 1200);
  camera.lookAt(0, 0, 0);

  const universe = new THREE.Group();
  scene.add(universe);

  scene.add(new THREE.AmbientLight(0xaec3eb, 0.88));
  scene.add(new THREE.HemisphereLight(0xe4edff, 0x030812, 0.96));
  const keyLight = new THREE.DirectionalLight(0xfff1d0, 4.8);
  keyLight.position.set(-600, 620, 1000);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x4c6dff, 2.15);
  rimLight.position.set(620, -180, 760);
  scene.add(rimLight);

  const textureLoader = new THREE.TextureLoader();
  const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  const earth = createEarth(textureLoader, maxAnisotropy);
  universe.add(earth.group);

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

  const environment = createOrbitalEnvironment(productDefinitions);
  universe.add(environment.group);

  const products = productDefinitions.map((definition) => {
    const product = createProductWorld(definition, maxAnisotropy);
    universe.add(product.group);
    return { ...definition, ...product };
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(4, 4);
  const projected = new THREE.Vector3();
  const worldPosition = new THREE.Vector3();
  const anchors = new Map(
    [...stage.querySelectorAll("[data-orbit-planet]")].map((anchor) => [anchor.dataset.orbitPlanet, anchor]),
  );
  const gravityCore = stage.querySelector(".gravity-core");
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
  let targetRotationX = 0;
  let targetRotationY = 0;

  stage.dataset.threeState = "ready";
  stage.dataset.threeVersion = THREE.REVISION;
  stage.dataset.threeDepth = "complete";
  stage.dataset.threeInteraction = "orbit-zoom-select";
  stage.classList.add("has-three-universe");

  function resize() {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    baseCameraDistance = (height / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.z = baseCameraDistance * currentZoom;
    camera.far = Math.max(4000, baseCameraDistance * 3);
    camera.updateProjectionMatrix();
    environment.resize(width, height);
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
    const intersections = raycaster.intersectObjects(products.map((product) => product.hitTarget), false);
    return intersections[0]?.object.userData.project || null;
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

    universe.rotation.x += (targetRotationX - universe.rotation.x) * 0.075;
    universe.rotation.y += (targetRotationY - universe.rotation.y) * 0.075;
    currentZoom += (targetZoom - currentZoom) * 0.09;
    camera.position.z = baseCameraDistance * currentZoom;

    earth.mesh.rotation.y = THREE.MathUtils.degToRad(0.6) * Math.sin(elapsed * 0.18);
    earth.atmosphere.material.uniforms.viewVector.value.copy(camera.position);
    const stageBounds = stage.getBoundingClientRect();
    if (gravityCore) {
      earth.group.position.set(0, 0, 0);
      earth.group.scale.setScalar((gravityCore.offsetWidth / 2) / 0.52);
    }
    environment.update(elapsed, hoveredProject || activeProject, motionEnabled);

    products.forEach((product) => {
      const anchor = anchors.get(product.key);
      if (!anchor) return;
      const anchorStyle = getComputedStyle(anchor);
      const orbitX = Number.parseFloat(anchorStyle.getPropertyValue("--orbit-x")) || 0;
      const orbitY = Number.parseFloat(anchorStyle.getPropertyValue("--orbit-y")) || 0;
      const orbitScale = Number.parseFloat(anchorStyle.getPropertyValue("--orbit-scale")) || 1;
      product.group.position.set(
        orbitX,
        -orbitY,
        environment.depthFor(product.key, Number.parseInt(anchor.style.zIndex || "8", 10)) + 2,
      );
      product.group.scale.setScalar((anchor.offsetWidth / 2) / product.size * orbitScale);
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
      const orbitScale = Number.parseFloat(getComputedStyle(anchor).getPropertyValue("--orbit-scale")) || 1;
      product.group.getWorldPosition(worldPosition);
      projected.copy(worldPosition).project(camera);
      const perspectiveScale = baseCameraDistance / Math.max(80, camera.position.z - worldPosition.z);
      anchor.style.setProperty("--scene-x", `${(projected.x * stageBounds.width * 0.5).toFixed(2)}px`);
      anchor.style.setProperty("--scene-y", `${(-projected.y * stageBounds.height * 0.5).toFixed(2)}px`);
      anchor.style.setProperty("--scene-scale", (orbitScale * perspectiveScale).toFixed(3));
    });

    renderer.render(scene, camera);
    const unsettled = Math.abs(targetRotationX - universe.rotation.x) > 0.0005
      || Math.abs(targetRotationY - universe.rotation.y) > 0.0005
      || Math.abs(targetZoom - currentZoom) > 0.0005;
    if (motionEnabled || dragging || force || unsettled) animationFrame = window.requestAnimationFrame(render);
  }

  canvas.addEventListener("pointermove", (event) => {
    if (dragging && pointerDown) {
      const dx = event.clientX - pointerDown.x;
      const dy = event.clientY - pointerDown.y;
      dragDistance = Math.max(dragDistance, Math.hypot(dx, dy));
      targetRotationY = THREE.MathUtils.clamp(pointerDown.rotationY + dx * 0.0037, -0.82, 0.82);
      targetRotationX = THREE.MathUtils.clamp(pointerDown.rotationX + dy * 0.0029, -0.46, 0.38);
      setHovered(null);
      render(performance.now(), true);
      return;
    }
    setHovered(hitTest(event));
  }, { passive: true });

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    dragging = true;
    dragDistance = 0;
    pointerDown = { x: event.clientX, y: event.clientY, rotationX: targetRotationX, rotationY: targetRotationY };
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic and assistive pointer sources may not expose a capturable pointer.
    }
    canvas.classList.add("is-dragging");
  });

  canvas.addEventListener("pointerup", (event) => {
    const selected = dragDistance < 7 ? hitTest(event) : null;
    dragging = false;
    pointerDown = null;
    canvas.classList.remove("is-dragging");
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (selected) anchors.get(selected)?.click();
  });

  canvas.addEventListener("pointercancel", () => {
    dragging = false;
    pointerDown = null;
    canvas.classList.remove("is-dragging");
  });

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    targetZoom = THREE.MathUtils.clamp(targetZoom + Math.sign(event.deltaY) * 0.085, 0.78, 1.34);
    render(performance.now(), true);
  }, { passive: false });

  canvas.addEventListener("dblclick", () => {
    targetRotationX = 0;
    targetRotationY = 0;
    targetZoom = 1;
    render(performance.now(), true);
  });

  canvas.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const handled = ["arrowleft", "arrowright", "arrowup", "arrowdown", "+", "=", "-", "_", "r", "0"].includes(key);
    if (!handled) return;
    event.preventDefault();
    if (key === "arrowleft") targetRotationY = THREE.MathUtils.clamp(targetRotationY - 0.12, -0.82, 0.82);
    if (key === "arrowright") targetRotationY = THREE.MathUtils.clamp(targetRotationY + 0.12, -0.82, 0.82);
    if (key === "arrowup") targetRotationX = THREE.MathUtils.clamp(targetRotationX - 0.1, -0.46, 0.38);
    if (key === "arrowdown") targetRotationX = THREE.MathUtils.clamp(targetRotationX + 0.1, -0.46, 0.38);
    if (["+", "="].includes(key)) targetZoom = THREE.MathUtils.clamp(targetZoom - 0.085, 0.78, 1.34);
    if (["-", "_"].includes(key)) targetZoom = THREE.MathUtils.clamp(targetZoom + 0.085, 0.78, 1.34);
    if (["r", "0"].includes(key)) {
      targetRotationX = 0;
      targetRotationY = 0;
      targetZoom = 1;
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
    if (!document.hidden) {
      lastFrame = performance.now();
      render(lastFrame, true);
    }
  });

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  resize();
  render(performance.now(), true);
}

function createOrbitalEnvironment(definitions) {
  const group = new THREE.Group();
  const orbitSpecs = new Map([
    ["jurisfield", { radiusX: 0.24, radiusY: 0.11, rotation: -4, depth: 18 }],
    ["atlas", { radiusX: 0.32, radiusY: 0.15, rotation: 2, depth: 24 }],
    ["nammatn", { radiusX: 0.4, radiusY: 0.19, rotation: -1, depth: 31 }],
    ["mapsmith", { radiusX: 0.47, radiusY: 0.235, rotation: 4, depth: 39 }],
  ]);
  const orbitLines = new Map();

  definitions.forEach((definition) => {
    const points = [];
    for (let index = 0; index < 320; index += 1) {
      const angle = index / 320 * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle), Math.sin(angle), Math.sin(angle)));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: definition.color,
      transparent: true,
      opacity: 0.075,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const line = new THREE.LineLoop(geometry, material);
    line.rotation.z = THREE.MathUtils.degToRad(orbitSpecs.get(definition.key).rotation);
    line.renderOrder = 2;
    group.add(line);
    orbitLines.set(definition.key, line);
  });

  const eclipticMaterial = new THREE.MeshBasicMaterial({
    color: 0x5545be,
    transparent: true,
    opacity: 0.035,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ecliptic = new THREE.Mesh(new THREE.RingGeometry(0.22, 1, 192), eclipticMaterial);
  ecliptic.position.z = -10;
  group.add(ecliptic);

  const earthOrbitPoints = [];
  for (let index = 0; index < 192; index += 1) {
    const angle = index / 192 * Math.PI * 2;
    earthOrbitPoints.push(new THREE.Vector3(Math.cos(angle), Math.sin(angle), Math.sin(angle)));
  }
  const earthOrbit = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(earthOrbitPoints),
    new THREE.LineDashedMaterial({
      color: 0xffca62,
      transparent: true,
      opacity: 0.42,
      dashSize: 4,
      gapSize: 4,
      depthWrite: false,
    }),
  );
  earthOrbit.computeLineDistances();
  group.add(earthOrbit);

  const asteroidRandom = seededRandom(481516);
  const asteroidPositions = [];
  const asteroidColors = [];
  for (let index = 0; index < 640; index += 1) {
    const angle = asteroidRandom() * Math.PI * 2;
    const spread = 0.88 + asteroidRandom() * 0.24;
    asteroidPositions.push(
      Math.cos(angle) * spread,
      Math.sin(angle) * spread,
      Math.sin(angle) * 0.72 + (asteroidRandom() - 0.5) * 0.28,
    );
    const bright = 0.46 + asteroidRandom() * 0.38;
    asteroidColors.push(bright * 0.77, bright * 0.81, bright);
  }
  const asteroidGeometry = new THREE.BufferGeometry();
  asteroidGeometry.setAttribute("position", new THREE.Float32BufferAttribute(asteroidPositions, 3));
  asteroidGeometry.setAttribute("color", new THREE.Float32BufferAttribute(asteroidColors, 3));
  const asteroidBelt = new THREE.Points(
    asteroidGeometry,
    new THREE.PointsMaterial({
      size: 1.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.42,
      sizeAttenuation: false,
      depthWrite: false,
    }),
  );
  asteroidBelt.rotation.z = THREE.MathUtils.degToRad(-2);
  group.add(asteroidBelt);

  const depthRandom = seededRandom(20260824);
  const starPositions = [];
  const starColors = [];
  for (let index = 0; index < 260; index += 1) {
    starPositions.push(depthRandom() - 0.5, depthRandom() - 0.5, -0.35 - depthRandom() * 0.65);
    const warmth = depthRandom();
    starColors.push(warmth > 0.92 ? 1 : 0.68, warmth > 0.92 ? 0.8 : 0.78, warmth > 0.92 ? 0.5 : 1);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
  starGeometry.setAttribute("color", new THREE.Float32BufferAttribute(starColors, 3));
  const depthStars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      size: 1.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.34,
      sizeAttenuation: false,
      depthWrite: false,
    }),
  );
  group.add(depthStars);

  function resize(width, height) {
    orbitLines.forEach((line, key) => {
      const spec = orbitSpecs.get(key);
      line.scale.set(width * spec.radiusX, height * spec.radiusY, spec.depth);
    });
    ecliptic.scale.set(width * 0.43, height * 0.22, 1);
    earthOrbit.scale.set(width * 0.145, height * 0.078, 16);
    asteroidBelt.scale.set(width * 0.395, height * 0.205, 30);
    depthStars.scale.set(width * 1.04, height * 0.96, 180);
  }

  function update(elapsed, activeProject, motionEnabled) {
    orbitLines.forEach((line, key) => {
      const targetOpacity = key === activeProject ? 0.34 : 0.075;
      line.material.opacity += (targetOpacity - line.material.opacity) * 0.075;
    });
    ecliptic.material.opacity = 0.03 + Math.sin(elapsed * 0.34) * 0.006;
    if (motionEnabled) {
      asteroidBelt.rotation.z += 0.000035;
      depthStars.rotation.z -= 0.000006;
    }
  }

  function depthFor(key, zIndex) {
    const spec = orbitSpecs.get(key);
    const normalizedDepth = THREE.MathUtils.clamp((zIndex - 6) / 8, 0, 1);
    return (normalizedDepth * 2 - 1) * spec.depth;
  }

  return { group, resize, update, depthFor };
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
