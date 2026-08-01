import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, Sparkles, MessageCircle, Camera, Award } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReviewsSection from "@/components/ReviewsSection";
import HeroReel from "@/components/HeroReel";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import AnnouncementTicker from "@/components/AnnouncementTicker";
import SEO from "@/components/SEO";
const Home = () => {
  const features = [{
    icon: <Calendar className="h-8 w-8 text-accent" />,
    title: "Easy Booking",
    description: "Simple online booking system with instant availability checks"
  }, {
    icon: <Users className="h-8 w-8 text-accent" />,
    title: "Flexible Capacity",
    description: "Venues for intimate gatherings to grand celebrations up to 1000 guests"
  }, {
    icon: <Sparkles className="h-8 w-8 text-accent" />,
    title: "Premium Amenities",
    description: "AC halls, stage setup, premium lighting, and elegant decor"
  }, {
    icon: <MessageCircle className="h-8 w-8 text-accent" />,
    title: "24/7 Support",
    description: "Dedicated event managers available via chat or WhatsApp"
  }, {
    icon: <Camera className="h-8 w-8 text-accent" />,
    title: "Photography Ready",
    description: "Beautiful backdrops and perfect lighting for memorable photos"
  }, {
    icon: <Award className="h-8 w-8 text-accent" />,
    title: "Trusted Service",
    description: "Over 500+ successful events with 5-star ratings"
  }];
  const packages = [{
    name: "Silver Package",
    price: "$2,999",
    guests: "Up to 150",
    features: ["Basic hall setup", "Standard lighting", "6 hours rental", "Parking for 50 vehicles"]
  }, {
    name: "Gold Package",
    price: "$5,999",
    guests: "Up to 300",
    features: ["Premium hall setup", "Advanced lighting & sound", "8 hours rental", "Catering for 300", "Parking for 100 vehicles"],
    featured: true
  }, {
    name: "Platinum Package",
    price: "$9,999",
    guests: "Up to 500",
    features: ["Luxury hall setup", "Professional AV system", "12 hours rental", "Gourmet catering", "Decoration included", "Parking for 200 vehicles"]
  }];
  return <div className="min-h-screen">
      <SEO title="Qasr-e-Mussarat Marquee — Haroonabad" description="Premium wedding and event marquee in Haroonabad. Mehndi, Baraat, Walima and corporate dinners for up to 1,000 guests." path="/" />
      <Navbar />

      {/* Sliding announcement ticker (Shopify-style) */}
      <AnnouncementTicker />

      {/* Hero Section — cinematic video + monogram + pulsing CTA + live availability */}
      <HeroReel />

      {/* Live availability calendar */}
      <AvailabilityCalendar />

      {/* Features Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose Royal Events</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We provide everything you need for a perfect celebration
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => <Card key={index} className="glass-card hover:shadow-xl transition-all duration-300 animate-slide-up" style={{
            animationDelay: `${index * 100}ms`
          }}>
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Our Packages</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Flexible options to match your celebration needs and budget
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {packages.map((pkg, index) => <Card key={index} className={`relative overflow-hidden transition-all duration-300 hover:scale-105 ${pkg.featured ? "border-accent border-2 shadow-xl" : "hover:shadow-lg"}`}>
                {pkg.featured && <div className="absolute top-0 right-0 bg-accent text-accent-foreground px-4 py-1 text-sm font-semibold">
                    Most Popular
                  </div>}
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
                  <div className="text-4xl font-bold text-primary mb-1">{pkg.price}</div>
                  <p className="text-muted-foreground mb-6">{pkg.guests} guests</p>
                  <ul className="space-y-3 mb-8">
                    {pkg.features.map((feature, i) => <li key={i} className="flex items-start">
                        <span className="text-accent mr-2">✓</span>
                        <span className="text-sm">{feature}</span>
                      </li>)}
                  </ul>
                  <Link to="/booking">
                    <Button variant={pkg.featured ? "gold" : "default"} className="w-full" size="lg">
                      Select Package
                    </Button>
                  </Link>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>
      {/* Reviews Section */}
      <ReviewsSection />

      {/* CTA Section */}
      <section className="py-20 bg-gradient-elegant text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Plan Your Event?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Our team is ready to help you create an unforgettable celebration
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/booking">
              <Button variant="gold" size="xl">
                Check Availability
              </Button>
            </Link>
            <Link to="/about">
              <Button variant="outline" size="xl" className="bg-white/10 backdrop-blur-sm border-white/30 hover:bg-white text-slate-950">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>;
};
export default Home;