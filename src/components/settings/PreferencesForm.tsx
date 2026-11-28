"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Panel } from "@/components/app/Panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAccessibilityStore,
  type ReadingFont,
} from "@/stores/accessibility-store";
import { useLiveAnnouncer } from "@/components/accessibility/LiveAnnouncer";
import { useTranslation } from "@/lib/i18n/use-translation";

export function PreferencesForm({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const { t, isEn } = useTranslation();
  const store = useAccessibilityStore();
  const { announce } = useLiveAnnouncer();
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isAuthenticated) {
        const res = await fetch("/api/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            readingFont: store.readingFont,
            fontSizePx: store.fontSizePx,
            lineHeight: store.lineHeight,
            letterSpacingEm: store.letterSpacingEm,
            readingWidth: store.readingWidth,
            contrastMode: store.contrastMode,
            readingSurface: store.readingSurface,
            narrationSpeed: store.narrationSpeed,
            motionPreference: store.motionPreference,
            language: store.language,
          }),
        });
        if (!res.ok) {
          toast.error(
            isEn
              ? "Failed to save preferences to account profile."
              : "Gagal menyimpan pengaturan ke profil akun."
          );
          announce(
            isEn
              ? "Failed to save preferences to server."
              : "Gagal menyimpan pengaturan ke server.",
            "assertive"
          );
          return;
        }
      }

      toast.success(t("prefSavedSuccess"));
      announce(
        isEn
          ? "Accessibility preferences successfully saved."
          : "Pengaturan aksesibilitas berhasil disimpan.",
        "polite"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 font-sans">
      {/* Live Preview Panel */}
      <Panel
        id="pref-preview"
        title={t("prefPreviewTitle")}
        description={t("prefPreviewDesc")}
      >
        <div
          className={cn(
            "rounded-2xl border border-border px-3.5 py-3 transition-colors sm:px-4 sm:py-3.5",
            store.readingSurface === "warm"
              ? "bg-[#faf6ee] text-[#1c1d1b] dark:bg-[#1a1916] dark:text-[#f4ede0]"
              : "bg-background text-foreground"
          )}
        >
          <div
            className="w-full transition-all"
            style={{
              fontFamily:
                store.readingFont === "atkinson"
                  ? "var(--font-atkinson-hyperlegible), sans-serif"
                  : "var(--font-poppins), sans-serif",
              fontSize: `${store.fontSizePx}px`,
              lineHeight: store.lineHeight,
              letterSpacing: `${store.letterSpacingEm}em`,
            }}
          >
            <p>{t("prefPreviewSample")}</p>
          </div>
        </div>
      </Panel>

      {/* Typography & Spacing */}
      <Panel id="pref-typography" title={t("prefTypographyTitle")}>
        <div className="space-y-5 font-ui">
          <div className="space-y-1.5">
            <Label htmlFor="settings-font">{t("prefFontLabel")}</Label>
            <Select
              value={store.readingFont === "atkinson" ? "atkinson" : "default"}
              onValueChange={(val) => store.setReadingFont(val as ReadingFont)}
            >
              <SelectTrigger
                id="settings-font"
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-xs"
              >
                <SelectValue placeholder={isEn ? "Select typeface" : "Pilih jenis huruf"} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-border bg-popover shadow-md">
                <SelectItem value="default" className="rounded-lg text-sm cursor-pointer">
                  Default
                </SelectItem>
                <SelectItem value="atkinson" className="rounded-lg text-sm cursor-pointer">
                  Atkinson
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Label htmlFor="settings-size">
                  {isEn ? "Font size:" : "Ukuran huruf:"}
                </Label>
                <span className="font-semibold tabular-nums text-primary">
                  {store.fontSizePx} px
                </span>
              </div>
              <Slider
                id="settings-size"
                aria-label={isEn ? "Reading font size in pixels" : "Ukuran huruf pembaca dalam piksel"}
                min={14}
                max={28}
                step={1}
                value={[store.fontSizePx]}
                onValueChange={([val]) => store.setFontSizePx(val)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Label htmlFor="settings-line-height">
                  {isEn ? "Line spacing:" : "Jarak baris:"}
                </Label>
                <span className="font-semibold tabular-nums text-primary">
                  {store.lineHeight}
                </span>
              </div>
              <Slider
                id="settings-line-height"
                aria-label={isEn ? "Line height multiplier" : "Faktor perkalian tinggi baris"}
                min={1.3}
                max={2.4}
                step={0.05}
                value={[store.lineHeight]}
                onValueChange={([val]) => store.setLineHeight(val)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Label htmlFor="settings-spacing">
                  {isEn ? "Letter spacing:" : "Jarak huruf:"}
                </Label>
                <span className="font-semibold tabular-nums text-primary">
                  {store.letterSpacingEm} em
                </span>
              </div>
              <Slider
                id="settings-spacing"
                aria-label={isEn ? "Letter spacing in em units" : "Jarak antar huruf dalam satuan em"}
                min={0}
                max={0.12}
                step={0.01}
                value={[store.letterSpacingEm]}
                onValueChange={([val]) => store.setLetterSpacingEm(val)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-language">
              {isEn ? "Default voice narration language" : "Bahasa bawaan narasi suara"}
            </Label>
            <Select
              value={store.language}
              onValueChange={(val) =>
                store.setLanguage(val === "id" ? "id" : "en")
              }
            >
              <SelectTrigger
                id="settings-language"
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-xs"
              >
                <SelectValue placeholder={isEn ? "Select language" : "Pilih bahasa"} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-border bg-popover shadow-md">
                <SelectItem value="id" className="rounded-lg text-sm cursor-pointer">
                  Bahasa Indonesia (id-ID)
                </SelectItem>
                <SelectItem value="en" className="rounded-lg text-sm cursor-pointer">
                  English (en-US)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Panel>

      {/* Contrast, Audio & Motion */}
      <Panel id="pref-audio" title={t("prefColorMotionTitle")}>
        <div className="space-y-5 font-ui">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Label htmlFor="settings-speed">
                {isEn ? "Speech playback speed:" : "Kecepatan pemutaran suara:"}
              </Label>
              <span className="font-semibold tabular-nums text-primary">
                {store.narrationSpeed}×
              </span>
            </div>
            <Slider
              id="settings-speed"
              aria-label={isEn ? "Text-to-speech playback speed" : "Kecepatan pemutaran text-to-speech"}
              min={0.5}
              max={2.5}
              step={0.1}
              value={[store.narrationSpeed]}
              onValueChange={([val]) => store.setNarrationSpeed(val)}
            />
          </div>

          <div className="space-y-1.5 border-t border-border pt-4">
            <Label htmlFor="settings-language">{t("webLanguage")}</Label>
            <Select
              value={store.language}
              onValueChange={(val) =>
                store.setLanguage(val as "id" | "en")
              }
            >
              <SelectTrigger
                id="settings-language"
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-xs"
              >
                <SelectValue placeholder={isEn ? "Select language" : "Pilih bahasa"} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-border bg-popover shadow-md">
                <SelectItem value="id" className="rounded-lg text-sm cursor-pointer">
                  🇮🇩 Bahasa Indonesia (Default)
                </SelectItem>
                <SelectItem value="en" className="rounded-lg text-sm cursor-pointer">
                  🇬🇧 English
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="font-sans text-xs text-muted-foreground">
              {isEn
                ? "Primary site interface language, navigation labels, and default audio narration."
                : "Bahasa utama antarmuka situs, label navigasi, serta bahasa bawaan pembacaan audio."}
            </p>
          </div>

          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex items-start gap-3.5">
              <Switch
                id="settings-high-contrast"
                checked={store.contrastMode === "high"}
                onCheckedChange={(checked) =>
                  store.setContrastMode(checked ? "high" : "standard")
                }
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <Label htmlFor="settings-high-contrast" className="cursor-pointer font-semibold">
                  {t("highContrast")}
                </Label>
                <p className="font-sans text-xs text-muted-foreground">
                  {isEn
                    ? "Enhances text contrast, panel borders, and keyboard focus indicators."
                    : "Mempertegas kontras teks, batas panel, dan fokus keyboard."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <Switch
                id="settings-warm-surface"
                checked={store.readingSurface === "warm"}
                onCheckedChange={(checked) =>
                  store.setReadingSurface(checked ? "warm" : "default")
                }
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <Label htmlFor="settings-warm-surface" className="cursor-pointer font-semibold">
                  {t("warmSurface")}
                </Label>
                <p className="font-sans text-xs text-muted-foreground">
                  {isEn
                    ? "Reduces glare in light mode to assist reading comfort for dyslexia."
                    : "Mengurangi silau di mode terang untuk membantu kenyamanan disleksia."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <Switch
                id="settings-reduced-motion"
                checked={store.motionPreference === "reduce"}
                onCheckedChange={(checked) =>
                  store.setMotionPreference(checked ? "reduce" : "system")
                }
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <Label htmlFor="settings-reduced-motion" className="cursor-pointer font-semibold">
                  {t("reduceMotion")}
                </Label>
                <p className="font-sans text-xs text-muted-foreground">
                  {isEn
                    ? "Disables UI animations regardless of OS-level preferences."
                    : "Menonaktifkan transisi antarmuka tanpa bergantung pada pengaturan sistem."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Action buttons: grouped on the left */}
      <div className="flex flex-wrap items-center justify-start gap-3 font-ui">
        <Button
          type="submit"
          disabled={saving}
          className="min-h-11 rounded-full px-6 font-semibold"
        >
          {saving ? (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          <span>{saving ? t("loading") : t("prefSaveBtn")}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            store.resetDefaults();
            announce(
              isEn
                ? "Accessibility preferences reset to defaults."
                : "Pengaturan aksesibilitas dikembalikan ke bawaan.",
              "polite"
            );
          }}
          className="min-h-11 rounded-full px-5"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          <span>{t("resetDefaults")}</span>
        </Button>
      </div>
    </form>
  );
}
