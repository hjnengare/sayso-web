export default function VerificationStatusPage() {
  return (
    <main className="min-h-[100dvh] bg-off-white px-4 sm:px-6 lg:px-8 py-10 flex flex-col items-start relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />
      
      <div className="max-w-2xl space-y-4 relative z-10">
        <h1 className="text-2xl font-semibold text-charcoal">Business verification status</h1>
        <p className="text-sm text-charcoal/70">
          This page is still being wired up. Verification status features will be available soon.
        </p>
        <p className="text-sm text-charcoal/60">
          In the meantime, you can continue exploring upcoming business tools from your dashboard.
                          </p>
                        </div>
    </main>
  );
}

