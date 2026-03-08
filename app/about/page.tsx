import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="flex-1 w-full flex flex-col items-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-8">
        <h1 className="text-3xl font-bold text-center">About Dreamlink</h1>

        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Dreamlink is an AI-powered dream journal that helps you explore the
          deeper meaning of your dreams through the lens of biblical wisdom.
          Record your dreams and receive personalized insights connecting your
          experiences to scripture.
        </p>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">How It Works</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            When you record a dream, our AI analyzes its themes, symbols, and
            emotions, then draws connections to relevant Bible passages. Each
            entry is stored in your private journal so you can revisit and
            reflect over time.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Privacy</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Your dreams are personal. All entries are private to your account
            and are never shared with other users. Read our{" "}
            <Link href="/privacy" className="text-blue-600 dark:text-blue-400 underline">
              Privacy Policy
            </Link>{" "}
            for full details.
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
