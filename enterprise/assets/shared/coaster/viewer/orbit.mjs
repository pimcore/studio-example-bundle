// The orbit view: mounts the coaster scene on a WebGL canvas in any element, with an orbit camera (drag to turn,
// wheel or pinch to zoom, right-drag to pan). Plain DOM, so any host can embed it; react.mjs wraps it as a component.
//
//   import { mountCoasterViewer } from './orbit.mjs';
//   const viewer = mountCoasterViewer(element, { file, size: { width: 800, height: 500 } });
//   // file:  the .coaster file, as its text or already parsed
//   // size:  the canvas size in CSS pixels; without it the canvas fills the element and follows its size
//   viewer.dispose(); // when the host removes it
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { validateCoaster } from '../schema/validate.mjs';
import { buildCoasterScene } from './scene.mjs';

/** Parses and validates a .coaster file: { design } or { error } with a readable message. */
export function readCoasterFile(file) {
  let design = file;
  if (typeof file === 'string') {
    try {
      design = JSON.parse(file);
    } catch (e) {
      return { error: `Not a .coaster file: ${e.message}` };
    }
  }
  const { valid, errors } = validateCoaster(design);
  if (!valid) return { error: `Not a valid .coaster file: ${errors.map((e) => `${e.path || '/'} ${e.message}`).join('; ')}` };
  return { design };
}

/**
 * Mounts the orbit view in `container`.
 * @param {HTMLElement} container
 * @param {{ file: string | object, size?: { width: number, height: number },
 *   colors?: Partial<import('./scene.mjs').DEFAULT_COLORS> }} options
 * @returns {{ canvas?: HTMLCanvasElement, camera?: THREE.PerspectiveCamera, controls?: OrbitControls,
 *   scene?: THREE.Scene, error?: string, render(): void, setSize(size?: { width: number, height: number }): void,
 *   dispose(): void }}
 */
export function mountCoasterViewer(container, { file, size, colors } = {}) {
  const { design, error } = readCoasterFile(file);
  if (error) {
    const message = container.ownerDocument.createElement('p');
    message.className = 'coaster-viewer-error';
    message.setAttribute('role', 'alert');
    message.textContent = error;
    container.append(message);
    return { error, render() {}, setSize() {}, dispose: () => message.remove() };
  }

  const { scene, center, radius } = buildCoasterScene(design, { colors });
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(container.ownerDocument.defaultView?.devicePixelRatio ?? 1);
  const canvas = renderer.domElement;
  canvas.className = 'coaster-viewer';
  canvas.setAttribute('aria-label', `3D view of the coaster ${design.meta?.name ?? ''}`.trim());
  canvas.style.display = 'block';
  container.append(canvas);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.5, radius * 20);
  // Three-quarter view from the outside of the station, slightly above the highest point.
  camera.position.set(center.x - radius * 0.9, center.y + radius * 0.8, center.z + radius * 1.6);
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(center);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.02; // stay above the ground
  controls.minDistance = radius * 0.3;
  controls.maxDistance = radius * 6;
  controls.update();

  const render = () => renderer.render(scene, camera);
  const setSize = (next = size) => {
    const width = next?.width ?? container.clientWidth;
    const height = next?.height ?? container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  };
  setSize();
  const observer =
    !size && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => setSize()) : undefined;
  observer?.observe(container);

  renderer.setAnimationLoop(() => {
    controls.update();
    render();
  });

  return {
    canvas,
    camera,
    controls,
    scene,
    render,
    setSize,
    dispose() {
      renderer.setAnimationLoop(null);
      observer?.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        object.geometry?.dispose();
        object.material?.dispose?.();
      });
      renderer.dispose();
      canvas.remove();
    },
  };
}
