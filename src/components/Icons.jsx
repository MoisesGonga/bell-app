const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

export function BellIcon({ bodyRef, clapperRef }) {
  return (
    <svg className="bell" viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <g className="body" ref={bodyRef}>
        <path
          d="M50 12c-2.2 0-4 1.8-4 4v2.3C34.4 20.2 26 30.4 26 42.5V60l-7 9v3h62v-3l-7-9V42.5C74 30.4 65.6 20.2 54 18.3V16c0-2.2-1.8-4-4-4z"
          fill="currentColor"
        />
        <path ref={clapperRef} d="M40 76a10 10 0 0 0 20 0z" fill="currentColor" />
      </g>
    </svg>
  );
}

export const SlidersIcon = () => (
  <svg viewBox="0 0 24 24" strokeWidth={1.8} {...stroke}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
    <circle cx={16} cy={6} r={2} />
    <circle cx={10} cy={12} r={2} />
    <circle cx={18} cy={18} r={2} />
  </svg>
);

export const CheckIcon = () => (
  <svg className="check" viewBox="0 0 24 24" strokeWidth={2.4} {...stroke}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const SpeakerLowIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4 9h4l5-4v14l-5-4H4z" />
  </svg>
);

export const SpeakerHighIcon = () => (
  <svg viewBox="0 0 24 24" strokeWidth={1.8} {...stroke}>
    <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke="none" />
    <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
  </svg>
);

export const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
);

export const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x={6} y={5} width={4} height={14} rx={1} />
    <rect x={14} y={5} width={4} height={14} rx={1} />
  </svg>
);

export const StopIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x={6} y={6} width={12} height={12} rx={2} />
  </svg>
);

export const TrashIcon = () => (
  <svg viewBox="0 0 24 24" strokeWidth={1.8} {...stroke}>
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />
  </svg>
);

export const PlusIcon = () => (
  <svg viewBox="0 0 24 24" strokeWidth={2} {...stroke}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MicIcon = () => (
  <svg viewBox="0 0 24 24" strokeWidth={2} {...stroke}>
    <rect x={9} y={3} width={6} height={11} rx={3} fill="currentColor" stroke="none" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
  </svg>
);
