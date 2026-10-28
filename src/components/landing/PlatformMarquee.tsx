const platforms = [
  { name: "Instagram", color: "#E1306C" },
  { name: "TikTok", color: "#25F4EE" },
  { name: "YouTube", color: "#FF0033" },
  { name: "Facebook", color: "#1877F2" },
  { name: "WhatsApp", color: "#25D366" },
  { name: "LinkedIn", color: "#0A66C2" },
  { name: "X", color: "#E5E7EB" },
  { name: "Newsletters", color: "#A79BFF" },
  { name: "Blogs", color: "#5EEAD4" },
];

export default function PlatformMarquee() {
  return (
    <section className="relative bg-black border-y border-white/5 py-10 overflow-hidden">
      <p className="mb-7 px-6 text-center text-sm font-medium text-white/50">
        Ready for every channel your audience uses.
      </p>
      <p className="sr-only">Mindra prepares content for {platforms.map((p) => p.name).join(", ")}.</p>
      <div
        aria-hidden="true"
        className="relative [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
      >
        {/* Two copies side by side; sliding by half the width makes the loop seamless. */}
        <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
          {[...platforms, ...platforms].map((platform, i) => (
            <div key={i} className="flex items-center gap-3 px-8 text-2xl font-medium whitespace-nowrap text-white/60">
              <span className="size-2.5 rounded-full" style={{ background: platform.color }} />
              {platform.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
