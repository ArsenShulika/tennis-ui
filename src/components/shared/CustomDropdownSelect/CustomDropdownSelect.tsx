import { useEffect, useMemo, useRef, useState } from "react";
import css from "./CustomDropdownSelect.module.css";

type Option = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  emptyText?: string;
  disabled?: boolean;
};

export default function CustomDropdownSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  emptyText = "Немає доступних варіантів",
  disabled = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const hasEnabledOptions = options.some((option) => !option.disabled);

  return (
    <div className={css.root} ref={rootRef}>
      <button
        id={id}
        type="button"
        className={`${css.trigger} ${isOpen ? css.triggerOpen : ""}`}
        onClick={() => {
          if (disabled || !hasEnabledOptions) return;
          setIsOpen((current) => !current);
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled || !hasEnabledOptions}
      >
        <span className={css.triggerTopRow}>
          <span className={css.triggerLabel}>{selectedOption?.label ?? placeholder}</span>
          <span className={css.triggerArrow} aria-hidden>
            {isOpen ? "▴" : "▾"}
          </span>
        </span>
      </button>

      {isOpen ? (
        <div className={css.popover} role="listbox" aria-labelledby={id}>
          {options.length > 0 ? (
            <div className={css.options}>
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${css.optionButton} ${
                    option.value === value ? css.optionSelected : ""
                  }`}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  disabled={option.disabled}
                  aria-selected={option.value === value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <div className={css.emptyState}>{emptyText}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
