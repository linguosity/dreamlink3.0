// app/(fullscreen)/layout.tsx
//
// Pages that own their entire viewport: the marketing landing page (which
// brings its own SiteHeader and footer) and the onboarding flow (which is a
// step wizard, not an app screen). Neither wants the consumer navbar, so
// neither is in app/(app)/.
//
// All this layout provides is the flex column and the #main-content anchor
// the skip link in the root layout targets.

export default function FullscreenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col animate-fade-in">
      <div id="main-content" className="flex-1">
        {children}
      </div>
    </main>
  );
}
