"use client";

import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export const DOCUMENT_COLOR_PRESETS = [
  { name: "Royal Blue", hex: "#2563eb" },
  { name: "Indigo Violet", hex: "#6366f1" },
  { name: "Deep Navy", hex: "#0f172a" },
  { name: "Emerald", hex: "#059669" },
  { name: "Ocean Teal", hex: "#0d9488" },
  { name: "Amber Gold", hex: "#d97706" },
  { name: "Rose Crimson", hex: "#e11d48" },
] as const;

interface DocumentColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  label?: string;
}

export function DocumentColorPicker({
  value,
  onChange,
  disabled = false,
  label = "Document Theme Color",
}: DocumentColorPickerProps) {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#2563eb";

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Palette className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          {label}
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-mono font-semibold text-foreground"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: normalized }}
          />
          {normalized.toUpperCase()}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {DOCUMENT_COLOR_PRESETS.map((preset) => {
          const active =
            normalized.toLowerCase() === preset.hex.toLowerCase();
          return (
            <button
              key={preset.hex}
              type="button"
              disabled={disabled}
              title={preset.name}
              aria-label={`Select ${preset.name} (${preset.hex})`}
              onClick={() => onChange(preset.hex)}
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-110 disabled:opacity-50",
                active
                  ? "border-foreground ring-2 ring-offset-2 ring-foreground/20 scale-105"
                  : "border-white dark:border-slate-800 shadow-xs"
              )}
              style={{ backgroundColor: preset.hex }}
            >
              {active ? (
                <Check className="h-4 w-4 text-white drop-shadow-xs" />
              ) : null}
            </button>
          );
        })}

        <label
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground cursor-pointer hover:bg-muted transition-colors",
            disabled && "opacity-50 pointer-events-none"
          )}
          title="Pick any custom color"
        >
          <input
            type="color"
            value={normalized}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0"
            aria-label="Custom color picker"
          />
          <span>Custom</span>
        </label>
      </div>
    </div>
  );
}

