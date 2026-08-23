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
  renderer.toneMappingExposure = 1.14;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 80);
  camera.position.set(0, 1.28, 9.4);
  camera.lookAt(0, 0.02, 0);

  const universe = new THREE.Group();
  universe.rotation.set(-0.075, -0.07, -0.018);
  scene.add(universe);

  scene.add(new THREE.AmbientLight(0x9eb7e8, 0.62));
  scene.add(new THREE.HemisphereLight(0xd9e5ff, 0x030812, 0.78));
  const keyLight = new THREE.DirectionalLight(0xfff1d0, 4.4);
  keyLight.position.set(-5.5, 5.8, 8.5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x4c6dff, 2.15);
  rimLight.position.set(5.2, -1.8, -4.5);
  scene.add(rimLight);

  const textureLoader = new THREE.TextureLoader();
  const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  const earth = createEarth(textureLoader, maxAnisotropy);
  universe.add(earth.group);

  const starField = createLocalStarField();
  universe.add(starField);

  const productDefinitions = [
    {
      key: "jurisfield",
      color: 0xb8e62e,
      deep: 0x183309,
      radius: 1.35,
      flatten: 0.39,
      inclination: -0.22,
      yaw: -0.05,
      phase: 0.38,
      period: 56,
      size: 0.21,
      logo: "assets/logos/jurisfield.svg",
      textureStyle: "terrain",
    },
    {
      key: "atlas",
      color: 0x6257ff,
      deep: 0x11104a,
      radius: 1.8,
      flatten: 0.42,
      inclination: 0.16,
      yaw: -0.16,
      phase: 2.45,
      period: 78,
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
      flatten: 0.45,
      inclination: -0.12,
      yaw: 0.13,
      phase: 4.78,
      period: 96,
      size: 0.225,
      logo: "assets/logos/nammatn.svg",
      textureStyle: "craters",
    },
    {
      key: "mapsmith",
      color: 0x34bbb4,
      deep: 0x073338,
      radius: 2.62,
      flatten: 0.48,
      inclination: 0.21,
      yaw: 0.08,
      phase: 3.65,
      period: 124,
      size: 0.19,
      logo: "assets/logos/mapsmith.svg",
      textureStyle: "grid",
    },
  ];

  const products = productDefinitions.map((definition, index) => {
    const orbit = createOrbit(definition, index === 0);
    universe.add(orbit.line);
    const product = createProductWorld(definition, maxAnisotropy);
    universe.add(product.group);
    return { ...definition, ...product, orbit };
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(4, 4);
  const projected = new THREE.Vector3();
  const anchors = new Map(
    [...stage.querySelectorAll("[data-orbit-planet]")].map((anchor) => [anchor.dataset.orbitPlanet, anchor]),
  );
  let activeProject = stage.dataset.activeOrbit || "jurisfield";
  let hoveredProject = null;
  let motionEnabled = document.documentElement.dataset.motion !== "paused"
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let elapsed = 0;
  let lastFrame = performance.now();
  let animationFrame = 0;
  let dragging = false;
  let pointerDown = null;
  let dragDistance = 0;
  let targetRotationX = universe.rotation.x;
  let targetRotationY = universe.rotation.y;

  stage.dataset.threeState = "ready";
  stage.dataset.threeVersion = THREE.REVISION;
  stage.classList.add("has-three-universe");

  function resize() {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const compact = width < 540;
    camera.fov = compact ? 39 : 31;
    camera.position.z = compact ? 10.7 : 9.4;
    camera.updateProjectionMatrix();
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

    universe.rotation.x += (targetRotationX - universe.rotation.x) * 0.055;
    universe.rotation.y += (targetRotationY - universe.rotation.y) * 0.055;
    universe.updateMatrixWorld(true);
    earth.mesh.rotation.y = THREE.MathUtils.degToRad(0.6) * Math.sin(elapsed * 0.18);
    earth.atmosphere.material.uniforms.viewVector.value.copy(camera.position);
    starField.rotation.y = elapsed * 0.008;

    products.forEach((product) => {
      const angle = product.phase + elapsed * (Math.PI * 2 / product.period);
      const orbitalPoint = new THREE.Vector3(
        Math.cos(angle) * product.radius,
        Math.sin(angle) * product.radius * product.flatten * 0.72,
        Math.sin(angle) * product.radius * 0.16,
      );
      orbitalPoint.applyEuler(product.orbit.euler);
      product.group.position.copy(orbitalPoint);
      product.surface.rotation.y += motionEnabled ? delta * (0.18 + product.radius * 0.018) : 0;
      const selected = product.key === (hoveredProject || activeProject);
      const desiredScale = selected ? 1.08 : 1;
      product.group.scale.lerp(new THREE.Vector3(desiredScale, desiredScale, desiredScale), 0.08);
      product.glow.material.opacity += ((selected ? 0.58 : 0.3) - product.glow.material.opacity) * 0.08;
      product.orbit.line.material.opacity += ((selected ? 0.06 : 0.012) - product.orbit.line.material.opacity) * 0.08;

      projected.copy(product.group.position).applyMatrix4(universe.matrixWorld).project(camera);
      const anchor = anchors.get(product.key);
      if (anchor) {
        anchor.style.setProperty("--orbit-x", `${(projected.x * stage.clientWidth * 0.5).toFixed(2)}px`);
        anchor.style.setProperty("--orbit-y", `${(-projected.y * stage.clientHeight * 0.5).toFixed(2)}px`);
        anchor.style.setProperty("--orbit-scale", Math.max(0.78, 1.08 - projected.z * 0.14).toFixed(3));
        anchor.style.zIndex = String(8 + Math.round((1 - projected.z) * 5));
      }
    });

    renderer.render(scene, camera);
    if (motionEnabled || dragging || force) animationFrame = window.requestAnimationFrame(render);
  }

  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    dragDistance = 0;
    pointerDown = { x: event.clientX, y: event.clientY, rotationX: targetRotationX, rotationY: targetRotationY };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("is-dragging");
  });

  canvas.addEventListener("pointermove", (event) => {
    if (dragging && pointerDown) {
      const dx = event.clientX - pointerDown.x;
      const dy = event.clientY - pointerDown.y;
      dragDistance = Math.max(dragDistance, Math.hypot(dx, dy));
      targetRotationY = pointerDown.rotationY + dx * 0.0038;
      targetRotationX = THREE.MathUtils.clamp(pointerDown.rotationX + dy * 0.0027, -0.38, 0.26);
      setHovered(null);
      if (!motionEnabled) render(performance.now(), true);
      return;
    }
    setHovered(hitTest(event));
  }, { passive: true });

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

