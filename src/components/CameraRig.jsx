import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MathUtils, Spherical, Vector3 } from "three";

const SMOOTHING = 4;
// Aspect ratio the views are framed for. Narrower screens (phones in
// portrait) get the camera pulled back so the same width still fits.
const REFERENCE_ASPECT = 1.4;

const offset = new Vector3();
const spherical = new Spherical();

// Eases the camera towards `position`/`target`, then orbits it around the
// target by up to `range` radians, following the mouse position.
const CameraRig = ({ position, target: targetArray, range }) => {
  // Smoothed copies of the props, so changing them glides instead of snapping.
  const currentPosition = useRef(new Vector3(...position));
  const currentTarget = useRef(new Vector3(...targetArray));
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
  });

  return null;
};

export default CameraRig;
