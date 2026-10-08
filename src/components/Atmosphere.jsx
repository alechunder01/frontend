import { Environment, Sky } from "@react-three/drei";

const HAZE_COLOR = "#b4cfe6";
// Exported so the water can reflect the same sun. Low and to the side, so the
// light rakes across surfaces and shapes read as 3D instead of flat.
export const SUN_POSITION = [5, 3.5, 1.5];
export const SUN_COLOR = "#fff1d6";

// The daytime look of the scene: sky, distant haze, sunlight with shadows and
// the soft light that fills them.
const Atmosphere = () => (
  <>
    {/* Gradient sky with the sun in the right place, instead of a flat colour. */}
    <Sky sunPosition={SUN_POSITION} turbidity={2.5} rayleigh={2.2} />
    {/* Far objects fade into a pale haze, which gives depth. */}
    <fog attach="fog" args={[HAZE_COLOR, 0, 110]} />

    {/* Cool light from the sky above, warm bounce from the ground below. */}
    <hemisphereLight args={["#b8d4ff", "#8a7a66", 0.5]} />
    <ambientLight intensity={0.15} />

    {/* The sun. Its shadow box only covers the area around the laptop. */}
    <directionalLight
      position={SUN_POSITION}
      color={SUN_COLOR}
      intensity={2.2}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-2}
      shadow-camera-right={2}
      shadow-camera-top={2}
      shadow-camera-bottom={-2}
      shadow-camera-near={0.5}
      shadow-camera-far={20}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
    />

    {/* City HDRI: reflections on the laptop. */}
    <Environment preset="city" environmentIntensity={0.5} />
  </>
);

export default Atmosphere;
