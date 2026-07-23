import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSocialLinks } from "@/lib/siteSettings";
import SocialLinksForm from "./SocialLinksForm";

// Admin editor for the landing-footer social icons. Each platform with a
// saved https:// profile URL shows its icon in the footer; blank = hidden.
export default async function SocialLinksCard() {
  const links = await getSocialLinks();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Social links</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Social icons in the landing-page footer. Paste the full profile URL.
          Leave blank to hide the icon.
        </p>
      </CardHeader>
      <CardContent>
        <SocialLinksForm initial={links} />
      </CardContent>
    </Card>
  );
}
