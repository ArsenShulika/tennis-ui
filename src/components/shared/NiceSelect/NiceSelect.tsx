import { Select } from "antd";
import type { SelectProps } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import css from "./NiceSelect.module.css";

type Option = { value: string; label: string; disabled?: boolean };

type Props = {
  name: string;
  id?: string;
  className?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  options: Option[];
  onChange?: (value: string) => void;
};

const NiceSelect = ({
  name,
  id,
  className,
  placeholder = "Select an option",
  required,
  defaultValue,
  options,
  onChange,
}: Props) => {
  const [value, setValue] = useState<string>(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);

  const syncHiddenInput = useCallback(
    (nextValue: string, dispatchEvent = false) => {
      const input = hiddenInputRef.current;
      if (!input) return;

      input.value = nextValue;
      if (dispatchEvent) {
        const changeEvent = new Event("change", { bubbles: true });
        input.dispatchEvent(changeEvent);
      }
    },
    []
  );

  useEffect(() => {
    syncHiddenInput(value);
  }, [value, syncHiddenInput]);

  useEffect(() => {
    const next = defaultValue ?? "";
    setValue(next);
  }, [defaultValue]);

  useEffect(() => {
    const form = hiddenInputRef.current?.form;
    if (!form) return;

    const handleReset = () => {
      const next = defaultValue ?? "";
      setValue(next);
      syncHiddenInput(next, true);
      onChange?.(next);
    };

    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [defaultValue, onChange, syncHiddenInput]);

  const handleSelectChange: SelectProps<string, Option>["onChange"] = (
    nextValue
  ) => {
    const normalizedValue =
      typeof nextValue === "string" ? nextValue : String(nextValue ?? "");
    setValue(normalizedValue);
    setOpen(false);
    syncHiddenInput(normalizedValue, true);
    onChange?.(normalizedValue);
  };

  return (
    <div className={css.wrapper}>
      <input
        type="hidden"
        name={name}
        value={value}
        required={required}
        ref={hiddenInputRef}
        readOnly
      />
      <Select
        id={id}
        open={open}
        value={value || undefined}
        options={options}
        placeholder={placeholder}
        onChange={handleSelectChange}
        onOpenChange={setOpen}
        className={[css.select, className].filter(Boolean).join(" ")}
        popupClassName={css.dropdown}
        showArrow
        allowClear={false}
        style={{ width: "100%" }}
        getPopupContainer={(triggerNode) =>
          triggerNode?.parentElement ?? document.body
        }
      />
    </div>
  );
};

export default NiceSelect;
