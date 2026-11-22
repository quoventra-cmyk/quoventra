"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Check, ImagePlus, LayoutTemplate, Palette, RotateCcw } from "lucide-react";
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

export const DOCUMENT_TEMPLATE_STYLE_IDS = [
  "executive_sidebar",
  "classic_banner",
  "modern_corporate",
  "minimal_swiss",
  "bold_split_header",
  "centered_prestige",
  "sleek_agency",
  "compact_contractor",
  "royal_bordered",
] as const;

export type DocumentTemplateStyle =
  (typeof DOCUMENT_TEMPLATE_STYLE_IDS)[number];

export const DOCUMENT_TEMPLATE_STYLES: Array<{
  id: DocumentTemplateStyle;
  name: string;
  subtitle: string;
}> = [
  {
    id: "executive_sidebar",
    name: "1. Executive Sidebar",
    subtitle: "Bold header + left client sidebar",
  },
  {
    id: "classic_banner",
    name: "2. Classic Dual-Banner",
    subtitle: "Top/bottom bars + 3-column details",
  },
  {
    id: "modern_corporate",
    name: "3. Modern Corporate",
    subtitle: "Shaded header band + bordered grid",
  },
  {
    id: "minimal_swiss",
    name: "4. Minimal Swiss",
    subtitle: "Left accent spine + clean editorial grid",
  },
  {
    id: "bold_split_header",
    name: "5. Bold Split Header",
    subtitle: "Two-tone split banner + floating cards",
  },
  {
    id: "centered_prestige",
    name: "6. Centered Prestige",
    subtitle: "Centered logo crest + double rule frame",
  },
  {
    id: "sleek_agency",
    name: "7. Sleek Agency",
    subtitle: "Dark slate header + vibrant accent pill",
  },
  {
    id: "compact_contractor",
    name: "8. Contractor Pro",
    subtitle: "4-box job metadata + signature block",
  },
  {
    id: "royal_bordered",
    name: "9. Royal Framed",
    subtitle: "Full outer accent frame + corner badge",
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
          <Palette
            className="h-3.5 w-3.5 text-muted-foreground"
            aria-hidden="true"
          />
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

function TemplateMiniPreview({
  id,
  accent,
}: {
  id: DocumentTemplateStyle;
  accent: string;
}) {
  if (id === "executive_sidebar") {
    return (
      <>
        <div
          className="h-3.5 w-full px-1 flex items-center justify-between"
          style={{ backgroundColor: accent }}
        >
          <span className="h-2 w-2 rounded-2xs bg-white/95" />
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
        <div className="h-1 w-full" style={{ backgroundColor: accent }} />
      </>
    );
  }
  if (id === "classic_banner") {
    return (
      <>
        <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />
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
          <div className="h-2 w-full bg-slate-100 rounded-2xs" />
        </div>
        <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />
      </>
    );
  }
  if (id === "modern_corporate") {
    return (
      <>
        <div className="h-1 w-full" style={{ backgroundColor: accent }} />
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
        <div className="h-1 w-full" style={{ backgroundColor: accent }} />
      </>
    );
  }
  if (id === "minimal_swiss") {
    return (
      <div className="flex h-full w-full">
        <div className="w-1.5 h-full" style={{ backgroundColor: accent }} />
        <div className="flex-1 p-1 space-y-1">
          <div className="flex justify-between items-center">
            <span
              className="h-2 w-2 rounded-2xs"
              style={{ backgroundColor: accent }}
            />
            <span className="h-1 w-3 bg-slate-400 rounded-2xs" />
          </div>
          <div className="h-0.5 w-full bg-slate-200" />
          <div className="h-1 w-full bg-slate-100" />
          <div className="h-1 w-full bg-slate-100" />
          <div
            className="h-1.5 w-4 ml-auto rounded-2xs"
            style={{ backgroundColor: accent }}
          />
        </div>
      </div>
    );
  }
  if (id === "bold_split_header") {
    return (
      <>
        <div className="h-4 w-full flex">
          <div
            className="w-3/5 h-full px-1 flex items-center"
            style={{ backgroundColor: accent }}
          >
            <span className="h-2 w-2 rounded-2xs bg-white" />
          </div>
          <div className="w-2/5 h-full bg-slate-900 flex items-center justify-end px-1">
            <span className="h-1 w-2.5 bg-white/80 rounded-2xs" />
          </div>
        </div>
        <div className="flex-1 p-1 space-y-1">
          <div className="grid grid-cols-2 gap-1">
            <span className="h-2 bg-slate-100 rounded-2xs" />
            <span className="h-2 bg-slate-100 rounded-2xs" />
          </div>
          <div
            className="h-1.5 w-full rounded-full"
            style={{ backgroundColor: accent }}
          />
          <div className="h-2 w-full bg-slate-100 rounded-2xs" />
        </div>
      </>
    );
  }
  if (id === "centered_prestige") {
    return (
      <div className="flex-1 p-1 flex flex-col items-center space-y-1">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: accent }}
        />
        <div className="h-0.5 w-full" style={{ backgroundColor: accent }} />
        <div className="w-full flex-1 space-y-1 pt-0.5">
          <div className="h-1.5 w-full bg-slate-100 rounded-2xs" />
          <div className="h-1.5 w-full bg-slate-100 rounded-2xs" />
        </div>
        <div className="h-0.5 w-full" style={{ backgroundColor: accent }} />
      </div>
    );
  }
  if (id === "sleek_agency") {
    return (
      <>
        <div className="h-4 w-full bg-slate-900 px-1 flex items-center justify-between">
          <span className="h-2 w-2 rounded-full bg-white" />
          <span
            className="h-1.5 w-3 rounded-full"
            style={{ backgroundColor: accent }}
          />
        </div>
        <div className="h-0.5 w-full" style={{ backgroundColor: accent }} />
        <div className="flex-1 p-1 space-y-1">
          <div className="h-1.5 w-full bg-slate-100 rounded-2xs" />
          <div className="h-1.5 w-full bg-slate-100 rounded-2xs" />
          <div
            className="h-2 w-5 ml-auto rounded-2xs"
            style={{ backgroundColor: accent }}
          />
        </div>
      </>
    );
  }
  if (id === "compact_contractor") {
    return (
      <div className="flex-1 p-1 space-y-1">
        <div className="flex justify-between items-center border-b border-slate-300 pb-0.5">
          <span
            className="h-2 w-2 rounded-2xs"
            style={{ backgroundColor: accent }}
          />
          <span className="h-1.5 w-4 bg-slate-700 rounded-2xs" />
        </div>
        <div className="grid grid-cols-4 gap-0.5">
          <span className="h-1.5 border border-slate-300" />
          <span className="h-1.5 border border-slate-300" />
          <span className="h-1.5 border border-slate-300" />
          <span className="h-1.5 border border-slate-300" />
        </div>
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: accent }}
        />
        <div className="h-2.5 w-full border border-slate-300" />
      </div>
    );
  }
  // royal_bordered
  return (
    <div
      className="m-0.5 flex-1 rounded-2xs border-2 p-1 flex flex-col justify-between"
      style={{ borderColor: accent }}
    >
      <div className="flex justify-between items-center">
        <span
          className="h-2 w-2 rounded-2xs"
          style={{ backgroundColor: accent }}
        />
        <span
          className="h-1.5 w-3.5 rounded-2xs"
          style={{ backgroundColor: accent }}
        />
      </div>
      <div className="space-y-0.5">
        <div className="h-1 w-full bg-slate-200" />
        <div className="h-1 w-full bg-slate-100" />
      </div>
      <div
        className="h-1.5 w-4 ml-auto rounded-2xs"
        style={{ backgroundColor: accent }}
      />
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <LayoutTemplate
            className="h-3.5 w-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          <span>Choose Document Layout Sample (9 Designs)</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Includes company logo on every layout
        </span>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {DOCUMENT_TEMPLATE_STYLES.map((tpl) => {
          const active = value === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(tpl.id)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all",
                active
                  ? "border-foreground bg-muted/50 ring-2 ring-foreground/15 shadow-xs"
                  : "border-border bg-card hover:bg-muted/25"
              )}
            >
              <div className="h-14 w-11 shrink-0 overflow-hidden rounded border border-border bg-white shadow-2xs flex flex-col justify-between">
                <TemplateMiniPreview id={tpl.id} accent={accent} />
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

interface DocumentLogoUploaderProps {
  value: string;
  onChange: (logoDataOrUrl: string) => void;
  disabled?: boolean;
}

export function DocumentLogoUploader({
  value,
  onChange,
  disabled = false,
}: DocumentLogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const currentLogo = value?.trim() || "/quoventra-logo.png";
  const isCustom = currentLogo !== "/quoventra-logo.png";

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a PNG or JPG image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const maxW = 320;
        const maxH = 160;
        let w = img.width || 200;
        let h = img.height || 100;
        const ratio = Math.min(maxW / w, maxH / h, 1);
        w = Math.max(1, Math.round(w * ratio));
        h = Math.max(1, Math.round(h * ratio));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setUploadError("Could not process logo image.");
          return;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const pngDataUrl = canvas.toDataURL("image/png");
        onChange(pngDataUrl);
      };
      img.onerror = () => {
        setUploadError("Could not read image file.");
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors disabled:opacity-50"
      >
        <ImagePlus className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
        <span>Upload Logo (PNG/JPG)</span>
      </button>

      {isCustom ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("/quoventra-logo.png")}
          className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          <span>Reset Logo</span>
        </button>
      ) : null}

      {uploadError ? (
        <span className="text-xs text-destructive">{uploadError}</span>
      ) : null}
    </div>
  );
}
