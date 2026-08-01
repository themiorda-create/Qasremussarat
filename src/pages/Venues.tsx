import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Car, Wifi, Sparkles, View } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import heroVenue from "@/assets/hero-venue.jpg";
import marqueeOutdoor from "@/assets/marquee-outdoor.jpg";
import ballroomElegant from "@/assets/ballroom-elegant.jpg";
import ceremonySetup from "@/assets/ceremony-setup.jpg";

const Venues = () => {
  const venues = [
    {
      name: "Grand Ballroom",
      image: heroVenue,
      capacity: "300-500 guests",
      price: "$4,999",
      features: ["AC", "Stage", "Premium Lighting", "VIP Parking"],
      description: "Our flagship venue with crystal chandeliers and elegant decor, perfect for grand celebrations.",
    },
    {
      name: "Garden Marquee",
      image: marqueeOutdoor,
      capacity: "200-400 guests",
      price: "$3,999",
      features: ["Outdoor", "Fairy Lights", "Garden View", "Open-air"],
      description: "Romantic outdoor setting with beautiful draping and fairy lights for magical evenings.",
    },
    {
      name: "Royal Blue Hall",
      image: ballroomElegant,
      capacity: "400-700 guests",
      price: "$6,999",
      features: ["AC", "Professional AV", "Stage", "Premium Decor"],
      description: "Luxurious hall with royal blue theme and gold accents for the ultimate celebration.",
    },
    {
      name: "Ceremony Hall",
      image: ceremonySetup,
      capacity: "150-300 guests",
      price: "$2,999",
      features: ["AC", "Elegant Decor", "Floral Arch", "Romantic Lighting"],
      description: "Intimate setting perfect for wedding ceremonies and special celebrations.",
    },
  ];

  return (
    <div className="min-h-screen">
      <SEO title="Our Venues — Qasr-e-Mussarat Marquee" description="Explore our halls and marquee spaces in Haroonabad with capacity, amenities, and pricing for weddings and corporate events." path="/venues" />
      <Navbar />


      {/* Header */}
      <section className="pt-24 pb-12 bg-gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Our Venues</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Discover the perfect space for your celebration
          </p>
        </div>
      </section>

      {/* Venues Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {venues.map((venue, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-xl transition-all duration-300 animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={venue.image}
                    alt={venue.name}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                  />
                  <Badge className="absolute top-4 right-4 bg-accent text-accent-foreground">
                    {venue.price}
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl">{venue.name}</CardTitle>
                  <div className="flex items-center text-muted-foreground">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{venue.capacity}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{venue.description}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {venue.features.map((feature, i) => (
                      <Badge key={i} variant="secondary">
                        {feature}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Premium Decor
                    </div>
                    <div className="flex items-center">
                      <Car className="h-4 w-4 mr-2" />
                      Ample Parking
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Prime Location
                    </div>
                    <div className="flex items-center">
                      <Wifi className="h-4 w-4 mr-2" />
                      High-Speed WiFi
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground"
                      onClick={() => toast.info(`360° Virtual Tour for ${venue.name} — coming soon. Contact us to schedule a live walkthrough.`)}
                    >
                      <View className="h-4 w-4 mr-2" />
                      360° Virtual Tour
                    </Button>
                    <Link to="/booking" className="block">
                      <Button variant="default" className="w-full" size="lg">
                        Book This Venue
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Amenities Section */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">All Venues Include</h2>
            <p className="text-xl text-muted-foreground">Premium amenities for every celebration</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              "Professional Sound System",
              "High-Quality Lighting",
              "Comfortable Seating",
              "Kitchen Facilities",
              "Restroom Facilities",
              "Security Services",
              "Event Coordination",
              "Setup & Cleanup",
            ].map((amenity, index) => (
              <div key={index} className="text-center p-4 glass-card">
                <Sparkles className="h-8 w-8 text-accent mx-auto mb-2" />
                <p className="font-medium">{amenity}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-elegant text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Need Help Choosing?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Our event specialists can help you select the perfect venue for your needs
          </p>
          <Link to="/about">
            <Button variant="gold" size="xl">
              Speak with Our Team
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Venues;
