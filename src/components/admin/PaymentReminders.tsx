import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Calendar, Loader2, Clock, Bell, DollarSign } from "lucide-react";
import { format, differenceInHours, differenceInDays, isWithinInterval, addHours } from "date-fns";

interface BookingWithBalance {
  id: string;
  name: string;
  phone: string;
  event_date: string;
  total_price: number;
  paid_amount: number;
  remaining: number;
  days_until_event: number;
}

interface PendingBooking {
  id: string;
  name: string;
  phone: string;
  email: string;
  event_date: string;
  created_at: string;
  hours_pending: number;
  package_type: string;
  guests: number;
}

interface UpcomingEvent {
  id: string;
  name: string;
  phone: string;
  event_date: string;
  package_type: string;
  guests: number;
  status: string;
  hours_until_event: number;
}

const PaymentReminders = () => {
  const [bookingsWithBalance, setBookingsWithBalance] = useState<BookingWithBalance[]>([]);
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllReminders();
  }, []);

  const fetchAllReminders = async () => {
    try {
      await Promise.all([
        fetchBookingsWithBalance(),
        fetchPendingBookings(),
        fetchUpcomingEvents(),
      ]);
    } catch (error) {
      console.error("Failed to fetch reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingsWithBalance = async () => {
    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, name, phone, event_date, total_price, status")
      .in("status", ["confirmed"])
      .gte("event_date", new Date().toISOString().split("T")[0])
      .order("event_date", { ascending: true });

    if (bookingsError) throw bookingsError;

    const { data: paymentsData, error: paymentsError } = await supabase
      .from("booking_payments")
      .select("booking_id, amount, payment_type");

    if (paymentsError) throw paymentsError;

    const bookingsWithBalance: BookingWithBalance[] = (bookingsData || [])
      .map((booking) => {
        const bookingPayments = (paymentsData || []).filter(
          (p) => p.booking_id === booking.id
        );
        const credits = bookingPayments
          .filter((p) => p.payment_type === "credit")
          .reduce((sum, p) => sum + Number(p.amount), 0);
        const debits = bookingPayments
          .filter((p) => p.payment_type === "debit")
          .reduce((sum, p) => sum + Number(p.amount), 0);
        const paid = credits - debits;
        const remaining = (booking.total_price || 0) - paid;
        const daysUntil = differenceInDays(new Date(booking.event_date), new Date());

        return {
          id: booking.id,
          name: booking.name,
          phone: booking.phone,
          event_date: booking.event_date,
          total_price: booking.total_price || 0,
          paid_amount: paid,
          remaining: remaining,
          days_until_event: daysUntil,
        };
      })
      .filter((b) => b.remaining > 0)
      .sort((a, b) => a.days_until_event - b.days_until_event);

    setBookingsWithBalance(bookingsWithBalance);
  };

  const fetchPendingBookings = async () => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data, error } = await supabase
      .from("bookings")
      .select("id, name, phone, email, event_date, created_at, package_type, guests")
      .eq("status", "pending")
      .gte("created_at", twentyFourHoursAgo.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    const pending: PendingBooking[] = (data || []).map((booking) => ({
      ...booking,
      hours_pending: differenceInHours(new Date(), new Date(booking.created_at)),
    }));

    setPendingBookings(pending);
  };

  const fetchUpcomingEvents = async () => {
    const now = new Date();
    const next24Hours = addHours(now, 24);

    const { data, error } = await supabase
      .from("bookings")
      .select("id, name, phone, event_date, package_type, guests, status")
      .eq("status", "confirmed")
      .gte("event_date", now.toISOString().split("T")[0])
      .lte("event_date", next24Hours.toISOString().split("T")[0])
      .order("event_date", { ascending: true });

    if (error) throw error;

    const upcoming: UpcomingEvent[] = (data || []).map((booking) => {
      const eventDate = new Date(booking.event_date);
      return {
        ...booking,
        hours_until_event: differenceInHours(eventDate, now),
      };
    });

    setUpcomingEvents(upcoming);
  };

  const getUrgencyBadge = (days: number) => {
    if (days <= 3) return <Badge variant="destructive">Urgent - {days} days</Badge>;
    if (days <= 7) return <Badge className="bg-orange-500">Soon - {days} days</Badge>;
    return <Badge variant="secondary">{days} days left</Badge>;
  };

  const totalReminders = pendingBookings.length + upcomingEvents.length + bookingsWithBalance.length;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (totalReminders === 0) {
    return (
      <Card className="bg-green-500/10 border-green-500/30">
        <CardContent className="py-6 text-center">
          <p className="text-green-600 font-medium">No reminders at this time!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-effect">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-orange-500" />
          Reminders ({totalReminders})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="text-xs md:text-sm">
              <Clock className="h-4 w-4 mr-1" />
              Pending ({pendingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="text-xs md:text-sm">
              <Calendar className="h-4 w-4 mr-1" />
              Today ({upcomingEvents.length})
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs md:text-sm">
              <DollarSign className="h-4 w-4 mr-1" />
              Payments ({bookingsWithBalance.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {pendingBookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No pending bookings in last 24 hours</p>
            ) : (
              <div className="space-y-3">
                {pendingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{booking.name}</p>
                        <Badge className="bg-yellow-500">{booking.hours_pending}h ago</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Event: {format(new Date(booking.event_date), "MMM dd, yyyy")}
                        </span>
                        <span>{booking.guests} guests</span>
                        <span>{booking.package_type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{booking.phone} • {booking.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-4">
            {upcomingEvents.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No events in the next 24 hours</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{event.name}</p>
                        <Badge className="bg-blue-500">
                          {event.hours_until_event <= 0 ? "Today!" : `In ${event.hours_until_event}h`}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(event.event_date), "MMM dd, yyyy")}
                        </span>
                        <span>{event.guests} guests</span>
                        <span>{event.package_type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{event.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            {bookingsWithBalance.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">All confirmed bookings are fully paid!</p>
            ) : (
              <div className="space-y-3">
                {bookingsWithBalance.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{booking.name}</p>
                        {getUrgencyBadge(booking.days_until_event)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(booking.event_date), "MMM dd, yyyy")}
                        </span>
                        <span>{booking.phone}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Remaining</p>
                      <p className="font-bold text-destructive">
                        Rs. {booking.remaining.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PaymentReminders;
