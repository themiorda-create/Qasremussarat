import { Link } from "react-router-dom";
import { MapPin, Phone, Mail } from "lucide-react";
const Footer = () => {
  return <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold bg-gradient-gold bg-clip-text text-transparent">
              Royal Events
            </h3>
            <p className="text-primary-foreground/80 text-sm">
              Creating unforgettable moments in the most elegant venues.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Quick Links</h4>
            <div className="flex flex-col space-y-2">
              <Link to="/venues" className="text-primary-foreground/80 hover:text-accent transition-colors text-sm">
                Venues
              </Link>
              <Link to="/gallery" className="text-primary-foreground/80 hover:text-accent transition-colors text-sm">
                Gallery
              </Link>
              <Link to="/booking" className="text-primary-foreground/80 hover:text-accent transition-colors text-sm">
                Booking
              </Link>
              <Link to="/about" className="text-primary-foreground/80 hover:text-accent transition-colors text-sm">
                About Us
              </Link>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Services</h4>
            <div className="flex flex-col space-y-2 text-sm text-primary-foreground/80">
              <p>Wedding Events</p>
              <p>Corporate Functions</p>
              <p>Birthday Celebrations</p>
              <p>Mehndi Ceremonies</p>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Contact</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2 text-primary-foreground/80">
                <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                <span>QASR-E-MUSSARAT MARQUEE,HAROONABAD 73/4R</span>
              </div>
              <div className="flex items-center space-x-2 text-primary-foreground/80">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>03336315005
              </span>
              </div>
              <div className="flex items-center space-x-2 text-primary-foreground/80">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>shoaibfuels@gmail.com</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-primary-foreground/20 text-center text-sm text-primary-foreground/60">
          <p>&copy; {new Date().getFullYear()} Royal Events. All rights reserved.</p>
        </div>
      </div>
    </footer>;
};
export default Footer;