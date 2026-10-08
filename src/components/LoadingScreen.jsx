import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

const MIN_DURATION = 500; // the bar never fills faster than this, even if assets are instant
const FADE_DURATION = 300;

const LoadingScreen = ({ onDone }) => {
  const { progress: real, active } = useProgress();
  const [shown, setShown] = useState(0);
  const [hidden, setHidden] = useState(false);

  const assetsReady = real >= 100 && !active;

  useEffect(() => {
    let raf;
    let last = performance.now();
    const start = last;
    let value = 0;

    const tick = (now) => {
      const elapsed = now - start;
      const dt = (now - last) / 1000;
      last = now;

      // asymptotic creep so the bar keeps moving even if real progress is stuck at 0 or 95
      const creep = 90 * (1 - Math.exp(-elapsed / 1500));
      const available = assetsReady ? 100 : Math.max(real * 0.95, creep);
      // linear ramp over MIN_DURATION caps how fast we can go
      const ramp = Math.min(100, (elapsed / MIN_DURATION) * 100);
      const target = Math.min(available, ramp);

      value += (target - value) * Math.min(1, dt * 6);
      if (assetsReady && target >= 100 && value > 99.5) value = 100;
      setShown(value);

      if (value < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [real, assetsReady]);

  useEffect(() => {
    if (shown < 100) return;
    onDone?.();
    const t = setTimeout(() => setHidden(true), FADE_DURATION);
    return () => clearTimeout(t);
  }, [shown, onDone]);

  if (hidden) return null;

  return (
    <div className="loader" data-done={shown >= 100}>
      <div className="loader-track">
        <div className="loader-bar" style={{ width: `${shown}%` }} />
      </div>
      <div className="loader-percent">{Math.round(shown)}%</div>
    </div>
  );
};

export default LoadingScreen;
