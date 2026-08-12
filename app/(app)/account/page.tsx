import { permanentRedirect } from "next/navigation";

/**
 * `/account` was a starter-template page that duplicated `/settings`
 * (account info + plan management) with stale tier names and pricing.
 * Pre-launch hygiene (design-handoff D2): the settings page's Account and
 * Plan sections are the single source of truth now. Permanent (308)
 * redirect keeps any old links and bookmarks working.
 */
export default function AccountRedirect() {
  permanentRedirect("/settings");
}
