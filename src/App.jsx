import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  ContactShadows,
  PerformanceMonitor,
  SoftShadows,
} from "@react-three/drei";
import {
  DepthOfField,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";
import Laptop, { IS_PORTRAIT, screenView } from "./components/Laptop";
import CameraRig from "./components/CameraRig";
import LoadingScreen from "./components/LoadingScreen";
import Background from "./components/Background";
import Atmosphere from "./components/Atmosphere";
import Water from "./components/Water";
import Blast from "./components/Blast";

// Starter camera: follows the mouse, limited to a few degrees around this view.
const CAMERA_POSITION = [0, 0.39, 0.69];
const CAMERA_TARGET = [0, 0.12, -0.07];
const CAMERA_FOV = 50;
const CAMERA_RANGE = (6 * Math.PI) / 180;

const LAPTOP_POSITION = [0.2, 0, 0.1];
const LAPTOP_ROTATION = [0, -20, 0]; // degrees

// The bomb is on the laptop.
const EXPLOSION_ORIGIN = [LAPTOP_POSITION[0], 0.1, LAPTOP_POSITION[2]];

const WATER_POSITION = [-32.75, -3.84, -27.3];
const WATER_SIZE = [108, 42];

// Point the camera keeps in focus; everything else is blurred a little.
const FOCUS_POINT = [LAPTOP_POSITION[0], 0.15, LAPTOP_POSITION[2]];

// Phones and tablets: lower resolution and no post-processing, to stay smooth.
const IS_TOUCH =
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches;

const [START_POSITION, START_TARGET] = IS_PORTRAIT
  ? screenView(LAPTOP_POSITION, LAPTOP_ROTATION)
  : [CAMERA_POSITION, CAMERA_TARGET];

const App = () => {
  const [ready, setReady] = useState(false);
  const [cameraPosition, setCameraPosition] = useState(START_POSITION);
  const [cameraTarget, setCameraTarget] = useState(START_TARGET);
  // Post-processing is switched off for good if the frame rate drops.
  const [effects, setEffects] = useState(!IS_TOUCH);
  const [exploded, setExploded] = useState(false);
  const [canRebuild, setCanRebuild] = useState(false);
  const shake = useRef(0);
  const explode = useCallback(() => {
    shake.current = 1;
    setExploded(true);
  }, []);
  useEffect(() => {
    if (!exploded) return;
    const t = setTimeout(() => setCanRebuild(true), 4000);
    return () => {
      clearTimeout(t);
      setCanRebuild(false);
    };
  }, [exploded]);
  const handleDone = useCallback(() => setReady(true), []);

  return (
    <div className="app">
      <div className="scene" data-ready={ready}>
        <Canvas
          shadows
          dpr={IS_TOUCH ? [1, 1.25] : [1, 1.5]}
          camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV }}
        >
          <PerformanceMonitor onDecline={() => setEffects(false)} />
          {/* Shadows get softer the further they are from what casts them. */}
          <SoftShadows size={8} samples={12} focus={0.6} />
          <Suspense fallback={null}>
            {/*Models*/}
            <Laptop
              position={LAPTOP_POSITION}
              rotation={LAPTOP_ROTATION}
              exploded={exploded}
              onExplode={explode}
              onZoom={(pos, target) => {
                setCameraPosition(pos);
                setCameraTarget(target);
              }}
            />
            <Background exploded={exploded} explosionOrigin={EXPLOSION_ORIGIN} />
            <Blast position={EXPLOSION_ORIGIN} active={exploded} />

            {/*Atmosphere, shading*/}
            <Atmosphere />
            <Water position={WATER_POSITION} size={WATER_SIZE} />
            <ContactShadows
              frames={1}
              position={[LAPTOP_POSITION[0], 0.001, LAPTOP_POSITION[2]]}
              scale={1.5}
              blur={2.5}
              opacity={0.8}
              resolution={256}
            />
          </Suspense>
          {effects && (
            <EffectComposer multisampling={0}>
              {/* Blurs what is far from the laptop, so it stands out. */}
              <DepthOfField
                target={FOCUS_POINT}
                worldFocusRange={1.5}
                bokehScale={3}
                resolutionScale={0.5}
              />
              {/* The composer bypasses the renderer's own tone mapping. */}
              <ToneMapping />
            </EffectComposer>
          )}
          <CameraRig
            position={cameraPosition}
            target={cameraTarget}
            range={CAMERA_RANGE}
            shake={shake}
          />
        </Canvas>
      </div>
      {exploded && <div className="flash" />}
      {canRebuild && (
        <button className="rebuild" onClick={() => setExploded(false)}>
          rebuild
        </button>
      )}
      <LoadingScreen onDone={handleDone} />
    </div>
  );
};

export default App;
