import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2, Eye, Bot } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import BookingDetailsSheet from "./BookingDetailsSheet";

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  event_date: string;
  package_type: string;
  guests: number;
  total_price: number;
  status: string;
  created_at: string;
  message?: string;
  menu_items?: any;
  venues?: { name: string };
  event_time?: string;
  event_type?: string;
  billing_type?: string;
}

interface BookingsTableProps {
  highlightBookingId?: string | null;
}

const BookingsTable = ({ highlightBookingId }: BookingsTableProps) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    if (highlightBookingId && bookings.length > 0) {
      const booking = bookings.find(b => b.id === highlightBookingId);
      if (booking) {
        setSelectedBooking(booking);
        setSheetOpen(true);
      }
    }
  }, [highlightBookingId, bookings]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          venues (name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  const deleteBooking = async (id: string) => {
    try {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
      toast.success("Booking deleted successfully");
      fetchBookings();
    } catch (error: any) {
      toast.error("Failed to delete booking");
    }
  };

  const generateBotBooking = async () => {
    const firstNames = ["Ahmed", "Sara", "Bilal", "Ayesha", "Hamza", "Fatima", "Usman", "Zara", "Imran", "Hira"];
    const lastNames = ["Khan", "Ali", "Sheikh", "Malik", "Butt", "Raza", "Iqbal", "Hussain"];
    const eventTypes = ["wedding", "mehndi", "walima", "corporate", "birthday", "engagement"];
    const packages = ["Silver", "Gold", "Platinum"];
    const slots = ["day", "evening"];
    const billing = ["per_head", "service", "service_cooking"];
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

    const name = `${pick(firstNames)} ${pick(lastNames)}`;
    const guests = 100 + Math.floor(Math.random() * 600);
    const futureDays = 1 + Math.floor(Math.random() * 180);
    const d = new Date();
    d.setDate(d.getDate() + futureDays);
    const dateStr = d.toISOString().slice(0, 10);

    // Pick a random venue if available
    const { data: venues } = await supabase.from("venues").select("id, price_per_day").limit(50);
    const venue = venues && venues.length ? venues[Math.floor(Math.random() * venues.length)] : null;
    const total = (venue?.price_per_day || 50000) + guests * (800 + Math.floor(Math.random() * 1500));

    const { error } = await supabase.from("bookings").insert({
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}.${Math.floor(Math.random() * 9999)}@bot.test`,
      phone: `+9230${Math.floor(10000000 + Math.random() * 89999999)}`,
      event_date: dateStr,
      venue_id: venue?.id || null,
      package_type: pick(packages),
      guests,
      total_price: total,
      event_type: pick(eventTypes),
      event_time: pick(slots),
      billing_type: pick(billing),
      status: "pending",
      message: "🤖 Auto-generated test booking",
    });

    if (error) {
      toast.error("Bot booking failed: " + error.message);
    } else {
      toast.success(`🤖 Bot booking created for ${name}`);
      fetchBookings();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="glass-effect rounded-lg p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold">All Bookings</h2>
        <Button onClick={generateBotBooking} variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
          <Bot className="h-4 w-4 mr-2" />
          Generate Random Bot Booking
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Event Date</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Guests</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted On</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">{booking.name}</TableCell>
                <TableCell>{booking.email}</TableCell>
                <TableCell>{booking.phone}</TableCell>
                <TableCell>{format(new Date(booking.event_date), "MMM dd, yyyy")}</TableCell>
                <TableCell>{booking.venues?.name || "N/A"}</TableCell>
                <TableCell>{booking.package_type}</TableCell>
                <TableCell>{booking.guests}</TableCell>
                <TableCell>Rs. {booking.total_price?.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={booking.status === "pending" ? "secondary" : "default"}>
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(booking.created_at), "MMM dd, yyyy")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setSheetOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteBooking(booking.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <BookingDetailsSheet
        booking={selectedBooking}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdate={fetchBookings}
      />
    </div>
  );
};

export default BookingsTable;
