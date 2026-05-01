export default function StarRating({ value = 0, max = 5, size = 16, showNumber = false }) {
  const filled = Math.round(value);
  return (
    <span className="d-inline-flex align-items-center" style={{ gap: 2 }}>
      {Array.from({ length: max }, (_, i) => (
        <i
          key={i}
          className={`bi bi-star-fill ${i < filled ? "tc-star" : "tc-star-empty"}`}
          style={{ fontSize: size }}
        />
      ))}
      {showNumber && value > 0 && (
        <span className="ms-2 small text-muted">{Number(value).toFixed(1)}</span>
      )}
    </span>
  );
}

export function StarPicker({ value, onChange }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="btn btn-link p-0 me-1"
          style={{ textDecoration: "none" }}
        >
          <i
            className={`bi bi-star-fill ${n <= value ? "tc-star" : "tc-star-empty"}`}
            style={{ fontSize: 24 }}
          />
        </button>
      ))}
    </span>
  );
}
