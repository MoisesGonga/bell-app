import { useEffect, useRef } from "react";
import { level } from "../lib/audio.js";
import { BellIcon } from "./Icons.jsx";

const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** The bell. It swings from the live loudness of whatever is playing. */
export default function BellButton({ ringing, speed, onClick }) {
  const bodyRef = useRef(null);
  const clapperRef = useRef(null);
  const haloRef = useRef(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    const calm = reduceMotion();
    let raf;
    let amp = 0;
    let phase = 0;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = level();
      amp += (target - amp) * (target > amp ? 0.5 : 0.12);
      phase += dt * 2 * Math.PI * (calm ? 3 : 11) * speedRef.current;
      const deg = Math.sin(phase) * amp * (calm ? 5 : 17);
      if (bodyRef.current) bodyRef.current.style.transform = `rotate(${deg.toFixed(2)}deg)`;
      if (clapperRef.current) clapperRef.current.style.transform = `translateX(${(-deg * 0.35).toFixed(2)}px)`;
      if (haloRef.current) {
        haloRef.current.style.opacity = (amp * 0.35).toFixed(3);
        haloRef.current.style.transform = `scale(${(1 + amp * 0.12).toFixed(3)})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <button
      id="bell"
      className="bell-btn"
      onClick={onClick}
      aria-label={ringing ? "Stop ringing" : "Ring the bell"}
      aria-pressed={ringing}
    >
      <span className="halo" ref={haloRef} />
      <BellIcon bodyRef={bodyRef} clapperRef={clapperRef} />
    </button>
  );
}
