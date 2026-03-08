import Link from "next/link";

export default function HelpPage() {
  return (
    <div className="flex-1 w-full flex flex-col items-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-8">
        <h1 className="text-3xl font-bold text-center">Help Center</h1>

        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Recording a Dream</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Type your dream into the input box on the main page and press
              submit. Dreamlink will analyze your dream and return biblical
              insights within a few seconds.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Understanding Your Analysis</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Each analysis includes a summary of your dream&apos;s themes, relevant
              Bible verses with full text, and a personalized reflection. Tap on
              any dream card to view the full analysis.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Managing Your Journal</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              You can delete any dream entry from your journal. Visit the
              Settings page to update your profile preferences, including your
              preferred Bible version and reading level.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Need More Help?</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              If you have questions or run into issues, reach out through our{" "}
              <Link href="/contact" className="text-blue-600 dark:text-blue-400 underline">
                Contact page
              </Link>
              .
            </p>
          </div>
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
