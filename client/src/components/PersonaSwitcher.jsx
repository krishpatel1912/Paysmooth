// client/src/components/PersonaSwitcher.jsx

// Row of buttons, one per rider; highlights the active one
export default function PersonaSwitcher({
  riders,
  activeId,
  selectedRiderId,
  onSelect,
  onChange,
  onAddYourself
}) {
  const currentId = activeId ?? selectedRiderId;
  const handleSelect = onSelect ?? onChange ?? (() => {});

  return (
    <div className="persona-switcher" role="tablist" aria-label="Choose rider">
      {riders.map((r) => {
        const isSelected = r.id === currentId;
        return (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            className={`persona-btn ${isSelected ? "persona-btn--active active" : ""} ${r.isCustom ? "persona-btn--custom" : ""}`}
            onClick={() => handleSelect(r.id)}
          >
            <span className="persona-name">
              {r.name} {r.isCustom && <span className="custom-badge">You</span>}
            </span>
            <span className="persona-meta">
              {r.platform} · {r.city}
            </span>
          </button>
        );
      })}

      {onAddYourself && (
        <button
          type="button"
          className="persona-btn persona-btn--add"
          onClick={onAddYourself}
          title="Add custom gig profile"
        >
          <span className="persona-name">＋ Add yourself</span>
          <span className="persona-meta">Custom profile</span>
        </button>
      )}
    </div>
  );
}