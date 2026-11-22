"use client";

import { Check, LayoutTemplate, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export const DOCUMENT_COLOR_PRESETS = [
  { name: "Royal Blue", hex: "#2563eb" },
  { name: "Deep Navy", hex: "#0b2149" },
  { name: "Amber Ochre", hex: "#d9822b" },
  { name: "Terracotta Orange", hex: "#d95d2b" },
  { name: "Indigo Violet", hex: "#6366f1" },
  { name: "Emerald", hex: "#059669" },
  { name: "Ocean Teal", hex: "#0d9488" },
  { name: "Rose Crimson", hex: "#e11d48" },
] as const;

export type DocumentTemplateStyle =
  | "executive_sidebar"
  | "classic_banner"
  | "modern_corporate";

export const DOCUMENT_TEMPLATE_STYLES: Array<{
  id: DocumentTemplateStyle;
  name: string;
  subtitle: string;
}> = [
  {
    id: "executive_sidebar",
    name: "Executive Sidebar",
    subtitle: "Bold header + left client sidebar",
  },
  {
    id: "classic_banner",
    name: "Classic Banner",
    subtitle: "Top/bottom bars + 3-column details",
  },
  {
    id: "modern_corporate",
    name: "Modern Corporate",
    subtitle: "Shaded header band + bordered grid",
  },
];

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
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-mono font-semibold text-foreground">
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

interface DocumentTemplatePickerProps {
  value: DocumentTemplateStyle;
  onChange: (style: DocumentTemplateStyle) => void;
  accentColor: string;
  disabled?: boolean;
}

export function DocumentTemplatePicker({
  value,
  onChange,
  accentColor,
  disabled = false,
}: DocumentTemplatePickerProps) {
  const accent = /^#[0-9a-fA-F]{6}$/.test(accentColor)
    ? accentColor
    : "#2563eb";

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <LayoutTemplate
          className="h-3.5 w-3.5 text-muted-foreground"
          aria-hidden="true"
        />
        <span>Choose Document Layout Sample</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {DOCUMENT_TEMPLATE_STYLES.map((tpl) => {
          const active = value === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(tpl.id)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                active
                  ? "border-foreground bg-muted/40 ring-2 ring-foreground/15 shadow-xs"
                  : "border-border bg-card hover:bg-muted/25"
              )}
            >
              {/* Mini Visual Layout Thumbnail */}
              <div className="h-14 w-11 shrink-0 overflow-hidden rounded border border-border bg-white shadow-2xs flex flex-col justify-between">
                {tpl.id === "executive_sidebar" ? (
                  <>
                    <div
                      className="h-3.5 w-full px-1 flex items-center justify-between"
                      style={{ backgroundColor: accent }}
                    >
                      <span className="h-1.5 w-2.5 rounded-2xs bg-white/90" />
                      <span className="h-1 w-3 rounded-2xs bg-white/80" />
                    </div>
                    <div className="flex-1 flex gap-1 p-1">
                      <div className="w-3 rounded-2xs bg-slate-100 h-full" />
                      <div className="flex-1 space-y-1 pt-0.5">
                        <div className="h-1 w-full bg-slate-200 rounded-2xs" />
                        <div className="h-1 w-full bg-slate-200 rounded-2xs" />
                        <div
                          className="h-1.5 w-4 ml-auto rounded-2xs mt-1"
                          style={{ backgroundColor: accent }}
                        />
                      </div>
                    </div>
                    <div
                      className="h-1 w-full"
                      style={{ backgroundColor: accent }}
                    />
                  </>
                ) : tpl.id === "classic_banner" ? (
                  <>
                    <div
                      className="h-1.5 w-full"
                      style={{ backgroundColor: accent }}
                    />
                    <div className="flex-1 p-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="h-1.5 w-4 bg-slate-800 rounded-2xs" />
                        <span className="h-2 w-2 rounded-full bg-slate-300" />
                      </div>
                      <div className="grid grid-cols-3 gap-0.5">
                        <span className="h-1.5 bg-slate-100 rounded-2xs" />
                        <span className="h-1.5 bg-slate-100 rounded-2xs" />
                        <span className="h-1.5 bg-slate-100 rounded-2xs" />
                      </div>
                      <div
                        className="h-1.5 w-full rounded-2xs"
                        style={{ backgroundColor: accent }}
                      />
                      <div className="h-2.5 w-full bg-slate-100 rounded-2xs" />
                    </div>
                    <div
                      className="h-1.5 w-full"
                      style={{ backgroundColor: accent }}
                    />
                  </>
                ) : (
                  <>
                    <div
                      className="h-1 w-full"
                      style={{ backgroundColor: accent }}
                    />
                    <div className="h-3.5 w-full bg-slate-100 px-1 flex items-center justify-between">
                      <span className="h-2 w-2 rounded-full bg-slate-400" />
                      <span className="h-1 w-3 bg-slate-500 rounded-2xs" />
                    </div>
                    <div className="flex-1 p-1 space-y-1">
                      <div
                        className="h-1.5 w-full rounded-2xs"
                        style={{ backgroundColor: accent }}
                      />
                      <div className="h-3 w-full border border-slate-200 rounded-2xs" />
                    </div>
                    <div
                      className="h-1 w-full"
                      style={{ backgroundColor: accent }}
                    />
                  </>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-foreground truncate">
                    {tpl.name}
                  </p>
                  {active ? (
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: accent }}
                    >
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                  {tpl.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
