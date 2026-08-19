"use client";

import { useDateInput } from "@/hooks/useDateInput";

type DateInputProps = {
  name: string;
  id?: string;
  defaultValue?: string | null;
  className?: string;
  required?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function DateInput({
  name,
  id,
  defaultValue,
  className,
  required,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby
}: DateInputProps) {
  const { inputProps, submitValue } = useDateInput(defaultValue ?? "");

  return (
    <>
      <input name={name} type="hidden" value={submitValue} />
      <input
        {...inputProps}
        className={className}
        id={id}
        required={required}
        type="text"
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
      />
    </>
  );
}
