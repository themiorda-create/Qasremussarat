import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay } from "date-fns";

type DayStatus = "booked" | "partial" | "available";

interface Booking {
  event_date: string;
  event_time: string | null;
}

const AvailabilityCalendar = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("event_date, event_time")
        .eq("status", "confirmed");
      setBookings(data || []);
    })();
  }, []);

  const statusByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    bookings.forEach((b) => {
      const key = b.event_date;
      const slot = (b.event_time || "day").toLowerCase();
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(slot.includes("evening") ? "evening" : "day");
    });
    const out = new Map<string, DayStatus>();
    map.forEach((slots, k) => {
      if (slots.has("day") && slots.has("evening")) out.set(k, "booked");
      else out.set(k, "partial");
    });
    return out;
  }, [bookings]);

  const getStatus = (date: Date): DayStatus =>
    statusByDate.get(format(date, "yyyy-MM-dd")) ?? "available";

  const getFreeSlot = (date: Date): "day" | "evening" => {
    const key = format(date, "yyyy-MM-dd");
    const taken = new Set<string>();
    bookings
      .filter((b) => b.event_date === key)
      .forEach((b) => {
        const s = (b.event_time || "day").toLowerCase();
        taken.add(s.includes("evening") ? "evening" : "day");
      });
    return taken.has("day") && !taken.has("evening") ? "evening" : "day";
  };

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const status = getStatus(date);
    if (status === "booked") return;
    const slot = status === "partial" ? getFreeSlot(date) : "day";
    navigate(`/booking?date=${format(date, "yyyy-MM-dd")}&slot=${slot}`);
  };

  return (
    <section className="py-20 bg-[#F5EFE0]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <p className="text-[#D4AF37] tracking-[0.3em] text-xs uppercase mb-2">Live Availability</p>
          <h2 className="text-4xl md:text-5xl font-bold text-[#0a1628]" style={{ fontFamily: "Georgia, serif" }}>
            Pick your <span className="italic text-[#D4AF37]">perfect day</span>
          </h2>
          <p className="text-[#0a1628]/70 mt-3">Click any green date to start an inquiry instantly.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-[#D4AF37]/20">
            <Calendar
              mode="single"
              onSelect={handleSelect}
              modifiers={{
                booked: (d) => getStatus(d) === "booked",
                partial: (d) => getStatus(d) === "partial",
                available: (d) => getStatus(d) === "available" && d >= new Date(new Date().setHours(0,0,0,0)),
              }}
              modifiersStyles={{
                booked: { backgroundColor: "#dc2626", color: "white", borderRadius: "8px", cursor: "not-allowed" },
                partial: { backgroundColor: "#facc15", color: "#0a1628", borderRadius: "8px" },
                available: { backgroundColor: "#16a34a", color: "white", borderRadius: "8px", fontWeight: 600 },
              }}
              disabled={(d) => d < new Date(new Date().setHours(0,0,0,0)) || getStatus(d) === "booked"}
              className="rounded-md"
            />
          </div>
          <div className="space-y-4 max-w-sm">
            <h3 className="font-semibold text-[#0a1628] text-lg">Legend</h3>
            <LegendRow color="#16a34a" label="🟢 Available — click to inquire instantly" />
            <LegendRow color="#facc15" label="🟡 Partial — only one slot (day/evening) free" />
            <LegendRow color="#dc2626" label="🔴 Fully booked" />
            <p className="text-sm text-[#0a1628]/70 pt-3 border-t border-[#0a1628]/10">
              Updates in real-time as bookings are confirmed by our team.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

const LegendRow = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-3">
    <span className="inline-block h-5 w-5 rounded" style={{ background: color }} />
    <span className="text-[#0a1628]">{label}</span>
  </div>
);

export default AvailabilityCalendar;
