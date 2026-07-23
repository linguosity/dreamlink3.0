"use client";

// One labeled URL input per social platform + Save. Saved to the
// site_settings key 'social_links' via a server action (admin-only). The
// landing footer shows an icon only for platforms with a valid https:// URL,
// so leaving a field blank hides that icon.

import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveSocialLinksAction } from "@/app/admin/actions";
import { SOCIAL_PLATFORMS, isValidSocialUrl } from "@/lib/siteSettings";

const PLACEHOLDERS: Record<string, string> = {
  x: "https://x.com/yourhandle",
  instagram: "https://instagram.com/yourhandle",
  youtube: "https://youtube.com/@yourhandle",
  tiktok: "https://tiktok.com/@yourhandle",
};

export default function SocialLinksForm({
  initial,
}: {
  initial: Record<string, string>;
}) {
  const [values, setValues] = React.useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const { key } of SOCIAL_PLATFORMS) v[key] = initial[key] ?? "";
    return v;
  });
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    // Client-side validation; the server action re-validates before saving.
    for (const { key, label } of SOCIAL_PLATFORMS) {
      const raw = (values[key] ?? "").trim();
      if (raw.length > 0 && !isValidSocialUrl(raw)) {
        toast.error(
          `${label}: enter a full https:// URL (e.g. ${PLACEHOLDERS[key]}) or leave it blank.`,
        );
        return;
      }
    }
    setSaving(true);
    const res = await saveSocialLinksAction(values);
    setSaving(false);
    if ("error" in res) {
      toast.error(res.error);
    } else {
      toast.success("Social links saved. The footer icons update automatically.");
    }
  };

  return (
    <div className="space-y-3">
      {SOCIAL_PLATFORMS.map(({ key, label }) => (
        <div key={key}>
          <label
            htmlFor={`social-url-${key}`}
            className="block text-sm font-medium mb-1"
          >
            {label}
          </label>
          <input
            id={`social-url-${key}`}
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder={PLACEHOLDERS[key]}
            value={values[key]}
            onChange={(e) =>
              setValues((v) => ({ ...v, [key]: e.target.value }))
            }
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Paste the full profile URL. Leave blank to hide the icon.
      </p>
      <div className="flex justify-end">
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
