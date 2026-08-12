import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="flex-1 w-full flex flex-col items-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-8">
        <h1 className="text-3xl font-bold text-center">Contact Us</h1>

        <p className="text-muted-foreground leading-relaxed text-center">
          Have a question, suggestion, or need support? We&apos;d love to hear
          from you.
        </p>

        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-6 space-y-3">
            <h2 className="text-lg font-semibold">Email</h2>
            <p className="text-muted-foreground">
              <a
                href="mailto:DreamRiverTechnologies@gmail.com"
                className="text-primary underline"
              >
                DreamRiverTechnologies@gmail.com
              </a>
            </p>
          </div>

          <div className="bg-muted rounded-lg p-6 space-y-3">
            <h2 className="text-lg font-semibold">Phone</h2>
            <p className="text-muted-foreground">
              <a href="tel:+14804426120" className="text-primary underline">
                +1 (480) 442-6120
              </a>
            </p>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            We typically respond within 24-48 hours.
          </p>
        </div>

        <div className="pt-4 text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:underline"
          >
            &larr; Back to journal
          </Link>
        </div>
      </div>
    </div>
  );
}
