import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Users, CalendarDays, Eye } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { toast } from "sonner";

interface Booking {
  id: string;
  name: string;
  event_date: string;
  guests: number;
  status: string;
  venues?: { name: string };
  package_type: string;
  total_price: number;
}

interface BookingCalendarProps {
  onSelectBooking?: (bookingId: string) => void;
}

const MAX_CAPACITY = 1000;

const BookingCalendar = ({ onSelectBooking }: BookingCalendarProps) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchConfirmedBookings();
  }, []);

  const fetchConfirmedBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`*, venues (name)`)
        .eq("status", "confirmed")
        .order("event_date", { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      toast.error("Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  // Get dates with bookings
  const bookedDates = bookings.reduce((acc, booking) => {
    const dateStr = booking.event_date;
    if (!acc[dateStr]) {
      acc[dateStr] = { count: 0, totalGuests: 0 };
    }
    acc[dateStr].count += 1;
    acc[dateStr].totalGuests += booking.guests;
    return acc;
  }, {} as Record<string, { count: number; totalGuests: number }>);

  // Get bookings for selected date
  const selectedDateBookings = selectedDate
    ? bookings.filter((b) => isSameDay(new Date(b.event_date), selectedDate))
    : [];

  const selectedDateCapacity = selectedDateBookings.reduce((sum, b) => sum + b.guests, 0);
  const remainingCapacity = MAX_CAPACITY - selectedDateCapacity;

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const dateBookings = bookings.filter((b) => isSameDay(new Date(b.event_date), date));
      if (dateBookings.length > 0) {
        setDialogOpen(true);
      }
    }
  };

  const handleViewBooking = (bookingId: string) => {
    setDialogOpen(false);
    if (onSelectBooking) {
      onSelectBooking(bookingId);
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Booking Calendar
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Shows confirmed bookings. Maximum capacity: {MAX_CAPACITY} guests per day.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="rounded-md border"
                modifiers={{
                  booked: Object.keys(bookedDates).map((d) => new Date(d)),
                }}
                modifiersStyles={{
                  booked: {
                    position: "relative",
                  },
                }}
                components={{
                  DayContent: ({ date }) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    const bookingInfo = bookedDates[dateStr];
                    const isFull = bookingInfo && bookingInfo.totalGuests >= MAX_CAPACITY;

                    return (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <span>{date.getDate()}</span>
                        {bookingInfo && (
                          <span
                            className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                              isFull ? "bg-red-500" : "bg-green-500"
                            }`}
                          />
                        )}
                      </div>
                    );
                  },
                }}
              />
            </div>

            {selectedDate && (
              <div className="flex-1 space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">
                    {format(selectedDate, "MMMM dd, yyyy")}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground">Total Guests</p>
                      <p className="text-xl font-bold">{selectedDateCapacity}</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className={`text-xl font-bold ${remainingCapacity < 100 ? "text-red-500" : "text-green-500"}`}>
                        {remainingCapacity}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedDateBookings.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="font-medium">Confirmed Bookings ({selectedDateBookings.length})</h4>
                    {selectedDateBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-3 border rounded-lg flex items-center justify-between hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleViewBooking(booking.id)}
                      >
                        <div>
                          <p className="font-medium">{booking.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.venues?.name} • {booking.guests} guests
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No confirmed bookings for this date
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span>Available capacity</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span>Full capacity</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Bookings for {selectedDate && format(selectedDate, "MMMM dd, yyyy")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedDateBookings.map((booking) => (
              <div
                key={booking.id}
                className="p-4 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{booking.name}</p>
                    <p className="text-sm text-muted-foreground">{booking.venues?.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">
                        <Users className="h-3 w-3 mr-1" />
                        {booking.guests} guests
                      </Badge>
                      <Badge>{booking.package_type}</Badge>
                    </div>
                    <p className="text-sm font-medium mt-2">
                      Rs. {booking.total_price?.toLocaleString()}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => handleViewBooking(booking.id)}>
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingCalendar;
