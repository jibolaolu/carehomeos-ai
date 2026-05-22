"use client";

import { useId } from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type RegisterOptions,
} from "react-hook-form";

type InputType = "text" | "number" | "textarea" | "select" | "date" | "datetime-local" | "email" | "password";

interface SelectOption {
  value: string;
  label: string;
}

interface FormFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  type?: InputType;
  placeholder?: string;
  options?: SelectOption[];
  rules?: RegisterOptions<T, Path<T>>;
  disabled?: boolean;
  rows?: number;
  min?: number | string;
  max?: number | string;
  step?: number | string;
}

export default function FormField<T extends FieldValues>({
  name,
  control,
  label,
  type = "text",
  placeholder,
  options,
  rules,
  disabled,
  rows = 3,
  min,
  max,
  step,
}: FormFieldProps<T>) {
  const id = useId();

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field, fieldState }) => (
          <>
            {type === "textarea" ? (
              <textarea
                id={id}
                className="input"
                rows={rows}
                placeholder={placeholder}
                disabled={disabled}
                {...field}
                value={field.value ?? ""}
              />
            ) : type === "select" ? (
              <select
                id={id}
                className="select"
                disabled={disabled}
                {...field}
                value={field.value ?? ""}
              >
                <option value="">Select…</option>
                {options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                className="input"
                type={type}
                placeholder={placeholder}
                disabled={disabled}
                min={min}
                max={max}
                step={step}
                {...field}
                value={field.value ?? ""}
              />
            )}
            {fieldState.error && (
              <span style={{ color: "var(--danger)", fontSize: 12, fontWeight: 700 }}>
                {fieldState.error.message}
              </span>
            )}
          </>
        )}
      />
    </div>
  );
}
