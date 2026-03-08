import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="flex-1 w-full flex flex-col items-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-8">
        <h1 className="text-3xl font-bold text-center">Contact Us</h1>

        <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-center">
          Have a question, suggestion, or need support? We&apos;d love to hear
          from you.
        </p>

        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-3">
            <h2 className="text-lg font-semibold">Email</h2>
            <p className="text-gray-600 dark:text-gray-300">
              <a
                href="mailto:brandon@linguosity.ai"
                className="text-blue-600 dark:text-blue-400 underline"
              >
                brandon@linguosity.ai
              </a>
            </p>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            We typically respond within 24-48 hours.
          </p>
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
