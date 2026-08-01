import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { TrendingUp, Users, Calendar, DollarSign, Loader2 } from "lucide-react";

interface BookingStats {
  totalBookings: number;
  totalRevenue: number;
  totalGuests: number;
  averageBookingValue: number;
}

interface MonthlyData {
  month: string;
  bookings: number;
  revenue: number;
}

interface VenueStats {
  name: string;
  bookings: number;
}

interface EventTypeStats {
  name: string;
  value: number;
}

const COLORS = ["#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4899"];

const AnalyticsDashboard = () => {
  const [stats, setStats] = useState<BookingStats>({
    totalBookings: 0,
    totalRevenue: 0,
    totalGuests: 0,
    averageBookingValue: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [venueStats, setVenueStats] = useState<VenueStats[]>([]);
  const [eventTypeStats, setEventTypeStats] = useState<EventTypeStats[]>([]);
  const [statusStats, setStatusStats] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch all bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("*, venues(name)")
        .order("created_at", { ascending: false });

      if (!bookings) return;

      // Calculate overall stats
      const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
      const totalGuests = bookings.reduce((sum, b) => sum + (b.guests || 0), 0);
      
      setStats({
        totalBookings: bookings.length,
        totalRevenue,
        totalGuests,
        averageBookingValue: bookings.length > 0 ? totalRevenue / bookings.length : 0,
      });

      // Calculate monthly data (last 6 months)
      const monthlyMap = new Map<string, { bookings: number; revenue: number }>();
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const key = format(date, "MMM yyyy");
        monthlyMap.set(key, { bookings: 0, revenue: 0 });
      }

      bookings.forEach((booking) => {
        const key = format(new Date(booking.created_at || ""), "MMM yyyy");
        if (monthlyMap.has(key)) {
          const current = monthlyMap.get(key)!;
          monthlyMap.set(key, {
            bookings: current.bookings + 1,
            revenue: current.revenue + (booking.total_price || 0),
          });
        }
      });

      setMonthlyData(
        Array.from(monthlyMap.entries()).map(([month, data]) => ({
          month,
          ...data,
        }))
      );

      // Calculate venue stats
      const venueMap = new Map<string, number>();
      bookings.forEach((booking) => {
        const venueName = (booking.venues as any)?.name || "No Venue";
        venueMap.set(venueName, (venueMap.get(venueName) || 0) + 1);
      });
      setVenueStats(
        Array.from(venueMap.entries())
          .map(([name, bookings]) => ({ name, bookings }))
          .sort((a, b) => b.bookings - a.bookings)
          .slice(0, 5)
      );

      // Calculate event type stats
      const eventTypeMap = new Map<string, number>();
      bookings.forEach((booking) => {
        const eventType = booking.event_type || "wedding";
        eventTypeMap.set(eventType, (eventTypeMap.get(eventType) || 0) + 1);
      });
      setEventTypeStats(
        Array.from(eventTypeMap.entries()).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
        }))
      );

      // Calculate status stats
      const statusMap = new Map<string, number>();
      bookings.forEach((booking) => {
        const status = booking.status || "pending";
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });
      setStatusStats(
        Array.from(statusMap.entries()).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
        }))
      );

    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bookings
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs. {stats.totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Guests
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGuests.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Booking Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs. {Math.round(stats.averageBookingValue).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="w-full">
        <TabsList>
          <TabsTrigger value="trends">Booking Trends</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="venues">Popular Venues</TabsTrigger>
          <TabsTrigger value="events">Event Types</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Booking Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="bookings"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.2)"
                      name="Bookings"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `Rs. ${(value / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="venues" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Popular Venues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={venueStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="bookings" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={eventTypeStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {eventTypeStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusStats.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.name === "Confirmed"
                                ? "#10b981"
                                : entry.name === "Cancelled"
                                ? "#ef4444"
                                : entry.name === "Completed"
                                ? "#3b82f6"
                                : "#f59e0b"
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
