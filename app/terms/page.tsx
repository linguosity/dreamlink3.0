import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="flex-1 w-full flex flex-col items-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-8">
        <h1 className="text-3xl font-bold text-center">Terms of Service</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Last updated: March 2026
        </p>

        <div className="space-y-6 text-gray-600 dark:text-gray-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using DreamRiver (&quot;the Service&quot;), you
              agree to be bound by these Terms of Service. If you do not agree to
              these terms, please do not use the Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              2. Description of Service
            </h2>
            <p>
              DreamRiver is an AI-powered dream journaling and analysis platform
              that provides biblical and spiritual interpretations of dream
              content. The Service uses artificial intelligence to generate
              analysis, imagery, and scripture references based on user-submitted
              dream descriptions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              3. User Accounts
            </h2>
            <p>
              You must create an account to use the Service. You are responsible
              for maintaining the confidentiality of your account credentials and
              for all activities that occur under your account. You agree to
              provide accurate and complete information when creating your
              account and to update your information as needed.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              4. User Content
            </h2>
            <p>
              You retain ownership of the dream descriptions and other content
              you submit to the Service (&quot;User Content&quot;). By
              submitting User Content, you grant DreamRiver a limited license to
              process your content solely for the purpose of providing the
              analysis service. We do not use your User Content for training AI
              models or for any purpose other than delivering the Service to you.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              5. AI-Generated Content Disclaimer
            </h2>
            <p>
              Dream analyses, scripture references, and generated images are
              produced by artificial intelligence and are provided for
              informational and spiritual reflection purposes only. They do not
              constitute professional psychological, medical, or theological
              advice. You should not rely solely on AI-generated interpretations
              for important life decisions. Always consult qualified
              professionals for medical, psychological, or pastoral concerns.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              6. Acceptable Use
            </h2>
            <p>
              You agree not to use the Service to submit content that is illegal,
              harmful, threatening, abusive, harassing, defamatory, or otherwise
              objectionable. You agree not to attempt to circumvent any security
              features, reverse-engineer the Service, or use automated tools to
              access the Service in a manner that exceeds reasonable use.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              7. Subscription &amp; Payments
            </h2>
            <p>
              Certain features of the Service may require a paid subscription.
              Payment terms, including pricing, billing cycles, and cancellation
              policies, are presented at the time of purchase. You may cancel
              your subscription at any time through your account settings.
              Refunds are handled in accordance with applicable law.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              8. Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate your account if you
              violate these Terms. You may delete your account at any time by
              contacting us. Upon termination, your right to use the Service
              ceases and we may delete your data in accordance with our Privacy
              Policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              9. Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by law, DreamRiver and its
              operators shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages arising from your use
              of the Service. The Service is provided &quot;as is&quot; and
              &quot;as available&quot; without warranties of any kind, either
              express or implied.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              10. Changes to Terms
            </h2>
            <p>
              We may update these Terms from time to time. Continued use of the
              Service after changes are posted constitutes your acceptance of the
              revised Terms. We will make reasonable efforts to notify you of
              significant changes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              11. Contact
            </h2>
            <p>
              If you have questions about these Terms, please contact us at{" "}
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
