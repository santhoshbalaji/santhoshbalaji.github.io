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
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
  camera.position.set(0, 0, 1000);
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

  const products = productDefinitions.map((definition) => {
    const product = createProductWorld(definition, maxAnisotropy);
    universe.add(product.group);
    return { ...definition, ...product };
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(4, 4);
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

  stage.dataset.threeState = "ready";
  stage.dataset.threeVersion = THREE.REVISION;
  stage.classList.add("has-three-universe");

  function resize() {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    renderer.setSize(width, height, false);
    camera.left = width / -2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = height / -2;
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

    earth.mesh.rotation.y = THREE.MathUtils.degToRad(0.6) * Math.sin(elapsed * 0.18);
    earth.atmosphere.material.uniforms.viewVector.value.copy(camera.position);
    const stageBounds = stage.getBoundingClientRect();
    const coreBounds = gravityCore?.getBoundingClientRect();
    if (coreBounds) {
      earth.group.position.set(
        coreBounds.left + coreBounds.width / 2 - stageBounds.left - stageBounds.width / 2,
        stageBounds.height / 2 - (coreBounds.top + coreBounds.height / 2 - stageBounds.top),
        0,
      );
      earth.group.scale.setScalar((coreBounds.width / 2) / 0.52);
    }

    products.forEach((product) => {
      const anchor = anchors.get(product.key);
      if (!anchor) return;
      const anchorBounds = anchor.getBoundingClientRect();
      product.group.position.set(
        anchorBounds.left + anchorBounds.width / 2 - stageBounds.left - stageBounds.width / 2,
        stageBounds.height / 2 - (anchorBounds.top + anchorBounds.height / 2 - stageBounds.top),
        Number.parseInt(anchor.style.zIndex || "8", 10) * 0.08,
      );
      product.group.scale.setScalar((anchorBounds.width / 2) / product.size);
      product.surface.rotation.y += motionEnabled ? delta * (0.18 + product.radius * 0.018) : 0;
      const selected = product.key === (hoveredProject || activeProject);
      product.glow.material.opacity += ((selected ? 0.58 : 0.3) - product.glow.material.opacity) * 0.08;
    });

    renderer.render(scene, camera);
    if (motionEnabled || force) animationFrame = window.requestAnimationFrame(render);
  }

  canvas.addEventListener("pointermove", (event) => {
    setHovered(hitTest(event));
  }, { passive: true });

  canvas.addEventListener("click", (event) => {
    const selected = hitTest(event);
    if (selected) anchors.get(selected)?.click();
  });

  canvas.addEventListener("pointerleave", () => {
    setHovered(null);
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
