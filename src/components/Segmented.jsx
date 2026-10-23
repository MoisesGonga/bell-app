/** iOS-style segmented control. options: [value, label][] */
export default function Segmented({ label, value, options, onChange, full = false }) {
  const idBase = label.replace(/\W/g, "");
  return (
    <div className={"seg" + (full ? " full" : "")} role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} id={`${idBase}-${v}`} aria-pressed={value === v} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}
