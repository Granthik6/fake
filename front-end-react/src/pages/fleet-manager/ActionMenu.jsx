export default function ActionMenu({ children }) {
  return (
    <div className="actions">
      <button className="dots" type="button" aria-label="Actions">
        ⋯
      </button>
      <div className="menu">{children}</div>
    </div>
  );
}
