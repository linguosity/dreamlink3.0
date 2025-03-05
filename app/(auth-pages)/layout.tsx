export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen w-full">
      <div className="max-w-md w-full mx-auto px-5">
        {children}
      </div>
    </div>
  );
}
