import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry } from "three";

const COUNT = 400;
const DURATION = 2.2; // seconds

// Fireball: a burst of glowing sparks and a short light flash at `position`.
const Blast = ({ position, active }) => {
  const light = useRef();
  const wave = useRef();
  const waveMaterial = useRef();
  const material = useRef();
  const age = useRef(Infinity);
  const velocities = useMemo(() => new Float32Array(COUNT * 3), []);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(COUNT * 3), 3),
    );
    return g;
  }, []);

  useEffect(() => {
    if (!active) {
      age.current = Infinity;
      return;
    }
    age.current = 0;
    const pos = geometry.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      // Random direction on a sphere, random speed.
      const u = Math.random() * 2 - 1;
      const phi = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const speed = 1 + Math.random() * 5;
      velocities[i * 3] = r * Math.cos(phi) * speed;
      velocities[i * 3 + 1] = Math.abs(u) * speed + 0.5;
      velocities[i * 3 + 2] = r * Math.sin(phi) * speed;
      pos[i * 3] = pos[i * 3 + 1] = pos[i * 3 + 2] = 0;
    }
    geometry.attributes.position.needsUpdate = true;
  }, [active, geometry, velocities]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (age.current > DURATION) {
      material.current.opacity = 0;
      waveMaterial.current.opacity = 0;
      light.current.intensity = 0;
      return;
    }
    age.current += delta;
    const t = age.current / DURATION;
    const pos = geometry.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      velocities[i * 3 + 1] -= 3 * delta;
      pos[i * 3] += velocities[i * 3] * delta;
      pos[i * 3 + 1] += velocities[i * 3 + 1] * delta;
      pos[i * 3 + 2] += velocities[i * 3 + 2] * delta;
    }
    geometry.attributes.position.needsUpdate = true;
    material.current.opacity = 1 - t;
    // Shockwave: a fast expanding glowing sphere that fades.
    const w = Math.min(1, age.current / 0.6);
    wave.current.scale.setScalar(0.1 + w * 9);
    waveMaterial.current.opacity = 0.7 * (1 - w) * (1 - w);
    light.current.intensity = 60 * Math.max(0, 1 - t * 3);
  });

  return (
    <group position={position}>
      <points geometry={geometry} frustumCulled={false}>
        <pointsMaterial
          ref={material}
          color="#ff9a3c"
          size={0.12}
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
      <mesh ref={wave}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial
          ref={waveMaterial}
          color="#ffd9a0"
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <pointLight ref={light} color="#ffb060" intensity={0} distance={12} />
    </group>
  );
};

export default Blast;