function createEarth(textureLoader, maxAnisotropy) {
  const group = new THREE.Group();
  group.rotation.x = THREE.MathUtils.degToRad(20.6);
  group.rotation.z = THREE.MathUtils.degToRad(-4.2);

  const geometry = new THREE.SphereGeometry(0.52, 128, 64);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x335b98,
    emissive: 0x07101d,
    emissiveIntensity: 0.24,
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

function createOrbit(definition, active) {
  const points = [];
  for (let index = 0; index < 256; index += 1) {
    const angle = index / 256 * Math.PI * 2;
    points.push(new THREE.Vector3(
      Math.cos(angle) * definition.radius,
      Math.sin(angle) * definition.radius * definition.flatten * 0.72,
      Math.sin(angle) * definition.radius * 0.16,
    ));
  }
  const euler = new THREE.Euler(definition.inclination, definition.yaw, definition.inclination * -0.28, "YXZ");
  points.forEach((point) => point.applyEuler(euler));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: definition.color,
    transparent: true,
    opacity: active ? 0.06 : 0.012,
    depthWrite: false,
  });
  const line = new THREE.LineLoop(geometry, material);
  return { line, euler };
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

  return { group, surface, glow, hitTarget };
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

function createLocalStarField() {
  const random = seededRandom(20260823);
  const positions = [];
  const colors = [];
  for (let index = 0; index < 520; index += 1) {
    const radius = 10 + random() * 21;
    const azimuth = random() * Math.PI * 2;
    const elevation = (random() - 0.5) * Math.PI;
    positions.push(
      Math.cos(elevation) * Math.cos(azimuth) * radius,
      Math.sin(elevation) * radius,
      Math.cos(elevation) * Math.sin(azimuth) * radius,
    );
    const warmth = random();
    colors.push(warmth > 0.91 ? 1 : 0.68, warmth > 0.91 ? 0.76 : 0.78, warmth > 0.91 ? 0.42 : 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ size: 0.026, vertexColors: true, transparent: true, opacity: 0.72, sizeAttenuation: true }),
  );
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
