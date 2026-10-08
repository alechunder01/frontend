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
import { BEEP_TIMES, playBombSequence, playHappy } from "./boom";

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

// Confetti pieces with random position, colour, size and timing.
const CONFETTI = Array.from({ length: 60 }, () => ({
  left: `${Math.random() * 100}%`,
  background: `hsl(${Math.floor(Math.random() * 360)} 90% 60%)`,
  width: `${6 + Math.random() * 8}px`,
  height: `${10 + Math.random() * 10}px`,
  animationDuration: `${2.5 + Math.random() * 3}s`,
  animationDelay: `${Math.random() * 3}s`,
}));

const App = () => {
  const [ready, setReady] = useState(false);
  const [cameraPosition, setCameraPosition] = useState(START_POSITION);
  const [cameraTarget, setCameraTarget] = useState(START_TARGET);
  // Post-processing is switched off for good if the frame rate drops.
  const [effects, setEffects] = useState(!IS_TOUCH);
  const [exploded, setExploded] = useState(false);
  const [canRebuild, setCanRebuild] = useState(false);
  const [fading, setFading] = useState(false);
  const [finale, setFinale] = useState(false);
  const shake = useRef(0);
  const [armed, setArmed] = useState(false);
  const [beeps, setBeeps] = useState(0); // beeps played so far
  const [beepOn, setBeepOn] = useState(false);
  const explode = useCallback(() => {
    if (armed) return;
    setArmed(true);
    // Beeps first, then the explosion.
    const delay = playBombSequence();
    BEEP_TIMES.forEach((t, i) => {
      setTimeout(
        () => {
          setBeeps(i + 1);
          setBeepOn(true);
          setTimeout(() => setBeepOn(false), 70);
        },
        t * 1000 + 50,
      );
    });
    setTimeout(() => {
      shake.current = 1;
      setExploded(true);
    }, delay);
  }, [armed]);
  useEffect(() => {
    if (!exploded) return;
    // Fade to black a while after the blast, then the happy ending.
    const dark = setTimeout(() => setFading(true), 300);
    const end = setTimeout(() => {
      setFinale(true);
      playHappy();
    }, 2000);
    const rebuild = setTimeout(() => setCanRebuild(true), 5000);
    return () => {
      clearTimeout(dark);
      clearTimeout(end);
      clearTimeout(rebuild);
      setFading(false);
      setFinale(false);
      setCanRebuild(false);
    };
  }, [exploded]);
  const handleDone = useCallback(() => setReady(true), []);

  return (
    <div className="app" data-exploded={exploded}>
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
              countdown={armed ? BEEP_TIMES.length - beeps : null}
              onZoom={(pos, target) => {
                setCameraPosition(pos);
                setCameraTarget(target);
              }}
            />
            <Background
              exploded={exploded}
              explosionOrigin={EXPLOSION_ORIGIN}
            />
            <Blast position={EXPLOSION_ORIGIN} active={exploded} />

            {/*Atmosphere, shading*/}
            <Atmosphere />
            {!exploded && <Water position={WATER_POSITION} size={WATER_SIZE} />}
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
      {beepOn && <div className="beep-flash" />}
      {exploded && <div className="flash" />}
      <div className="blackout" data-on={fading} />
      {finale && (
        <>
          <div className="confetti" aria-hidden="true">
            {CONFETTI.map((c, i) => (
              <i key={i} style={c} />
            ))}
          </div>
          <div className="finale">
            <img src="/bomb.webp" alt="" />
            <p>اللّهُ أكبرالاللّهُ أكبرلّهُ أكبر</p>
          </div>
        </>
      )}
      {canRebuild && (
        <button className="rebuild" onClick={() => window.location.reload()}>
          rebuild
        </button>
      )}
      <LoadingScreen onDone={handleDone} />
    </div>
  );
};

export default App;
