import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/hooks/useLanguage";
import Home from "./pages/Home";
import Venues from "./pages/Venues";
import Booking from "./pages/Booking";
import Gallery from "./pages/Gallery";
import About from "./pages/About";
import Auth from "./pages/Auth";
import CustomerAuth from "./pages/CustomerAuth";
import Admin from "./pages/Admin";
import MyBookings from "./pages/MyBookings";
import Contact from "./pages/Contact";
import MeetingBooking from "./pages/MeetingBooking";
import NotFound from "./pages/NotFound";
import DigitalProducts from "./pages/DigitalProducts";
import AIChatWidget from "./components/AIChatWidget";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/venues" element={<Venues />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/meeting" element={<MeetingBooking />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/customer-auth" element={<CustomerAuth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/digital-products" element={<DigitalProducts />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AIChatWidget />
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
