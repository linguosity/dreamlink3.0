import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="flex-1 w-full flex flex-col items-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-8">
        <h1 className="text-3xl font-bold text-center">Privacy Policy</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Last updated: March 2026
        </p>

        <div className="space-y-6 text-gray-600 dark:text-gray-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Information We Collect
            </h2>
            <p>
              When you create an account, we collect your email address for
              authentication. When you submit a dream entry, we store the text
              you provide along with the AI-generated analysis. We do not
              collect any information beyond what you explicitly provide.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              How We Use Your Data
            </h2>
            <p>
              Your dream entries are sent to OpenAI for analysis and the results
              are stored in your private account. We do not sell, share, or use
              your dream content for any purpose other than providing the
              analysis service to you.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Data Storage &amp; Security
            </h2>
            <p>
              Your data is stored securely using Supabase with row-level
              security policies ensuring that only you can access your own dream
              entries. All data is transmitted over HTTPS.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Third-Party Services
            </h2>
            <p>
              We use the following third-party services: Supabase for
              authentication and data storage, OpenAI for dream analysis, and
              Vercel for hosting. Each service has its own privacy policy
              governing how they handle data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Your Rights
            </h2>
            <p>
              You can delete any dream entry at any time. If you wish to delete
              your entire account and all associated data, please contact us at{" "}
              <a
                href="mailto:brandon@linguosity.ai"
                className="text-blue-600 dark:text-blue-400 underline"
              >
                brandon@linguosity.ai
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Changes to This Policy
            </h2>
            <p>
              We may update this policy from time to time. Any changes will be
              reflected on this page with an updated date.
            </p>
          </section>
        </div>

        <div className="pt-4 text-center">
          <Link
            href="/"
            className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
          >
            &larr; Back to journal
          </Link>
        </div>
      </div>
    </div>
  );
}
