import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MathUtils, Spherical, Vector3 } from "three";

const SMOOTHING = 4;
const SHAKE_DURATION = 3.5; // seconds
// Aspect ratio the views are framed for. Narrower screens (phones in
// portrait) get the camera pulled back so the same width still fits.
const REFERENCE_ASPECT = 1.4;

const offset = new Vector3();
const spherical = new Spherical();

// Eases the camera towards `position`/`target`, then orbits it around the
// target by up to `range` radians, following the mouse position.
// `shake` is a ref holding 0..1; it is set to 1 to start a shake and decays
// back to 0 on its own.
const CameraRig = ({ position, target: targetArray, range, shake }) => {
  // Smoothed copies of the props, so changing them glides instead of snapping.
  const currentPosition = useRef(new Vector3(...position));
  const currentTarget = useRef(new Vector3(...targetArray));
  const baseFov = useRef(null);
  const currentPointer = useRef({ x: 0, y: 0 });
  // Mouse position in -1..1, tracked on the window. R3F's own `pointer` uses
  // event.offsetX, which is relative to the element under the cursor, so it
  // jumps whenever the mouse is over the HTML text on the laptop screen.
  const mouseTarget = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e) => {
      mouseTarget.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseTarget.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame(({ camera }, rawDelta) => {
    baseFov.current ??= camera.fov;
    // Clamp so a long frame (e.g. a hitch) can't make the camera jump.
    const delta = Math.min(rawDelta, 0.05);
    const pos = currentPosition.current;
    const target = currentTarget.current;

    pos.x = MathUtils.damp(pos.x, position[0], SMOOTHING, delta);
    pos.y = MathUtils.damp(pos.y, position[1], SMOOTHING, delta);
    pos.z = MathUtils.damp(pos.z, position[2], SMOOTHING, delta);
    target.x = MathUtils.damp(target.x, targetArray[0], SMOOTHING, delta);
    target.y = MathUtils.damp(target.y, targetArray[1], SMOOTHING, delta);
    target.z = MathUtils.damp(target.z, targetArray[2], SMOOTHING, delta);

    const mouse = currentPointer.current;
    mouse.x = MathUtils.damp(mouse.x, mouseTarget.current.x, SMOOTHING, delta);
    mouse.y = MathUtils.damp(mouse.y, mouseTarget.current.y, SMOOTHING, delta);

    const fit = Math.max(1, REFERENCE_ASPECT / camera.aspect);
    spherical.setFromVector3(offset.copy(pos).sub(target));
    spherical.radius *= fit;
    spherical.phi -= mouse.y * range;
    spherical.theta += mouse.x * range;

    camera.position.setFromSpherical(spherical).add(target);
    camera.lookAt(target);

    if (shake && shake.current > 0) {
      const s = shake.current * shake.current;
      const t = performance.now() / 1000;
      camera.position.x += (Math.sin(t * 47) + Math.sin(t * 31)) * 0.03 * s;
      camera.position.y += (Math.sin(t * 53) + Math.sin(t * 29)) * 0.03 * s;
      camera.position.z += Math.sin(t * 41) * 0.03 * s;
      camera.rotateZ(Math.sin(t * 37) * 0.06 * s);
      camera.rotateX(Math.sin(t * 43) * 0.04 * s);
      camera.rotateY(Math.sin(t * 59) * 0.04 * s);
      shake.current = Math.max(0, shake.current - delta / SHAKE_DURATION);
      // Zoom punch from the blast, snapping back quickly.
      camera.fov = baseFov.current - Math.pow(shake.current, 6) * 30;
      camera.updateProjectionMatrix();
    }
    // The laptop screen (drei Html) reads the camera matrices in its own
    // frame callback; make them current so it stays glued to the model.
    camera.updateMatrixWorld();
  }, -1);

  return null;
};

export default CameraRig;
