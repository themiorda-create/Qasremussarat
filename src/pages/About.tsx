import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Mail, Clock, Award, Heart, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const About = () => {
  return (
    <div className="min-h-screen">
      <SEO title="About Qasr-e-Mussarat Marquee" description="Our story, location in Haroonabad, and what makes our marquee a premier choice for weddings and events." path="/about" />
      <Navbar />

      {/* Header */}
      <section className="pt-24 pb-12 bg-gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">About Royal Events</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Creating memorable celebrations for over 15 years
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-6">Our Story</h2>
            <div className="space-y-4 text-lg text-muted-foreground">
              <p>
                Founded in 2009, Royal Events has been the premier choice for event venues in the
                region. What started as a single elegant hall has grown into a collection of
                stunning venues that host hundreds of celebrations each year.
              </p>
              <p>
                Our passion is creating spaces where memories are made. Every detail, from the
                crystal chandeliers to the perfectly manicured gardens, is designed to make your
                special day extraordinary.
              </p>
              <p>
                With a dedicated team of event professionals and state-of-the-art facilities, we
                ensure every celebration is flawless, whether it's an intimate gathering or a grand
                gala for hundreds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Our Values</h2>
            <p className="text-xl text-muted-foreground">What drives us every day</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: <Award className="h-12 w-12 text-accent" />,
                title: "Excellence",
                description: "We strive for perfection in every detail of your event",
              },
              {
                icon: <Heart className="h-12 w-12 text-accent" />,
                title: "Passion",
                description: "We genuinely care about making your celebration special",
              },
              {
                icon: <Users className="h-12 w-12 text-accent" />,
                title: "Service",
                description: "Your satisfaction is our top priority, always",
              },
            ].map((value, index) => (
              <Card key={index} className="glass-card text-center hover:shadow-xl transition-all">
                <CardContent className="p-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 mb-4">
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Get in Touch</h2>
            <p className="text-xl text-muted-foreground">We'd love to hear from you</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Contact Details */}
            <Card className="glass-card">
              <CardContent className="p-8 space-y-6">
                <h3 className="text-2xl font-semibold mb-6">Contact Details</h3>

                <div className="flex items-start space-x-4">
                  <MapPin className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Address</h4>
                    <p className="text-muted-foreground">
                      123 Royal Avenue<br />
                      Event City, EC 12345<br />
                      United States
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <Phone className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Phone</h4>
                    <p className="text-muted-foreground">+1 (234) 567-8900</p>
                    <p className="text-sm text-muted-foreground">Available 24/7</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <Mail className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Email</h4>
                    <p className="text-muted-foreground">info@royalevents.com</p>
                    <p className="text-sm text-muted-foreground">We reply within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <Clock className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Office Hours</h4>
                    <p className="text-muted-foreground">
                      Monday - Friday: 9:00 AM - 8:00 PM<br />
                      Saturday - Sunday: 10:00 AM - 6:00 PM
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Map Placeholder */}
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0 h-full">
                <div className="relative h-full min-h-[400px] bg-muted flex items-center justify-center">
                  <div className="text-center p-8">
                    <MapPin className="h-16 w-16 text-accent mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Visit Our Location</h3>
                    <p className="text-muted-foreground mb-4">
                      Schedule a tour to see our beautiful venues
                    </p>
                    <Button variant="gold">Book a Tour</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-elegant text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Plan Your Event?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Let's create something unforgettable together
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="gold"
              size="xl"
              onClick={() => window.open("https://wa.me/1234567890", "_blank")}
            >
              Chat on WhatsApp
            </Button>
            <Button variant="outline" size="xl" className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white hover:text-primary">
              Call Us Now
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
