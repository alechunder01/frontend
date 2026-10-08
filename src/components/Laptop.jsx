import { useLayoutEffect, useMemo, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { createPortal } from "@react-three/fiber";
import { Euler, MathUtils, Vector3 } from "three";
import { enableShadows } from "../shadows";
import { useExplode } from "../explode";
import ScreenUI from "./ScreenUI";

// Screen mesh is a flat 0.584 x 0.404 plane centred at (0, 0.21, 0.01) in the
// node's local space; the UI texture sits just in front of it.
const SCREEN_POSITION = [0, 0.215, 0.011];

// [position, target] for the camera. The screen is tilted back ~14°, so the
// close-up sits 0.5 units out along the screen normal, centred on the screen.
// Given in the laptop's local space; screenView() moves it to world space.
const SCREEN_VIEW_LOCAL = [
  [0, 0.335, 0.223],
  [0, 0.211, -0.261],
];
export const screenView = (position, rotation) => {
  const euler = new Euler(...rotation.map(MathUtils.degToRad));
  return SCREEN_VIEW_LOCAL.map((point) =>
    new Vector3(...point).applyEuler(euler).add(new Vector3(...position)).toArray(),
  );
};
const OVERVIEW = [
  [0, 0.39, 0.69],
  [0, 0.12, -0.07],
];
// On portrait screens (phones) the screen is the whole point, so stay on it.
export const IS_PORTRAIT =
  typeof window !== "undefined" &&
  window.matchMedia("(max-aspect-ratio: 1/1)").matches;

// `rotation` is in degrees.
const Laptop = ({
  onStart,
  onZoom,
  onExplode,
  exploded = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) => {
  const { scene, nodes } = useGLTF("/models/laptop.glb");
  useLayoutEffect(() => enableShadows(scene), [scene]);
  useExplode(scene, exploded, position);
  const [page, setPage] = useState("home");
  const DEFAULT_VIEW = IS_PORTRAIT
    ? screenView(position, rotation)
    : OVERVIEW;

  const go = (next, view) => () => {
    setPage(next);
    if (view) onZoom(...view);
  };

  const items = useMemo(() => {
    const zoomed = screenView(position, rotation);
    switch (page) {
      case "home":
        return [
          { text: "defuse.exe", size: 80 },
          { text: "start.game", size: 32, mb: 0, onClick: go("game", zoomed) },
          { text: "credits", size: 32, onClick: go("credits", zoomed) },
        ];
      case "credits":
        return [
          { text: "Marek Beil - research, electronics", size: 22.4 },
          { text: "Lukáš Vlček - 3D modeling", size: 22.4 },
          { text: "František Burdič - 3D modeling, assembly", size: 22.4 },
          { text: "Alexandre Nicolas - web developement, assembly", size: 22.4 },
          { text: "back", size: 32, onClick: go("home", DEFAULT_VIEW) },
        ];
      case "game":
        return [
          { text: "Bomb connected!", size: 64, mb: 32 },
          { text: "explode", size: 32, onClick: onExplode },
          { text: "back", size: 32, onClick: go("home", DEFAULT_VIEW) },
        ];
      default:
        return [{ text: "Page not found", size: 32 }];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, onExplode]);

  return (
    <>
      <primitive
        object={scene}
        position={position}
        rotation={rotation.map(MathUtils.degToRad)}
      />
      {createPortal(
        <ScreenUI
          items={items}
          position={SCREEN_POSITION}
          imageSrc={page === "game" ? "/bomb.webp" : null}
        />,
        nodes.laptop_screen,
      )}
    </>
  );
};

useGLTF.preload("/models/laptop.glb");

export default Laptop;
