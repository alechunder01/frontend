import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";

const GRAVITY = 9.8;
const KILL_HEIGHT = -40; // pieces that fall below this are hidden
const tmp = new Vector3();

const rand = () => Math.random() * 2 - 1;

// While `active`, throws every mesh of `scene` away from `origin` (world
// space) and lets it tumble and fall. Going inactive puts everything back.
export const useExplode = (scene, active, origin) => {
  const parts = useRef(null);

  useEffect(() => {
    if (!active) return;
    scene.updateMatrixWorld(true);
    const center = new Vector3(...origin);
    const list = [];

    scene.traverse((obj) => {
      if (!obj.isMesh || !obj.parent) return;
      const world = obj.getWorldPosition(new Vector3());
      const dir = world.clone().sub(center);
      const dist = dir.length();
      if (dist < 1e-3) dir.set(rand(), 1, rand());
      dir.normalize();
      dir.y += 0.6;
      dir.normalize();
      // Pieces close to the bomb fly harder.
      const speed = (4 + Math.random() * 3) / (1 + dist * 0.15);
      list.push({
        obj,
        basePosition: obj.position.clone(),
        baseRotation: obj.rotation.clone(),
        world,
        velocity: dir.multiplyScalar(speed),
        spin: new Vector3(rand(), rand(), rand()).multiplyScalar(6),
      });
    });
    parts.current = list;

    return () => {
      for (const p of list) {
        p.obj.position.copy(p.basePosition);
        p.obj.rotation.copy(p.baseRotation);
        p.obj.visible = true;
      }
      parts.current = null;
    };
  }, [active, scene, origin]);

  useFrame((_, rawDelta) => {
    if (!parts.current) return;
    const delta = Math.min(rawDelta, 0.05);
    for (const p of parts.current) {
      if (!p.obj.visible) continue;
      p.velocity.y -= GRAVITY * delta;
      p.world.addScaledVector(p.velocity, delta);
      p.obj.position.copy(p.obj.parent.worldToLocal(tmp.copy(p.world)));
      p.obj.rotation.x += p.spin.x * delta;
      p.obj.rotation.y += p.spin.y * delta;
      p.obj.rotation.z += p.spin.z * delta;
      if (p.world.y < KILL_HEIGHT) p.obj.visible = false;
    }
  });
};
