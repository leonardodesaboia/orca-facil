"use client";

import { usePhoneInput } from "@/hooks/usePhoneInput";

type PhoneInputProps = {
  name: string;
  id?: string;
  defaultValue?: string | null;
  className?: string;
  required?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function PhoneInput({
  name,
  id,
  defaultValue,
  className,
  required,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby
}: PhoneInputProps) {
  const { inputProps, submitValue } = usePhoneInput(defaultValue ?? "");

  return (
    <>
      <input name={name} required={required} type="hidden" value={submitValue} />
      <input
        {...inputProps}
        className={className}
        id={id}
        type="tel"
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
      />
    </>
  );
}
