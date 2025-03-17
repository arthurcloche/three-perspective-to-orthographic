import "./style.css";
import * as THREE from "three";
import { MathUtils } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import GUI from "lil-gui";

/**
 * GUI Controls
 */
const gui = new GUI({ width: 500 });

const config = {
  enableOrbitControls: true,
  orthoBlend: 0,
  sceneType: "floating", // "city" or "floating"
  fov: 110, // Wider initial field of view (was 75)
};

// Add controls to GUI
gui.add(config, "enableOrbitControls").onChange((value) => {
  controls.enabled = value;
});
gui
  .add(config, "orthoBlend", 0, 1, 0.01)
  .name("Perspective (0) to Ortho (1)")
  .onChange((value) => {
    camera.interpolationFactor = value;
    camera.updateProjectionMatrix();
  });
gui.add(config, "sceneType", ["city", "floating"]).onChange(createScene);

// Add FOV control to demonstrate the difference more clearly
config.fov = config.fov;
gui.add(config, "fov", 30, 150, 1).onChange((value) => {
  camera.fov = value;
  camera.perspFOV = value;
  camera.updateProjectionMatrix();
});

/**
 * Scene Setup
 */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

/**
 * Viewport sizing
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

/**
 * Custom Interpolated Camera
 */
class InterpolatedCamera extends THREE.PerspectiveCamera {
  constructor(fov, aspect, near, far) {
    super(fov, aspect, near, far);

    // Calculate initial dimensions
    const distance = 1; // Initial arbitrary distance
    const height = 2 * distance * Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const width = height * aspect;

    // Create orthographic camera with proper parameters
    this.orthoCam = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      near,
      far
    );

    // Interpolation factor (0 = perspective, 1 = orthographic)
    this.interpolationFactor = 0;

    // Store original parameters
    this.perspFOV = fov;
  }

  updateProjectionMatrix() {
    if (!this.orthoCam) return super.updateProjectionMatrix();

    // Update orthographic camera size based on distance
    const distance = this.position.length();
    const height =
      2 * distance * Math.tan(THREE.MathUtils.degToRad(this.perspFOV / 2));
    const width = height * this.aspect;

    this.orthoCam.left = -width / 2;
    this.orthoCam.right = width / 2;
    this.orthoCam.top = height / 2;
    this.orthoCam.bottom = -height / 2;
    this.orthoCam.near = this.near;
    this.orthoCam.far = this.far;
    this.orthoCam.position.copy(this.position);
    this.orthoCam.rotation.copy(this.rotation);
    this.orthoCam.updateProjectionMatrix();

    // Update perspective camera
    super.updateProjectionMatrix();

    // Interpolate between the two projection matrices
    if (this.interpolationFactor <= 0) {
      // Pure perspective
      return;
    } else if (this.interpolationFactor >= 1) {
      // Pure orthographic
      this.projectionMatrix.copy(this.orthoCam.projectionMatrix);
      return;
    }

    // Apply easing function to make interpolation feel more linear
    // Using a custom easing curve to linearize the visual effect
    const t = this.interpolationFactor;
    const easedT = Math.pow(t, 2.2); // Adjust this power for more linear visual effect

    // Get elements from both matrices
    const pe = this.projectionMatrix.elements;
    const oe = this.orthoCam.projectionMatrix.elements;

    // Create a new blended matrix by interpolating each element
    const blended = [
      pe[0] * (1 - easedT) + oe[0] * easedT,
      pe[1] * (1 - easedT) + oe[1] * easedT,
      pe[2] * (1 - easedT) + oe[2] * easedT,
      pe[3] * (1 - easedT) + oe[3] * easedT,
      pe[4] * (1 - easedT) + oe[4] * easedT,
      pe[5] * (1 - easedT) + oe[5] * easedT,
      pe[6] * (1 - easedT) + oe[6] * easedT,
      pe[7] * (1 - easedT) + oe[7] * easedT,
      pe[8] * (1 - easedT) + oe[8] * easedT,
      pe[9] * (1 - easedT) + oe[9] * easedT,
      pe[10] * (1 - easedT) + oe[10] * easedT,
      pe[11] * (1 - easedT) + oe[11] * easedT,
      pe[12] * (1 - easedT) + oe[12] * easedT,
      pe[13] * (1 - easedT) + oe[13] * easedT,
      pe[14] * (1 - easedT) + oe[14] * easedT,
      pe[15] * (1 - easedT) + oe[15] * easedT,
    ];

    // Set the projection matrix with the blended values
    this.projectionMatrix.fromArray(blended);
  }
}

/**
 * Camera Setup
 */
const fov = config.fov; // Wider initial field of view (was 75)
const camera = new InterpolatedCamera(
  fov,
  sizes.width / sizes.height,
  0.1,
  10000
);

camera.position.set(6, 6, 6); // Closer to the scene (was 9, 9, 9)
camera.lookAt(new THREE.Vector3(0, 0, 0));

/**
 * Renderer Setup
 */
