import { useEffect, useMemo, useState } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

// The laptop screen UI is drawn on a canvas and shown as a texture, so it is
// part of the 3D scene (CSS 3D overlays drift out of place on mobile Safari).
export const SCREEN_PX = [1168, 780];
export const SCREEN_SIZE = [0.584, 0.39]; // world units
const FONT = '"Press Start 2P", system-ui';
const GAP = 16;

// Items are stacked and centred, like the old flex column.
// { text, size, mb?, onClick? } - items with onClick are buttons.
const layout = (ctx, items) => {
  const boxes = items.map((item) => ({
    ...item,
    height: item.size * 1.5,
    mb: item.mb ?? 0,
  }));
  const total =
    boxes.reduce((sum, b) => sum + b.height + b.mb, 0) +
    GAP * (boxes.length - 1);
  let y = (SCREEN_PX[1] - total) / 2;
  for (const b of boxes) {
    ctx.font = `${b.size}px ${FONT}`;
    b.width = ctx.measureText(b.text).width;
    b.x = (SCREEN_PX[0] - b.width) / 2;
    b.y = y;
    y += b.height + b.mb + GAP;
  }
  return boxes;
};

const draw = (ctx, boxes, hover, image) => {
  const [w, h] = SCREEN_PX;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  // Soft glow in the middle, darker corners.
  let g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5);
  g.addColorStop(0, "rgba(40,70,90,0.35)");
  g.addColorStop(0.7, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (image) {
    // Fit to the screen height, centred.
    const scale = h / image.height;
    const iw = image.width * scale;
    ctx.drawImage(image, (w - iw) / 2, 0, iw, h);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, w, h);
  }

  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(255,255,255,0.6)";
  ctx.shadowBlur = 8;
  boxes.forEach((b, i) => {
    ctx.font = `${b.size}px ${FONT}`;
    ctx.globalAlpha = b.onClick && hover !== i ? 0.85 : 1;
    ctx.fillText(b.text, b.x, b.y + b.height / 2);
    if (b.onClick && hover === i) {
      ctx.fillRect(b.x, b.y + b.height - 4, b.width, 3);
    }
  });
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Scanlines.
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  for (let y = 2; y < h; y += 3) ctx.fillRect(0, y, w, 1);

  // Vignette.
  g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.65);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

const ScreenUI = ({ items, position, imageSrc }) => {
  const [image, setImage] = useState(null);
  const [fontReady, setFontReady] = useState(false);
  const [hover, setHover] = useState(-1);

  const { ctx, texture } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = SCREEN_PX[0];
    canvas.height = SCREEN_PX[1];
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    return { ctx: canvas.getContext("2d"), texture };
  }, []);

  useEffect(() => {
    document.fonts
      .load(`32px ${FONT}`)
      .catch(() => {})
      .then(() => setFontReady(true));
  }, []);

  useEffect(() => {
    setImage(null);
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = imageSrc;
  }, [imageSrc]);

  const boxes = useMemo(
    () => layout(ctx, items),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx, items, fontReady],
  );

  useEffect(() => {
    draw(ctx, boxes, hover, image);
    texture.needsUpdate = true;
  }, [ctx, boxes, hover, image, texture]);

  const hit = (uv) => {
    const x = uv.x * SCREEN_PX[0];
    const y = (1 - uv.y) * SCREEN_PX[1];
    // Generous padding so fingers can hit the small text.
    return boxes.findIndex(
      (b) =>
        b.onClick &&
        x >= b.x - 40 &&
        x <= b.x + b.width + 40 &&
        y >= b.y - 14 &&
        y <= b.y + b.height + 14,
    );
  };

  return (
    <mesh
      position={position}
      onClick={(e) => {
        const i = hit(e.uv);
        if (i >= 0) {
          e.stopPropagation();
          boxes[i].onClick();
        }
      }}
      onPointerMove={(e) => {
        const i = hit(e.uv);
        setHover(i);
        document.body.style.cursor = i >= 0 ? "pointer" : "";
      }}
      onPointerOut={() => {
        setHover(-1);
        document.body.style.cursor = "";
      }}
    >
      <planeGeometry args={SCREEN_SIZE} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
};

export default ScreenUI;
