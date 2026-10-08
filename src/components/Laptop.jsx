import { useEffect, useLayoutEffect, useState } from "react";
import { useGLTF, Html } from "@react-three/drei";
import { createPortal } from "@react-three/fiber";
import { Euler, MathUtils, Vector3 } from "three";
import { enableShadows } from "../shadows";

// Screen mesh is a flat 0.584 x 0.404 plane centred at (0, 0.21, 0.01) in the
// node's local space. Html `transform` maps 1 world unit to 40px at scale 1,
// so 1168x808px at scale 0.02 covers the plane exactly.
const SCREEN_POSITION = [0, 0.215, 0.011];
const SCREEN_PX = [1168, 780];
const SCREEN_SCALE = 0.02;

// [position, target] for the camera. The screen is tilted back ~14°, so the
// close-up sits 0.5 units out along the screen normal, centred on the screen.
// Given in the laptop's local space; screenView() moves it to world space.
const SCREEN_VIEW_LOCAL = [
  [0, 0.335, 0.223],
  [0, 0.211, -0.261],
];
const screenView = (position, rotation) => {
  const euler = new Euler(...rotation.map(MathUtils.degToRad));
  return SCREEN_VIEW_LOCAL.map((point) =>
    new Vector3(...point).applyEuler(euler).add(new Vector3(...position)).toArray(),
  );
};
const DEFAULT_VIEW = [
  [0, 0.39, 0.69],
  [0, 0.12, -0.07],
];

// `rotation` is in degrees.
const Laptop = ({
  onStart,
  onZoom,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) => {
  const { scene, nodes } = useGLTF("/models/laptop.glb");
  useLayoutEffect(() => enableShadows(scene), [scene]);
  const [page, setPage] = useState("home");

  const [content, setContent] = useState(null);

  useEffect(() => {
    switch (page) {
      case "home":
        setContent(
          <div>
            <h1>defuse.exe</h1>
            <button
              onClick={() => {
                setPage("game");
                onZoom(...screenView(position, rotation));
              }}
            >
              start.game
            </button>
            <button
              onClick={() => {
                setPage("credits");
                onZoom(...screenView(position, rotation));
              }}
            >
              credits
            </button>
          </div>,
        );
        break;
      case "credits":
        setContent(
          <div>
            <p className="credits-text">Marek Beil - research, electronics</p>
            <p className="credits-text">Lukáš Vlček - 3D modeling</p>
            <p className="credits-text">
              František Burdič - 3D modeling, assembly
            </p>
            <p className="credits-text">
              Alexandre Nicolas - web developement, assembly
            </p>
            <button
              onClick={() => {
                setPage("home");
                onZoom(...DEFAULT_VIEW);
              }}
            >
              back
            </button>
          </div>,
        );
        break;
      case "game":
        setContent(
          <div>
            <h2>Game setup</h2>
            <button
              onClick={() => {
                setPage("home");
              }}
            >
              connect to bomb unit
            </button>
            <button
              onClick={() => {
                setPage("home");
                onZoom(...DEFAULT_VIEW);
              }}
            >
              back
            </button>
          </div>,
        );
        break;
      default:
        setContent(<p>Page not found</p>);
    }
  }, [page, onStart]);

  return (
    <>
      <primitive
        object={scene}
        position={position}
        rotation={rotation.map(MathUtils.degToRad)}
      />
      {createPortal(
        <Html
          transform
          position={SCREEN_POSITION}
          scale={SCREEN_SCALE}
        >
          <div
            className="screen-ui"
            style={{
              width: SCREEN_PX[0],
              height: SCREEN_PX[1],
              overflow: "hidden",
            }}
          >
            {content}
          </div>
        </Html>,
        nodes.laptop_screen,
      )}
    </>
  );
};

useGLTF.preload("/models/laptop.glb");

export default Laptop;
