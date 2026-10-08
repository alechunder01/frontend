import { useFrame, useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import { PlaneGeometry, RepeatWrapping, TextureLoader, Vector3 } from "three";
import { Water as WaterSurface } from "three-stdlib";
import { SUN_COLOR, SUN_POSITION } from "./Atmosphere";

// An animated water surface: moving ripples that reflect the sky and show the
// sun's glint. `size` is [width, depth] in world units.
const Water = ({ position = [0, -10, 0], size: [width, depth] = [20, 20] }) => {
  const loaded = useLoader(TextureLoader, "/waternormals.png");

  const water = useMemo(() => {
    // The ripple texture tiles, so it repeats instead of stretching.
    const normals = loaded.clone();
    normals.wrapS = normals.wrapT = RepeatWrapping;
    normals.anisotropy = 8; // keeps ripples sharp at grazing angles
    normals.needsUpdate = true;
    const surface = new WaterSurface(new PlaneGeometry(width, depth), {
      waterNormals: normals,
      sunDirection: new Vector3(...SUN_POSITION).normalize(),
      sunColor: SUN_COLOR,
      waterColor: "#1b6e9a",
      distortionScale: 10, // how strongly ripples bend the reflection
      textureWidth: 512,
      textureHeight: 512,
      fog: true,
    });
    // How many times the ripple texture repeats: higher = smaller, finer ripples.
    surface.material.uniforms.size.value = 6;
    return surface;
  }, [loaded, width, depth]);

  // Advancing the shader's clock is what makes the ripples move.
  useFrame((_, delta) => {
    water.material.uniforms.time.value += delta * 0.4;
  });

  return (
    <primitive object={water} position={position} rotation-x={-Math.PI / 2} />
  );
};

export default Water;
