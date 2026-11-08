"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * A whole-number input that keeps what you typed as text and reports a clean number.
 * Fixes the "01000" problem: a plain controlled <input type="number"> won't redraw when
 * the typed text and the stored number are numerically equal.
 */
export function NumberInput({
  value,
  onValueChange,
  min = 0,
  max,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: number;
  onValueChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  const [text, setText] = useState(value === 0 ? "" : String(value));

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      placeholder={props.placeholder ?? "0"}
      value={text}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
        setText(digits);
        let n = digits === "" ? 0 : Number(digits);
        if (max != null) n = Math.min(max, n);
        onValueChange(Math.max(min, n));
      }}
      onBlur={() => {
        // Show the clamped number once you leave the box.
        let n = text === "" ? min : Number(text);
        if (max != null) n = Math.min(max, n);
        n = Math.max(min, n);
        setText(n === 0 && min === 0 ? "" : String(n));
      }}
    />
  );
}
