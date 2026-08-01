import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

interface GalleryImage {
  id: string;
  image_url: string;
  category: string;
  title: string;
}

const Gallery = () => {
  const [filter, setFilter] = useState("all");
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error("Failed to fetch images:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: "all", label: "All Events" },
    { id: "Wedding", label: "Weddings" },
    { id: "Corporate", label: "Corporate" },
    { id: "Birthday", label: "Birthdays" },
    { id: "Mehndi", label: "Mehndi" },
  ];

  const filteredItems = filter === "all"
    ? images
    : images.filter((item) => item.category === filter);

  return (
    <div className="min-h-screen">
      <SEO title="Event Gallery — Qasr-e-Mussarat Marquee" description="Photos from past weddings, mehndi, baraat, walima, and corporate events at Qasr-e-Mussarat Marquee, Haroonabad." path="/gallery" />
      <Navbar />

      {/* Header */}
      <section className="pt-24 pb-12 bg-gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Event Gallery</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Explore our stunning venues and past celebrations
          </p>
        </div>
      </section>

      {/* Filter Buttons */}
      <section className="py-8 bg-muted sticky top-16 z-40">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category) => (
              <Badge
                key={category.id}
                variant={filter === category.id ? "default" : "outline"}
                className={`cursor-pointer px-6 py-2 text-base transition-all ${
                  filter === category.id
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "hover:bg-accent"
                }`}
                onClick={() => setFilter(category.id)}
              >
                {category.label}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">No images found. Add some in the admin panel!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item, index) => (
                <Card
                  key={item.id}
                  className="group overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={`${item.title || item.category} event at Qasr-e-Mussarat Marquee — ${item.category} setup`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="text-white text-center p-4">
                        <h3 className="text-xl font-semibold">{item.title || "Gallery Image"}</h3>
                        <p className="text-sm">{item.category}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-elegant text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: "500+", label: "Events Hosted" },
              { number: "50K+", label: "Happy Guests" },
              { number: "15+", label: "Years Experience" },
              { number: "5★", label: "Average Rating" },
            ].map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="text-5xl font-bold text-accent">{stat.number}</div>
                <div className="text-lg opacity-90">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">What Our Clients Say</h2>
            <p className="text-xl text-muted-foreground">Real experiences from real celebrations</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Sarah & Michael",
                event: "Wedding Reception",
                text: "Royal Events made our wedding day absolutely perfect! The Grand Ballroom was stunning and the service was exceptional.",
              },
              {
                name: "Tech Corp Ltd.",
                event: "Corporate Gala",
                text: "Professional service and beautiful venue. Our annual gala was a huge success thanks to the Royal Events team.",
              },
              {
                name: "Aisha Khan",
                event: "Mehndi Ceremony",
                text: "The Garden Marquee was magical! Everything was arranged beautifully and our guests couldn't stop complimenting the venue.",
              },
            ].map((testimonial, index) => (
              <Card key={index} className="glass-card">
                <CardContent className="p-6">
                  <div className="text-accent text-4xl mb-4">"</div>
                  <p className="text-muted-foreground mb-4">{testimonial.text}</p>
                  <div className="border-t pt-4">
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.event}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Gallery;
