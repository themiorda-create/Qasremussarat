import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Eye, CalendarDays, Users, Package, LogOut, CalendarPlus, MessageCircle, Star, CheckSquare, Download, ShoppingBag } from "lucide-react";
import { format, isFuture } from "date-fns";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useBookingNotifications } from "@/hooks/useBookingNotifications";
import EventCountdown from "@/components/EventCountdown";
import EventChecklist from "@/components/EventChecklist";
import BookingChat from "@/components/BookingChat";
import ReviewForm from "@/components/ReviewForm";

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
  event_type?: string;
  venues?: { name: string };
  hasReview?: boolean;
}

interface Purchase {
  id: string;
  created_at: string;
  digital_products: {
    name: string;
    category: string;
    download_url: string | null;
    preview_image_url: string | null;
  };
}

const MyBookings = () => {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [mainTab, setMainTab] = useState("bookings");
  const navigate = useNavigate();

  // Enable real-time notifications
  useBookingNotifications(user);

  const fetchBookings = useCallback(async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`*, venues (name)`)
        .or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Check which bookings have reviews
      const bookingIds = data?.map(b => b.id) || [];
      const { data: reviews } = await supabase
        .from("reviews")
        .select("booking_id")
        .in("booking_id", bookingIds);
      
      const reviewedBookingIds = new Set(reviews?.map(r => r.booking_id) || []);
      
      setBookings(data?.map(b => ({
        ...b,
        hasReview: reviewedBookingIds.has(b.id)
      })) || []);
    } catch (error: any) {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPurchases = async (currentUser: User) => {
    const { data } = await supabase
      .from("digital_product_purchases")
      .select("id, created_at, digital_products(name, category, download_url, preview_image_url)")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });
    setPurchases((data as any) || []);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/customer-auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/customer-auth");
      } else {
        fetchBookings(session.user);
        fetchPurchases(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, fetchBookings]);

  // Subscribe to real-time updates to refresh the list
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('my-bookings-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          // Refresh bookings list when any update happens
          fetchBookings(user);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchBookings]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/customer-auth");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      case "completed":
        return "bg-blue-500";
      default:
        return "bg-yellow-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Awaiting Confirmation";
      case "confirmed":
        return "Confirmed";
      case "cancelled":
        return "Cancelled";
      case "completed":
        return "Completed";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Header */}
      <section className="pt-24 pb-12 bg-gradient-primary text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">My Bookings</h1>
              <p className="text-lg opacity-90">
                Welcome back, {user?.user_metadata?.full_name || user?.email}
              </p>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="w-fit text-white border-white hover:bg-white/20">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </section>

      <section className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Tabs value={mainTab} onValueChange={setMainTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="bookings">My Bookings</TabsTrigger>
              <TabsTrigger value="downloads">
                <Download className="h-4 w-4 mr-1" />
                My Downloads
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bookings">
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarPlus className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Bookings Yet</h3>
                <p className="text-muted-foreground mb-6">
                  You haven't made any bookings yet. Start planning your event today!
                </p>
                <Link to="/booking">
                  <Button variant="gold">Make a Booking</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Upcoming Event Countdown */}
              {bookings.filter(b => isFuture(new Date(b.event_date)) && b.status === "confirmed").length > 0 && (
                <div className="space-y-4">
                  {bookings
                    .filter(b => isFuture(new Date(b.event_date)) && b.status === "confirmed")
                    .slice(0, 1)
                    .map(booking => (
                      <EventCountdown
                        key={booking.id}
                        eventDate={booking.event_date}
                        eventName={booking.event_type ? `${booking.event_type.charAt(0).toUpperCase()}${booking.event_type.slice(1)}` : "Your Event"}
                      />
                    ))}
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Your Bookings ({bookings.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="font-semibold text-lg">{booking.name}</h3>
                              <Badge className={getStatusColor(booking.status)}>
                                {getStatusText(booking.status)}
                              </Badge>
                              {booking.event_type && (
                                <Badge variant="outline" className="capitalize">
                                  {booking.event_type}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-4 w-4" />
                                <strong>Event:</strong> {format(new Date(booking.event_date), "MMM dd, yyyy")}
                              </span>
                              <span className="flex items-center gap-1">
                                <CalendarPlus className="h-4 w-4" />
                                <strong>Booked:</strong> {format(new Date(booking.created_at), "MMM dd, yyyy")}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {booking.guests} guests
                              </span>
                              <span className="flex items-center gap-1">
                                <Package className="h-4 w-4" />
                                {booking.package_type}
                              </span>
                            </div>
                            <p className="text-sm">
                              Venue: <span className="font-medium">{booking.venues?.name || "N/A"}</span>
                            </p>
                            <p className="text-lg font-bold text-primary">
                              Rs. {booking.total_price?.toLocaleString()}
                            </p>
                          </div>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" onClick={() => {
                                setSelectedBooking(booking);
                                setActiveTab("details");
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Booking Details</DialogTitle>
                              </DialogHeader>
                              {selectedBooking && (
                                <Tabs value={activeTab} onValueChange={setActiveTab}>
                                  <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="details">Details</TabsTrigger>
                                    <TabsTrigger value="checklist">
                                      <CheckSquare className="h-4 w-4 mr-1" />
                                      Checklist
                                    </TabsTrigger>
                                    <TabsTrigger value="chat">
                                      <MessageCircle className="h-4 w-4 mr-1" />
                                      Chat
                                    </TabsTrigger>
                                    <TabsTrigger value="review" disabled={selectedBooking.status !== "completed" || selectedBooking.hasReview}>
                                      <Star className="h-4 w-4 mr-1" />
                                      Review
                                    </TabsTrigger>
                                  </TabsList>

                                  <TabsContent value="details" className="space-y-4 mt-4">
                                    <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">Status</span>
                                      <Badge className={getStatusColor(selectedBooking.status)}>
                                        {getStatusText(selectedBooking.status)}
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                      <div>
                                        <p className="text-xs text-muted-foreground">Customer</p>
                                        <p className="font-medium">{selectedBooking.name}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Phone</p>
                                        <p className="font-medium">{selectedBooking.phone}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Event Date</p>
                                        <p className="font-medium">
                                          {format(new Date(selectedBooking.event_date), "MMMM dd, yyyy")}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Event Type</p>
                                        <p className="font-medium capitalize">{selectedBooking.event_type || "Wedding"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Venue</p>
                                        <p className="font-medium">{selectedBooking.venues?.name || "N/A"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Package</p>
                                        <p className="font-medium capitalize">{selectedBooking.package_type}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Guests</p>
                                        <p className="font-medium">{selectedBooking.guests}</p>
                                      </div>
                                    </div>

                                    {selectedBooking.menu_items && selectedBooking.menu_items.length > 0 && (
                                      <div>
                                        <p className="text-sm font-medium mb-2">Selected Menu Items</p>
                                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                                          {selectedBooking.menu_items.map((item: any, idx: number) => (
                                            <li key={idx}>
                                              {item.name} - Rs. {item.price}/person
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {selectedBooking.message && (
                                      <div>
                                        <p className="text-sm font-medium mb-1">Special Requirements</p>
                                        <p className="text-sm text-muted-foreground">{selectedBooking.message}</p>
                                      </div>
                                    )}

                                    <div className="p-4 bg-primary/10 rounded-lg text-center">
                                      <p className="text-sm text-muted-foreground">Total Price</p>
                                      <p className="text-2xl font-bold text-primary">
                                        Rs. {selectedBooking.total_price?.toLocaleString()}
                                      </p>
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="checklist" className="mt-4">
                                    <EventChecklist bookingId={selectedBooking.id} />
                                  </TabsContent>

                                  <TabsContent value="chat" className="mt-4">
                                    {user && (
                                      <BookingChat
                                        bookingId={selectedBooking.id}
                                        userId={user.id}
                                        isAdmin={false}
                                      />
                                    )}
                                  </TabsContent>

                                  <TabsContent value="review" className="mt-4">
                                    {selectedBooking.status === "completed" && !selectedBooking.hasReview && user && (
                                      <ReviewForm
                                        bookingId={selectedBooking.id}
                                        userId={user.id}
                                        onSuccess={() => {
                                          fetchBookings(user);
                                          setActiveTab("details");
                                        }}
                                      />
                                    )}
                                    {selectedBooking.hasReview && (
                                      <div className="text-center py-8">
                                        <Star className="h-12 w-12 mx-auto text-yellow-500 fill-yellow-500 mb-2" />
                                        <p className="text-muted-foreground">You've already submitted a review for this booking.</p>
                                      </div>
                                    )}
                                  </TabsContent>
                                </Tabs>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
            </TabsContent>

            <TabsContent value="downloads">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    My Downloads ({purchases.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {purchases.length === 0 ? (
                    <div className="text-center py-8">
                      <Download className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground mb-4">No downloads yet.</p>
                      <a href="/digital-products">
                        <Button variant="gold">Browse Products</Button>
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {purchases.map((purchase) => (
                        <div key={purchase.id} className="flex items-center gap-4 p-3 border rounded-lg">
                          {purchase.digital_products?.preview_image_url ? (
                            <img src={purchase.digital_products.preview_image_url} alt="" className="h-12 w-12 rounded object-cover" />
                          ) : (
                            <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{purchase.digital_products?.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{purchase.digital_products?.category?.replace("_", " ")}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{format(new Date(purchase.created_at), "MMM dd, yyyy")}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default MyBookings;
