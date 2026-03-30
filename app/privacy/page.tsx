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
              authentication. If you sign in via Google OAuth, we receive your
              name and email from Google. When you submit a dream entry, we store
              the text you provide along with the AI-generated analysis, images,
              and associated metadata. We do not collect any information beyond
              what you explicitly provide.
            </p>
            <p>
              We automatically collect limited technical data such as your IP
              address, browser type, and device information for the purpose of
              maintaining security and improving the Service. We do not use
              tracking cookies or third-party analytics that profile your
              behavior across other websites.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              How We Use Your Data
            </h2>
            <p>
              Your dream entries are sent to OpenAI for analysis, and the
              generated images are created using FLUX via our API. The results
              are stored in your private account. We do not sell, share, or use
              your dream content for any purpose other than providing the
              analysis service to you. We do not use your content to train AI
              models.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Legal Basis for Processing (GDPR)
            </h2>
            <p>
              If you are located in the European Economic Area (EEA), United
              Kingdom, or Switzerland, we process your personal data on the
              following legal bases: performance of our contract with you (to
              provide the Service), your consent (for optional features), and our
              legitimate interests (to improve the Service and maintain
              security).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Data Storage &amp; Security
            </h2>
            <p>
              Your data is stored securely using Supabase (hosted on AWS) with
              row-level security policies ensuring that only you can access your
              own dream entries. All data is transmitted over HTTPS. We retain
              your data for as long as your account is active. If you delete your
              account, your data will be permanently removed within 30 days.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Third-Party Services
            </h2>
            <p>
              We use the following third-party services to operate DreamRiver:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>Supabase</strong> — authentication and database storage
              </li>
              <li>
                <strong>OpenAI</strong> — dream analysis (text sent via API; not
                used for training)
              </li>
              <li>
                <strong>Replicate (FLUX)</strong> — dream image generation
              </li>
              <li>
                <strong>Vercel</strong> — application hosting
              </li>
              <li>
                <strong>Stripe</strong> — payment processing (we do not store
                your payment card details)
              </li>
              <li>
                <strong>Google</strong> — OAuth sign-in (optional)
              </li>
            </ul>
            <p className="mt-2">
              Each service has its own privacy policy governing how they handle
              data. We encourage you to review their respective policies.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Your Rights
            </h2>
            <p>
              Depending on your location, you may have the following rights
              regarding your personal data:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>Access</strong> — request a copy of the personal data we
                hold about you
              </li>
              <li>
                <strong>Correction</strong> — request that we correct inaccurate
                data
              </li>
              <li>
                <strong>Deletion</strong> — request that we delete your data
                (&quot;right to be forgotten&quot;)
              </li>
              <li>
                <strong>Portability</strong> — request your data in a
                machine-readable format
              </li>
              <li>
                <strong>Restriction</strong> — request that we limit processing
                of your data
              </li>
              <li>
                <strong>Objection</strong> — object to processing based on
                legitimate interests
              </li>
              <li>
                <strong>Withdraw consent</strong> — where processing is based on
                consent, you may withdraw it at any time
              </li>
            </ul>
            <p className="mt-2">
              You can delete any dream entry at any time from within the app. To
              exercise any of these rights or to request full account deletion,
              contact us at{" "}
              <a
                href="mailto:brandon@linguosity.ai"
                className="text-blue-600 dark:text-blue-400 underline"
              >
                brandon@linguosity.ai
              </a>
              . We will respond to requests within 30 days.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              California Privacy Rights (CCPA)
            </h2>
            <p>
              If you are a California resident, you have the right to know what
              personal information we collect, request its deletion, and opt out
              of the sale of personal information. We do not sell your personal
              information. To exercise your California privacy rights, contact us
              at{" "}
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
              Children&apos;s Privacy
            </h2>
            <p>
              DreamRiver is not directed at children under 13. We do not knowingly
              collect personal information from children under 13. If we learn
              that we have collected data from a child under 13, we will take
              steps to delete it promptly.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Data Retention
            </h2>
            <p>
              We retain your personal data and dream entries for as long as your
              account remains active. If you delete individual dream entries,
              they are removed immediately. If you request account deletion, all
              associated data is permanently deleted within 30 days.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              International Data Transfers
            </h2>
            <p>
              Your data may be processed in the United States and other countries
              where our service providers operate. By using the Service, you
              consent to the transfer of your data to these countries. We ensure
              that appropriate safeguards are in place to protect your data in
              accordance with this Privacy Policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Changes to This Policy
            </h2>
            <p>
              We may update this policy from time to time. Any changes will be
              reflected on this page with an updated date. If we make material
              changes, we will make reasonable efforts to notify you via the
              email associated with your account.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Contact
            </h2>
            <p>
              If you have questions about this Privacy Policy or wish to exercise
              your data rights, contact us at{" "}
              <a
                href="mailto:brandon@linguosity.ai"
                className="text-blue-600 dark:text-blue-400 underline"
              >
                brandon@linguosity.ai
              </a>
              .
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
