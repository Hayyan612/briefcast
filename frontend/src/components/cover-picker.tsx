"use client";

import { CoverArt } from "@/components/cover-art";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  COVER_COLORS,
  COVER_ICONS,
  type CoverColor,
  type CoverIcon,
} from "@/lib/cover";
import { cn } from "@/lib/utils";

/** Pick the briefing's cover glyph and color. Empty means "choose from the topic". */
export function CoverPicker({
  topic,
  icon,
  color,
  onChange,
}: {
  topic: string;
  icon: string | null;
  color: string | null;
  onChange: (next: { icon: string | null; color: string | null }) => void;
}) {
  const automatic = !icon && !color;
  return (
    <Field>
      <div className="flex items-center justify-between">
        <FieldLabel>Cover</FieldLabel>
        {!automatic ? (
          <Button
            type="button"
            variant="link"
            onClick={() => onChange({ icon: null, color: null })}
          >
            Use automatic
          </Button>
        ) : null}
      </div>
      <div className="flex gap-4">
        <CoverArt
          topic={topic || "Briefcast"}
          icon={icon}
          color={color}
          className="size-16 rounded-[14px]"
        />
        <div className="grid min-w-0 flex-1 gap-3">
          <ToggleGroup
            aria-label="Cover icon"
            value={icon ? [icon] : []}
            onValueChange={(v) =>
              onChange({ icon: (v as string[])[0] ?? null, color })
            }
            variant="outline"
            className="flex flex-wrap gap-1"
          >
            {(Object.keys(COVER_ICONS) as CoverIcon[]).map((key) => {
              const { Icon, label } = COVER_ICONS[key];
              return (
                <ToggleGroupItem
                  key={key}
                  value={key}
                  aria-label={label}
                  title={label}
                  className="size-8 p-0 aria-pressed:border-mac-accent aria-pressed:bg-mac-accent/10 aria-pressed:text-mac-accent"
                >
                  <Icon className="size-4" />
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
          <ToggleGroup
            aria-label="Cover color"
            value={color ? [color] : []}
            onValueChange={(v) =>
              onChange({ icon, color: (v as string[])[0] ?? null })
            }
            className="flex flex-wrap gap-1.5"
          >
            {(Object.keys(COVER_COLORS) as CoverColor[]).map((key) => (
              <ToggleGroupItem
                key={key}
                value={key}
                aria-label={key}
                title={key}
                className={cn(
                  "size-6 min-w-0 rounded-full p-0 ring-offset-2 ring-offset-background aria-pressed:ring-2 aria-pressed:ring-mac-accent",
                )}
                style={{ backgroundColor: COVER_COLORS[key] }}
              />
            ))}
          </ToggleGroup>
        </div>
      </div>
      <FieldDescription>
        {automatic
          ? "Chosen from your topic. Pick an icon or color to set your own."
          : "Used in the app and in podcast apps."}
      </FieldDescription>
    </Field>
  );
}
