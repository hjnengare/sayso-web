interface BusinessRowSkeletonProps {
  title: string;
  cards?: number;
}

const DEFAULT_CARD_COUNT = 4;

export default function BusinessRowSkeleton({ title, cards = DEFAULT_CARD_COUNT }: BusinessRowSkeletonProps) {
  return (
    <section
      className="relative m-0 p-0 w-full"
      aria-label={`${title} loading`}
      aria-busy="true"
      style={{
        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
    >
      <div className="mx-auto w-full max-w-[2000px] relative z-10 px-2">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div className="h-7 w-32 rounded-lg bg-charcoal/5" />
          <div className="h-8 w-24 rounded-full bg-charcoal/5" />
        </div>

        <div className="flex gap-3 items-stretch pt-2">
          {Array.from({ length: cards }).map((_, index) => (
            <div key={index} className="list-none flex">
              <div className="w-[240px] sm:w-[260px] md:w-[280px] h-[320px] rounded-[28px] bg-off-white border border-navbar-bg/5 shadow-sm shadow-navbar-bg/5 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

