import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookingsTable from "@/components/admin/BookingsTable";
import BookingCalendar from "@/components/admin/BookingCalendar";
import VenuesManager from "@/components/admin/VenuesManager";
import MenuManager from "@/components/admin/MenuManager";
import GalleryManager from "@/components/admin/GalleryManager";
import ContactManager from "@/components/admin/ContactManager";
import PaymentReminders from "@/components/admin/PaymentReminders";
import MeetingsManager from "@/components/admin/MeetingsManager";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import StaffManager from "@/components/admin/StaffManager";
import SeasonalPricingManager from "@/components/admin/SeasonalPricingManager";
import AddonsManager from "@/components/admin/AddonsManager";
import ReviewsManager from "@/components/admin/ReviewsManager";
import DigitalProductsManager from "@/components/admin/DigitalProductsManager";
import PaymentReport from "@/components/admin/PaymentReport";
import AccountsManager from "@/components/admin/AccountsManager";
import LedgerManager from "@/components/admin/LedgerManager";

const Admin = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const highlightBookingId = searchParams.get("booking");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground mb-6">
              You don't have admin privileges. Please contact an administrator.
            </p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto py-6 px-3 sm:py-8 sm:px-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold">Admin Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              Manage bookings, venues, and menu items
            </p>
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm" className="self-start sm:self-auto">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <Tabs defaultValue="analytics" className="w-full">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 mb-2">
            <TabsList className="inline-flex w-max lg:grid lg:w-full lg:grid-cols-16 gap-1">
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="report">Report</TabsTrigger>
              <TabsTrigger value="ledger">Ledger</TabsTrigger>
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
              <TabsTrigger value="meetings">Meetings</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="venues">Venues</TabsTrigger>
              <TabsTrigger value="menu">Menu</TabsTrigger>
              <TabsTrigger value="addons">Add-ons</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="analytics" className="mt-6">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="bookings" className="mt-6 space-y-6">
            <PaymentReminders />
            <BookingsTable highlightBookingId={highlightBookingId || selectedBookingId || undefined} />
          </TabsContent>

          <TabsContent value="report" className="mt-6">
            <PaymentReport />
          </TabsContent>

          <TabsContent value="ledger" className="mt-6">
            <LedgerManager />
          </TabsContent>

          <TabsContent value="accounts" className="mt-6">
            <AccountsManager />
          </TabsContent>

          <TabsContent value="meetings" className="mt-6">
            <MeetingsManager />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <BookingCalendar onSelectBooking={(id) => {
              setSelectedBookingId(id);
              const tabsList = document.querySelector('[value="bookings"]');
              if (tabsList) (tabsList as HTMLElement).click();
            }} />
          </TabsContent>

          <TabsContent value="venues" className="mt-6">
            <VenuesManager />
          </TabsContent>

          <TabsContent value="menu" className="mt-6">
            <MenuManager />
          </TabsContent>

          <TabsContent value="addons" className="mt-6">
            <AddonsManager />
          </TabsContent>

          <TabsContent value="staff" className="mt-6">
            <StaffManager />
          </TabsContent>

          <TabsContent value="pricing" className="mt-6">
            <SeasonalPricingManager />
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <ReviewsManager />
          </TabsContent>

          <TabsContent value="gallery" className="mt-6">
            <GalleryManager />
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <DigitalProductsManager />
          </TabsContent>

          <TabsContent value="contact" className="mt-6">
            <ContactManager />
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default Admin;
