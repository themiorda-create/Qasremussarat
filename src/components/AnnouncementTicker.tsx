import { Sparkles, CalendarCheck, Phone, Tag } from "lucide-react";

const items = [
  { icon: <Sparkles className="h-3.5 w-3.5" />, text: "Winter Wedding Special — 15% off Mehndi + Walima combos" },
  { icon: <CalendarCheck className="h-3.5 w-3.5" />, text: "Live availability updated every minute" },
  { icon: <Tag className="h-3.5 w-3.5" />, text: "Corporate dinner packages from PKR 1,200/head" },
  { icon: <Phone className="h-3.5 w-3.5" />, text: "Talk to a planner: +92 300 0000000" },
  { icon: <Sparkles className="h-3.5 w-3.5" />, text: "500+ events hosted • Rated 5★ by families across Punjab" },
];

const AnnouncementTicker = () => {
  const loop = [...items, ...items];
  return (
    <div className="bg-[#0a1628] text-[#F5EFE0] border-b border-[#D4AF37]/30 overflow-hidden">
      <div className="ticker-track flex gap-12 py-2 whitespace-nowrap will-change-transform">
        {loop.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-xs tracking-wide">
            <span className="text-[#D4AF37]">{it.icon}</span>
            <span>{it.text}</span>
            <span className="text-[#D4AF37]/40 ml-6">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default AnnouncementTicker;
