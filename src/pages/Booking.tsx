import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { toast } from "sonner";

interface Venue {
  id: string;
  name: string;
  price_per_day: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface AddonService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
}

const EVENT_TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "birthday", label: "Birthday Party" },
  { value: "corporate", label: "Corporate Event" },
  { value: "engagement", label: "Engagement" },
  { value: "anniversary", label: "Anniversary" },
  { value: "conference", label: "Conference" },
  { value: "other", label: "Other" },
];

const Booking = () => {
  const [searchParams] = useSearchParams();
  const [date, setDate] = useState<Date>();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [addons, setAddons] = useState<AddonService[]>([]);
  const [selectedMenuItems, setSelectedMenuItems] = useState<string[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    venue: "",
    package: "",
    guests: "",
    message: "",
    eventType: "wedding",
    eventTime: "day",
    billingType: "per_head",
  });

  // Prefill date + slot from query string (e.g. coming from the home calendar)
  useEffect(() => {
    const d = searchParams.get("date");
    const slot = searchParams.get("slot");
    if (d) {
      const parsed = new Date(d + "T00:00:00");
      if (!isNaN(parsed.getTime())) setDate(parsed);
    }
    if (slot === "day" || slot === "evening") {
      setFormData((prev) => ({ ...prev, eventTime: slot }));
    }
  }, [searchParams]);

  useEffect(() => {
    fetchVenues();
    fetchMenuItems();
    fetchAddons();

    // Get current user and prefill form
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setFormData(prev => ({
          ...prev,
          name: session.user.user_metadata?.full_name || prev.name,
          email: session.user.email || prev.email,
        }));
      }
    });
  }, []);

  const fetchVenues = async () => {
    const { data, error } = await supabase
      .from("venues")
      .select("id, name, price_per_day")
      .order("name");
    if (!error && data) setVenues(data);
  };

  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("category, name");
    if (!error && data) setMenuItems(data);
  };

  const fetchAddons = async () => {
    const { data, error } = await supabase
      .from("addon_services")
      .select("*")
      .eq("is_active", true)
      .order("category, name");
    if (!error && data) setAddons(data);
  };

  const toggleMenuItem = (itemId: string) => {
    setSelectedMenuItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  const calculateTotal = () => {
    let total = 0;
    
    // Add venue price
    if (formData.venue) {
      const venue = venues.find((v) => v.id === formData.venue);
      if (venue) total += venue.price_per_day;
    }

    // Add menu items total
    const menuTotal = menuItems
      .filter((item) => selectedMenuItems.includes(item.id))
      .reduce((sum, item) => sum + item.price, 0);
    
    total += menuTotal * parseInt(formData.guests || "0");

    // Add addons total
    const addonsTotal = addons
      .filter((addon) => selectedAddons.includes(addon.id))
      .reduce((sum, addon) => sum + addon.price, 0);
    total += addonsTotal;

    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !formData.name || !formData.email || !formData.phone || !formData.venue || !formData.package) {
      toast.error("Please fill in all required fields");
      return;
    }

    const guestCount = parseInt(formData.guests);
    if (guestCount > 1000) {
      toast.error("Maximum capacity is 1000 guests per event");
      return;
    }

    // Check capacity for selected date
    const dateStr = format(date, "yyyy-MM-dd");
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("guests")
      .eq("event_date", dateStr)
      .eq("status", "confirmed");

    const existingGuests = existingBookings?.reduce((sum, b) => sum + b.guests, 0) || 0;
    if (existingGuests + guestCount > 1000) {
      toast.error(`Sorry, only ${1000 - existingGuests} guest capacity remaining for this date`);
      return;
    }

    setLoading(true);
    
    try {
      const selectedMenu = menuItems
        .filter((item) => selectedMenuItems.includes(item.id))
        .map((item) => ({ id: item.id, name: item.name, price: item.price }));

      const venue = venues.find((v) => v.id === formData.venue);
      const totalPrice = calculateTotal();

      const selectedAddonsList = addons
        .filter((addon) => selectedAddons.includes(addon.id))
        .map((addon) => ({ id: addon.id, name: addon.name, price: addon.price }));

      const { data: bookingData, error } = await supabase.from("bookings").insert({
        name: formData.name,
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone,
        event_date: dateStr,
        venue_id: formData.venue || null,
        package_type: formData.package,
        guests: guestCount,
        menu_items: selectedMenu,
        total_price: totalPrice,
        message: formData.message,
        status: "pending",
        user_id: user?.id || null,
        event_type: formData.eventType,
        event_time: formData.eventTime,
        billing_type: formData.billingType,
      }).select().single();

      if (error) throw error;

      // Insert booking addons
      if (bookingData && selectedAddonsList.length > 0) {
        await supabase.from("booking_addons").insert(
          selectedAddonsList.map((addon) => ({
            booking_id: bookingData.id,
            addon_id: addon.id,
            price: addon.price,
          }))
        );
      }

      // Send confirmation emails (server-side looks up booking by id)
      if (bookingData?.id) {
        try {
          await supabase.functions.invoke("send-booking-emails", {
            body: { bookingId: bookingData.id },
          });
        } catch (emailError) {
          console.error("Failed to send emails:", emailError);
          // Don't fail the booking if email fails
        }
      }

      toast.success("Booking submitted successfully! Check your email for confirmation.");
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        venue: "",
        package: "",
        guests: "",
        message: "",
        eventType: "wedding",
        eventTime: "day",
        billingType: "per_head",
      });
      setDate(undefined);
      setSelectedMenuItems([]);
      setSelectedAddons([]);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit booking");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Group menu items by category
  const groupedMenuItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="min-h-screen">
      <SEO title="Book Your Event — Qasr-e-Mussarat Marquee" description="Request your date, choose menu and add-ons, and view live pricing for weddings, mehndi, baraat, walima, or corporate events." path="/booking" />
      <Navbar />


      {/* Header */}
      <section className="pt-24 pb-12 bg-gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Book Your Event</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Fill out the form below and we'll get back to you within 24 hours
          </p>
        </div>
      </section>

      {/* Booking Form */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-3xl">Event Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (234) 567-8900"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guests">Number of Guests *</Label>
                    <Input
                      id="guests"
                      type="number"
                      placeholder="150"
                      value={formData.guests}
                      onChange={(e) => handleChange("guests", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Event Type */}
                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type *</Label>
                  <Select value={formData.eventType} onValueChange={(value) => handleChange("eventType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Event Time */}
                <div className="space-y-2">
                  <Label htmlFor="eventTime">Event Time *</Label>
                  <Select value={formData.eventTime} onValueChange={(value) => handleChange("eventTime", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose event time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day Event</SelectItem>
                      <SelectItem value="night">Night Event</SelectItem>
                      <SelectItem value="full-day">Full Day Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Billing Type */}
                <div className="space-y-2">
                  <Label htmlFor="billingType">Billing Type *</Label>
                  <Select value={formData.billingType} onValueChange={(value) => handleChange("billingType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose billing type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_head">Per Head Event</SelectItem>
                      <SelectItem value="service">Service Only</SelectItem>
                      <SelectItem value="service_cooking">Service &amp; Cooking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Event Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="venue">Select Venue *</Label>
                    <Select value={formData.venue} onValueChange={(value) => handleChange("venue", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a venue" />
                      </SelectTrigger>
                      <SelectContent>
                        {venues.map((venue) => (
                          <SelectItem key={venue.id} value={venue.id}>
                            {venue.name} - Rs. {venue.price_per_day.toLocaleString()}/day
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="package">Select Package *</Label>
                    <Select value={formData.package} onValueChange={(value) => handleChange("package", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a package" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="silver">Silver Package</SelectItem>
                        <SelectItem value="gold">Gold Package</SelectItem>
                        <SelectItem value="platinum">Platinum Package</SelectItem>
                        <SelectItem value="custom">Custom Package</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Date Picker */}
                <div className="space-y-2">
                  <Label>Event Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Menu Selection — pick category, then dishes */}
                {menuItems.length > 0 && (
                  <div className="space-y-3">
                    <Label>Select Menu Items (Optional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Choose a category, then tick the dishes you want. Price is per person.
                    </p>
                    <div className="border rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
                      {Object.entries(groupedMenuItems).map(([category, items]) => {
                        const selectedInCat = items.filter(i => selectedMenuItems.includes(i.id)).length;
                        return (
                          <details key={category} open={selectedInCat > 0} className="group border rounded-md">
                            <summary className="cursor-pointer flex items-center justify-between p-3 hover:bg-muted/50 rounded-md">
                              <span className="font-semibold text-primary">
                                {category} <span className="text-xs text-muted-foreground">({items.length} items)</span>
                              </span>
                              {selectedInCat > 0 && (
                                <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                                  {selectedInCat} selected
                                </span>
                              )}
                            </summary>
                            <div className="p-3 pt-0 grid grid-cols-1 md:grid-cols-2 gap-2">
                              {items.map((item) => (
                                <div key={item.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={item.id}
                                    checked={selectedMenuItems.includes(item.id)}
                                    onCheckedChange={() => toggleMenuItem(item.id)}
                                  />
                                  <label htmlFor={item.id} className="text-sm cursor-pointer">
                                    {item.name} <span className="text-muted-foreground">— Rs. {item.price}/person</span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add-on Services */}
                {addons.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-accent" />
                      Add-on Services (Optional)
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg">
                      {Object.entries(
                        addons.reduce((acc, addon) => {
                          if (!acc[addon.category]) acc[addon.category] = [];
                          acc[addon.category].push(addon);
                          return acc;
                        }, {} as Record<string, AddonService[]>)
                      ).map(([category, categoryAddons]) => (
                        <div key={category} className="col-span-1">
                          <h4 className="font-semibold mb-2 capitalize">{category}</h4>
                          {categoryAddons.map((addon) => (
                            <div key={addon.id} className="flex items-start space-x-2 mb-2">
                              <Checkbox
                                id={addon.id}
                                checked={selectedAddons.includes(addon.id)}
                                onCheckedChange={() => toggleAddon(addon.id)}
                              />
                              <div className="flex-1">
                                <label htmlFor={addon.id} className="text-sm cursor-pointer font-medium">
                                  {addon.name} - Rs. {addon.price.toLocaleString()}
                                </label>
                                {addon.description && (
                                  <p className="text-xs text-muted-foreground">{addon.description}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">Additional Requirements</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us about any special requirements or preferences..."
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Price Estimate */}
                {formData.guests && formData.venue && (
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">Estimated Total</h3>
                    <p className="text-2xl text-primary font-bold">
                      Rs. {calculateTotal().toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Based on selected venue, {formData.guests} guests, and menu items
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <Button type="submit" variant="gold" size="lg" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Booking Inquiry"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* WhatsApp Contact */}
          <Card className="mt-8 glass-card">
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-semibold mb-2">Prefer to talk directly?</h3>
              <p className="text-muted-foreground mb-4">
                Connect with us on WhatsApp for instant assistance
              </p>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => window.open("https://wa.me/1234567890", "_blank")}
              >
                Chat on WhatsApp
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Booking;
