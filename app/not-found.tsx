import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center space-y-6 max-w-lg">
        {/* Dreamy river icon */}
        <div className="text-6xl" aria-hidden="true">
          🌊
        </div>

        <div className="space-y-2">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-xl font-semibold text-foreground">
            This dream drifted away
          </h2>
        </div>

        <p className="text-muted-foreground leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist, or it may have
          flowed downstream. Let&apos;s get you back on course.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
          >
            Back to my dreams
          </Link>
          <Link
            href="/landing"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-xl border border-border text-foreground hover:bg-accent transition-colors font-medium"
          >
            Learn about DreamRiver
          </Link>
        </div>
      </div>
    </div>
  );
}
