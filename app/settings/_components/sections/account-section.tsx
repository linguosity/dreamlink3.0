"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionHead, Field } from "../section-head";

export function AccountSection({ email }: { email: string }) {
  return (
    <>
      <SectionHead
        eyebrow="Identity"
        title="Account"
        desc="Your sign-in identity and security. Email changes route through support."
      />

      <div className="rounded-[var(--radius-lg)] border bg-card p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field
            label="Email address"
            htmlFor="account-email"
            hint="To change, please contact support."
          >
            <Input id="account-email" defaultValue={email} disabled />
          </Field>
          <Field label="Password" htmlFor="account-password">
            <div className="flex gap-2">
              <Input
                id="account-password"
                type="password"
                defaultValue="••••••••••"
                disabled
              />
              <Link href="/forgot-password">
                <Button variant="outline" type="button">
                  Reset
                </Button>
              </Link>
            </div>
          </Field>
        </div>
        <div className="flex justify-end mt-5 pt-4 border-t border-border">
          <Button type="button" disabled>
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Save changes
          </Button>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-destructive/30 bg-card p-6 mt-5 shadow-sm">
        <SectionHead
          title="Danger zone"
          desc="Account deletion is processed manually within 30 days. Reach out to delete your account."
        />
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Delete account & data</div>
            <div className="text-[12.5px] text-muted-foreground mt-0.5">
              Removes all dreams, analyses, and profile data.
            </div>
          </div>
          <Link href="/contact">
            <Button
              variant="outline"
              type="button"
              className="text-destructive border-destructive/40 hover:bg-destructive/5"
            >
              Request deletion
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