const renderer = new THREE.WebGLRenderer({
  antialias: window.devicePixelRatio < 2,
  logarithmicDepthBuffer: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

/**
 * Orbit Controls
 */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 20;
controls.target.set(0, 0, 0);

/**
 * Clock for animations
 */
const clock = new THREE.Clock();

// Store animated objects
const animatedObjects = [];
const size = 6;

/**
 * Create scene based on selected type
 */
function createScene() {
  // Clear existing scene
  while (scene.children.length > 0) {
    const object = scene.children[0];
    scene.remove(object);
  }

  // Reset animated objects array
  animatedObjects.length = 0;

  // Set background
  scene.background = new THREE.Color(0x0a0a1a);

  // Add lights
  const light = new THREE.PointLight(0xffffff, 100, 100);
  light.position.set(size * 1.5, size * 4, size * 1.5);
  light.castShadow = true;
  scene.add(light);

  const ambientLight = new THREE.AmbientLight(0x6666ff, 0.5);
  scene.add(ambientLight);

  const rimLight = new THREE.DirectionalLight(0xff9900, 2);
  rimLight.position.set(-size * 2, size, -size * 2);
  scene.add(rimLight);

  if (config.sceneType === "city") {
    createCityScene();
  } else {
    createFloatingScene();
  }
}

/**
 * Create Manhattan cityscape
 */
function createCityScene() {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x4a9eff,
    roughness: 0.3,
    metalness: 0.5,
    emissive: 0x112244,
  });

  // Generate buildings grid
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const height = Math.random() * 8 + 2; // Taller buildings (was 4 + 1)
      const geometry = new THREE.BoxGeometry(1, height, 1);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        -size + i * 2 + 1,
        -2.5 + height / 2,
        -size + j * 2 + 1
      );
      scene.add(mesh);
    }
  }

  // Add a center reference object
  const centerGeometry = new THREE.SphereGeometry(0.3, 16, 16);
  const centerMaterial = new THREE.MeshStandardMaterial({
    color: 0xff3333,
    emissive: 0xff0000,
    emissiveIntensity: 0.5,
    roughness: 0.2,
  });
  const centerSphere = new THREE.Mesh(centerGeometry, centerMaterial);
  scene.add(centerSphere);

  // Add a ground plane
  const groundGeometry = new THREE.PlaneGeometry(size * 5, size * 5);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x222233,
    roughness: 0.8,
    metalness: 0.2,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.5;
  scene.add(ground);
}

/**
 * Create floating objects scene
 */
function createFloatingScene() {
  const cubeCount = 70; // More objects (was 50)
  const cubeSize = 1.5; // Larger objects (was 1)
  const spread = 25; // Wider spread (was 15)

  // Create materials with different colors
  const materials = [
    new THREE.MeshPhysicalMaterial({
      color: 0x4a9eff,
      roughness: 0.3,
      metalness: 0.7,
      emissive: 0x112244,
    }),
    new THREE.MeshPhysicalMaterial({
      color: 0xff5a5a,
      roughness: 0.4,
      metalness: 0.6,
      emissive: 0x441111,
    }),
    new THREE.MeshPhysicalMaterial({
      color: 0x5aff5a,
      roughness: 0.5,
      metalness: 0.5,
      emissive: 0x114411,
    }),
    new THREE.MeshPhysicalMaterial({
      color: 0xffff5a,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x444411,
    }),
  ];

  // Create different geometries
  const geometries = [
    new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
    new THREE.SphereGeometry(cubeSize / 2, 16, 16),
    new THREE.TetrahedronGeometry(cubeSize / 2),
    new THREE.TorusGeometry(cubeSize / 2, cubeSize / 4, 16, 32),
    new THREE.OctahedronGeometry(cubeSize / 2),
  ];

  for (let i = 0; i < cubeCount; i++) {
    // Randomly select geometry and material
    const geometry = geometries[Math.floor(Math.random() * geometries.length)];
    const material = materials[Math.floor(Math.random() * materials.length)];

    const mesh = new THREE.Mesh(geometry, material);

    // Random position
    mesh.position.set(
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread
    );

    // Random rotation
    mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    // Random scale
    const scale = Math.random() * 0.5 + 0.5;
    mesh.scale.set(scale, scale, scale);

    // Random rotation speed
    mesh.userData.rotationSpeed = {
      x: (Math.random() - 0.5) * 0.01,
      y: (Math.random() - 0.5) * 0.01,
      z: (Math.random() - 0.5) * 0.01,
    };

    // Random orbit
    mesh.userData.orbit = {
      radius: Math.random() * 8 + 3, // Larger orbit radius (was 5 + 2)
      speed: (Math.random() - 0.5) * 0.001,
      offset: Math.random() * Math.PI * 2,
      centerY: (Math.random() - 0.5) * 8, // More vertical spread (was 5)
    };

    scene.add(mesh);
    animatedObjects.push(mesh);
  }

  // Add a center reference object
  const centerGeometry = new THREE.SphereGeometry(1, 32, 32); // Larger center sphere (was 0.5)
  const centerMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1,
    roughness: 0,
    metalness: 0,
  });
  const centerSphere = new THREE.Mesh(centerGeometry, centerMaterial);
  scene.add(centerSphere);
}

// Create initial scene
createScene();

/**
 * Animation loop
 */
function tic() {
  const deltaTime = clock.getDelta();
  const time = clock.getElapsedTime();

  // Update orbit controls
  if (config.enableOrbitControls) {
    controls.update();
  }

  // Animate objects
  if (config.sceneType === "floating") {
    animatedObjects.forEach((obj) => {
      // Self rotation
      obj.rotation.x += obj.userData.rotationSpeed.x;
      obj.rotation.y += obj.userData.rotationSpeed.y;
      obj.rotation.z += obj.userData.rotationSpeed.z;

      // Orbital motion
      const orbit = obj.userData.orbit;
      obj.position.x =
        Math.cos(time * orbit.speed + orbit.offset) * orbit.radius;
      obj.position.z =
        Math.sin(time * orbit.speed + orbit.offset) * orbit.radius;
      obj.position.y =
        Math.sin(time * orbit.speed * 0.5 + orbit.offset) * 2 + orbit.centerY;
    });
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tic);
}

requestAnimationFrame(tic);

/**
 * Window resize handler
 */
window.addEventListener("resize", onResize);

function onResize() {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
