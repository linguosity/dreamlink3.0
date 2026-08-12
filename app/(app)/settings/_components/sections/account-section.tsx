"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SectionHead, Field } from "../section-head";

export function AccountSection({ email }: { email: string }) {
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Export failed. Please try again.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dreamriver-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Your data export has been downloaded");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Export failed. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete account. Please try again.");
      }
      toast.success("Your account has been deleted");
      // Full reload so all client auth state is dropped along with the cookies.
      window.location.href = "/";
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to delete account. Please try again.",
      );
      setDeleting(false);
    }
  }

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

      <div className="rounded-[var(--radius-lg)] border bg-card p-6 mt-5 shadow-sm">
        <SectionHead
          title="Your data"
          desc="Download a copy of everything DreamRiver stores for you."
        />
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Export my data</div>
            <div className="text-[12.5px] text-muted-foreground mt-0.5">
              A JSON file with your dreams, analyses, citations, and profile.
            </div>
          </div>
          <Button
            variant="outline"
            type="button"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5" />
            )}
            {exporting ? "Preparing…" : "Export my data"}
          </Button>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-destructive/30 bg-card p-6 mt-5 shadow-sm">
        <SectionHead
          title="Danger zone"
          desc="Deleting your account is immediate and permanent."
        />
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Delete account & data</div>
            <div className="text-[12.5px] text-muted-foreground mt-0.5">
              Permanently removes all dreams, analyses, images, and profile
              data. Any active subscription is canceled.
            </div>
          </div>
          <Button
            variant="outline"
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="text-destructive border-destructive/40 hover:bg-destructive/5"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete account
          </Button>
        </div>
      </div>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open && deleting) return; // don't close mid-deletion
          setDeleteOpen(open);
          if (!open) setConfirmText("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account, every dream and analysis,
              your images, and your profile. If you have an active
              subscription it will be canceled — you won&rsquo;t be charged
              again. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="delete-confirm"
              className="text-[13px] font-medium"
            >
              Type <span className="font-semibold">DELETE</span> to confirm
            </label>
            <Input
              id="delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              disabled={deleting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== "DELETE" || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault(); // keep the dialog open while we work
                void handleDelete();
              }}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete my account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
