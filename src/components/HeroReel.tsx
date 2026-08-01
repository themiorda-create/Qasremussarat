import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import heroVenue from "@/assets/hero-venue.jpg";
import marqueeOutdoor from "@/assets/marquee-outdoor.jpg";
import ballroomElegant from "@/assets/ballroom-elegant.jpg";
import ceremonySetup from "@/assets/ceremony-setup.jpg";

const reel = [
  { src: heroVenue, label: "Walima" },
  { src: marqueeOutdoor, label: "Mehndi" },
  { src: ballroomElegant, label: "Baraat" },
  { src: ceremonySetup, label: "Corporate Dinners" },
];

// Cinematic free-to-use wedding/venue clip (Mixkit CDN)
const HERO_VIDEO =
  "https://assets.mixkit.co/videos/preview/mixkit-bride-and-groom-after-the-wedding-ceremony-32809-large.mp4";

const HeroReel = () => {
  const [idx, setIdx] = useState(0);
  const [videoOk, setVideoOk] = useState(true);
  const [availableCount, setAvailableCount] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % reel.length), 4500);
    return () => clearInterval(t);
  }, []);

  // Live availability for the current month
  useEffect(() => {
    (async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const start = format(new Date(year, month, 1), "yyyy-MM-dd");
      const end = format(new Date(year, month + 1, 0), "yyyy-MM-dd");
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const { data } = await supabase
        .from("bookings")
        .select("event_date, event_time")
        .eq("status", "confirmed")
        .gte("event_date", start)
        .lte("event_date", end);

      const slots = new Map<string, Set<string>>();
      (data || []).forEach((b: any) => {
        const slot = (b.event_time || "day").toLowerCase().includes("evening") ? "evening" : "day";
        if (!slots.has(b.event_date)) slots.set(b.event_date, new Set());
        slots.get(b.event_date)!.add(slot);
      });
      let fullyBooked = 0;
      slots.forEach((s) => {
        if (s.has("day") && s.has("evening")) fullyBooked++;
      });
      // Subtract past days that already passed in the current month
      const today = now.getDate();
      const remainingDays = daysInMonth - today + 1;
      const open = Math.max(0, remainingDays - fullyBooked);
      setAvailableCount(open);
    })();
  }, []);

  const monthLabel = format(new Date(), "MMMM");

  return (
    <section className="relative h-[92vh] flex items-center justify-center overflow-hidden bg-[#0a1628]">
      {/* Cinematic MP4 background */}
      {videoOk && (
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={heroVenue}
          aria-label="Cinematic reel of Qasr-e-Mussarat Marquee showcasing Walima, Mehndi, and Baraat setups"
          onError={() => setVideoOk(false)}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
      )}

      {/* Image reel fallback (visible when video fails or below it as backup texture) */}
      {!videoOk &&
        reel.map((r, i) => (
          <div
            key={r.src}
            role="img"
            aria-label={`${r.label} setup at Qasr-e-Mussarat Marquee`}
            className="absolute inset-0 transition-opacity duration-[1800ms]"
            style={{ opacity: i === idx ? 1 : 0 }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center ken-burns"
              style={{ backgroundImage: `url(${r.src})` }}
            />
          </div>
        ))}

      {/* Deep navy + ivory overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628]/75 via-[#0a1628]/55 to-[#0a1628]/95" />

      {/* Monogram animation */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
        <svg width="92" height="92" viewBox="0 0 100 100" className="drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#D4AF37" strokeWidth="1.5" className="monogram-path" />
          <text
            x="50" y="62" textAnchor="middle"
            fontFamily="Georgia, serif" fontSize="38" fontWeight="bold"
            fill="none" stroke="#F5EFE0" strokeWidth="1.2"
            className="monogram-path"
          >QM</text>
        </svg>
      </div>

      {/* Live availability badge — real month + live count */}
      <div className="absolute top-28 right-6 z-20 animate-fade-in">
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#0a1628]/85 backdrop-blur-md border border-[#D4AF37]/40 text-[#F5EFE0] shadow-xl">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-sm font-medium">
            {availableCount === null
              ? `Loading availability…`
              : availableCount > 0
              ? `${availableCount} dates available in ${monthLabel}`
              : `${monthLabel} is fully booked`}
          </span>
        </div>
      </div>

      {/* Reel label chip */}
      <div className="absolute bottom-8 left-6 z-20">
        <div className="px-3 py-1.5 rounded-md bg-black/40 border border-[#D4AF37]/30 text-[#F5EFE0] text-xs tracking-[0.2em] uppercase">
          ● Now Showing — Cinematic Reel
        </div>
      </div>

      {/* Center content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto animate-slide-up-hero">
        <p className="text-[#D4AF37] tracking-[0.4em] text-xs md:text-sm uppercase mb-4">
          Qasr-e-Mussarat • Haroonabad
        </p>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-[#F5EFE0] mb-6 leading-[1.05]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          Where Royal
          <span className="block italic font-light text-[#D4AF37]">moments unfold</span>
        </h1>
        <p className="text-lg md:text-xl text-[#F5EFE0]/85 max-w-2xl mx-auto mb-10">
          Mehndi · Baraat · Walima · Corporate dinners — staged in our flagship marquee for up to 1,000 guests.
        </p>

        <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
          <Link to="/booking">
            <div className="relative inline-block rounded-full pulse-gold">
              <Button
                size="xl"
                className="rounded-full bg-[#D4AF37] hover:bg-[#c19b2e] text-[#0a1628] font-bold text-lg px-10 border-0 shadow-2xl"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Book Your Date
              </Button>
            </div>
          </Link>
          <Link to="/venues">
            <Button
              variant="outline" size="xl"
              className="rounded-full bg-transparent border-2 border-[#F5EFE0]/70 text-[#F5EFE0] hover:bg-[#F5EFE0] hover:text-[#0a1628]"
            >
              Explore Venues
            </Button>
          </Link>
        </div>

        <div className="mt-10 flex items-center justify-center gap-6 text-[#F5EFE0]/70 text-xs md:text-sm">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#D4AF37]" /> 500+ events hosted</span>
          <span className="hidden md:inline">•</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#D4AF37]" /> 5★ rated</span>
          <span className="hidden md:inline">•</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#D4AF37]" /> Up to 1000 guests</span>
        </div>
      </div>
    </section>
  );
};

export default HeroReel;
