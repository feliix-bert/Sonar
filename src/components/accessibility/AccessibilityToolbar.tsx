"use client";

import { Globe, RotateCcw, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  useAccessibilityStore,
  type ReadingFont,
} from "@/stores/accessibility-store";
import { useLiveAnnouncer } from "@/components/accessibility/LiveAnnouncer";
import { useTranslation } from "@/lib/i18n/use-translation";

export function AccessibilityToolbar({ compact = false }: { compact?: boolean }) {
  const store = useAccessibilityStore();
  const { announce } = useLiveAnnouncer();
  const { t, isEn } = useTranslation();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={compact ? "ghost" : "outline"}
          size={compact ? "icon" : "sm"}
          aria-label={t("readingDisplay")}
          className={compact ? "text-muted-foreground hover:text-foreground" : undefined}
        >
          <Type className="size-4" aria-hidden="true" />
          {compact ? null : <span className="hidden sm:inline">{t("readingDisplay")}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 space-y-4 p-4 font-sans"
        aria-label={t("readingPreferences")}
      >
        <div className="flex items-center justify-between">
          <p className="font-heading text-sm font-semibold">
            {t("readingPreferences")}
          </p>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              store.resetDefaults();
              announce(
                isEn
                  ? "Reading preferences reset to defaults."
                  : "Preferensi membaca dikembalikan ke pengaturan awal."
              );
            }}
          >
            <RotateCcw className="mr-1 size-3.5" aria-hidden="true" />
            {t("resetDefaults")}
          </Button>
        </div>

        {/* Web & Reading Language Selection */}
        <fieldset className="space-y-2 rounded-xl border border-border/80 bg-surface-subtle/50 p-2.5">
          <legend className="flex items-center gap-1.5 px-1 text-xs font-semibold text-foreground">
            <Globe className="size-3.5 text-primary" aria-hidden="true" />
            <span>{t("webLanguage")}</span>
          </legend>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <Button
              size="xs"
              variant={store.language === "id" ? "default" : "outline"}
              aria-pressed={store.language === "id"}
              className="h-8 text-xs font-semibold"
              onClick={() => {
                store.setLanguage("id");
                announce("Bahasa antarmuka diubah ke Bahasa Indonesia.");
              }}
            >
              🇮🇩 Indonesia
            </Button>
            <Button
              size="xs"
              variant={store.language === "en" ? "default" : "outline"}
              aria-pressed={store.language === "en"}
              className="h-8 text-xs font-semibold"
              onClick={() => {
                store.setLanguage("en");
                announce("Interface language changed to English.");
              }}
            >
              🇬🇧 English
            </Button>
          </div>
        </fieldset>

        {/* Font Choice */}
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-muted-foreground">
            {t("readingTypeface")}
          </legend>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "default", label: "Default" },
              { id: "atkinson", label: "Atkinson" },
            ].map((font) => {
              const isSelected =
                font.id === "atkinson"
                  ? store.readingFont === "atkinson"
                  : store.readingFont !== "atkinson";
              return (
                <Button
                  key={font.id}
                  size="xs"
                  variant={isSelected ? "default" : "outline"}
                  aria-pressed={isSelected}
                  onClick={() => {
                    store.setReadingFont(font.id as ReadingFont);
                    announce(
                      isEn
                        ? `Reading font set to ${font.label}.`
                        : `Font pembaca diatur ke ${font.label}.`
                    );
                  }}
                >
                  {font.label}
                </Button>
              );
            })}
          </div>
        </fieldset>

        {/* Font Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <Label htmlFor="pref-font-size">{t("textSize")}</Label>
            <span className="font-medium tabular-nums">{store.fontSizePx}px</span>
          </div>
          <Slider
            id="pref-font-size"
            aria-label={t("textSize")}
            min={14}
            max={28}
            step={1}
            value={[store.fontSizePx]}
            onValueChange={([val]) => store.setFontSizePx(val)}
          />
        </div>

        {/* Line Height */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <Label htmlFor="pref-line-height">{t("lineSpacing")}</Label>
            <span className="font-medium tabular-nums">{store.lineHeight}×</span>
          </div>
          <Slider
            id="pref-line-height"
            aria-label={t("lineSpacing")}
            min={1.4}
            max={2.2}
            step={0.05}
            value={[store.lineHeight]}
            onValueChange={([val]) => store.setLineHeight(val)}
          />
        </div>

        {/* Toggles */}
        <div className="space-y-3 border-t pt-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="pref-high-contrast" className="text-xs">
              {t("highContrast")}
            </Label>
            <Switch
              id="pref-high-contrast"
              checked={store.contrastMode === "high"}
              onCheckedChange={(checked) => {
                store.setContrastMode(checked ? "high" : "standard");
                announce(
                  checked
                    ? isEn
                      ? "High contrast mode enabled."
                      : "Mode kontras tinggi diaktifkan."
                    : isEn
                      ? "Standard contrast mode restored."
                      : "Mode kontras standar dikembalikan."
                );
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="pref-warm-surface" className="text-xs">
              {t("warmSurface")}
            </Label>
            <Switch
              id="pref-warm-surface"
              checked={store.readingSurface === "warm"}
              onCheckedChange={(checked) =>
                store.setReadingSurface(checked ? "warm" : "default")
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="pref-reduced-motion" className="text-xs">
              {t("reduceMotion")}
            </Label>
            <Switch
              id="pref-reduced-motion"
              checked={store.motionPreference === "reduce"}
              onCheckedChange={(checked) =>
                store.setMotionPreference(checked ? "reduce" : "system")
              }
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
