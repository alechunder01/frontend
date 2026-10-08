import { useLayoutEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Color, MathUtils } from "three";
import { enableShadows } from "../shadows";
import { useExplode } from "../explode";

const TABLE_COLOR = "#b9ae9a"; // warm concrete instead of near-white
const SWAY_STRENGTH = 0.02;

// `rotation` is in degrees.
const Background = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  exploded = false,
  explosionOrigin = [0, 0, 0],
}) => {
  const { scene } = useGLTF("/models/scene.glb");
  const time = useMemo(() => ({ value: 0 }), []);

  useLayoutEffect(() => {
    enableShadows(scene);

    scene.traverse((object) => {
      if (!object.isMesh) return;
      const material = object.material;

      // The table top is almost white in the model, which blows out in the sun.
      if (material.name === "Material.004") {
        object.material = material.clone();
        object.material.color = new Color(TABLE_COLOR);
      }

      // Bushes: the vertex shader pushes the top of each bush side to side
      // (more the higher the vertex), offset per bush by its world position.
      if (material.name === "bush") {
        material.onBeforeCompile = (shader) => {
          shader.uniforms.uTime = time;
          shader.vertexShader = shader.vertexShader
            .replace("void main() {", "uniform float uTime;\nvoid main() {")
            .replace(
              "#include <begin_vertex>",
              `#include <begin_vertex>
              float sway = max(position.y, 0.0) * ${SWAY_STRENGTH};
              transformed.x += sin(uTime * 1.3 + modelMatrix[3].x * 0.4 + position.y * 3.0) * sway;
              transformed.z += cos(uTime * 1.1 + modelMatrix[3].z * 0.4) * sway * 0.7;`,
            );
        };
        material.needsUpdate = true;
      }
    });
  }, [scene, time]);

  useExplode(scene, exploded, explosionOrigin);

  useFrame((_, delta) => {
    time.value += delta;
  });

  return (
    <primitive
      object={scene}
      position={position}
      rotation={rotation.map(MathUtils.degToRad)}
    />
  );
};

useGLTF.preload("/models/scene.glb");

export default Background;
