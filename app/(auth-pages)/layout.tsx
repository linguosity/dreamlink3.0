export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen w-full">
      <div className="flex flex-col items-center max-w-md w-full mx-auto px-5">
        <div className="mb-8">
          <h1 className="font-blanka text-4xl tracking-wider">Dreamlink</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
