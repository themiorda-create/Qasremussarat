import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "ur";

interface Translations {
  [key: string]: {
    en: string;
    ur: string;
  };
}

const translations: Translations = {
  // Navigation
  "nav.home": { en: "Home", ur: "ہوم" },
  "nav.venues": { en: "Venues", ur: "مقامات" },
  "nav.booking": { en: "Book Now", ur: "ابھی بک کریں" },
  "nav.gallery": { en: "Gallery", ur: "گیلری" },
  "nav.about": { en: "About", ur: "ہمارے بارے میں" },
  "nav.contact": { en: "Contact", ur: "رابطہ" },
  "nav.meeting": { en: "Schedule Meeting", ur: "میٹنگ شیڈول کریں" },
  "nav.myBookings": { en: "My Bookings", ur: "میری بکنگز" },
  "nav.login": { en: "Login", ur: "لاگ ان" },
  "nav.admin": { en: "Admin", ur: "ایڈمن" },
  
  // Home Page
  "home.hero.title": { en: "Create Unforgettable", ur: "ناقابل فراموش" },
  "home.hero.subtitle": { en: "Celebrations", ur: "تقریبات بنائیں" },
  "home.hero.description": { en: "Elegant venues, exceptional service, and memories that last forever", ur: "شاندار مقامات، بہترین خدمات، اور یادیں جو ہمیشہ رہیں" },
  "home.hero.book": { en: "Book Your Event", ur: "اپنا ایونٹ بک کریں" },
  "home.hero.explore": { en: "Explore Venues", ur: "مقامات دیکھیں" },
  "home.features.title": { en: "Why Choose Royal Events", ur: "رائل ایونٹس کیوں چنیں" },
  "home.features.subtitle": { en: "We provide everything you need for a perfect celebration", ur: "ہم آپ کی کامل تقریب کے لیے سب کچھ فراہم کرتے ہیں" },
  "home.packages.title": { en: "Our Packages", ur: "ہمارے پیکجز" },
  "home.packages.subtitle": { en: "Flexible options to match your celebration needs and budget", ur: "آپ کی ضروریات اور بجٹ کے مطابق لچکدار آپشنز" },
  "home.cta.title": { en: "Ready to Plan Your Event?", ur: "اپنا ایونٹ پلان کرنے کے لیے تیار ہیں؟" },
  "home.cta.subtitle": { en: "Our team is ready to help you create an unforgettable celebration", ur: "ہماری ٹیم آپ کی یادگار تقریب بنانے میں مدد کے لیے تیار ہے" },
  "home.cta.check": { en: "Check Availability", ur: "دستیابی چیک کریں" },
  "home.cta.contact": { en: "Contact Us", ur: "ہم سے رابطہ کریں" },
  
  // Booking Page
  "booking.title": { en: "Book Your Event", ur: "اپنا ایونٹ بک کریں" },
  "booking.subtitle": { en: "Fill out the form below and we'll get back to you within 24 hours", ur: "نیچے فارم بھریں اور ہم 24 گھنٹے میں آپ سے رابطہ کریں گے" },
  "booking.eventDetails": { en: "Event Details", ur: "ایونٹ کی تفصیلات" },
  "booking.name": { en: "Full Name", ur: "پورا نام" },
  "booking.email": { en: "Email Address", ur: "ای میل ایڈریس" },
  "booking.phone": { en: "Phone Number", ur: "فون نمبر" },
  "booking.guests": { en: "Number of Guests", ur: "مہمانوں کی تعداد" },
  "booking.venue": { en: "Select Venue", ur: "مقام منتخب کریں" },
  "booking.package": { en: "Select Package", ur: "پیکج منتخب کریں" },
  "booking.eventType": { en: "Event Type", ur: "ایونٹ کی قسم" },
  "booking.eventDate": { en: "Event Date", ur: "ایونٹ کی تاریخ" },
  "booking.addons": { en: "Add-on Services", ur: "اضافی خدمات" },
  "booking.menu": { en: "Select Menu Items", ur: "مینو آئٹمز منتخب کریں" },
  "booking.requirements": { en: "Additional Requirements", ur: "اضافی ضروریات" },
  "booking.estimatedTotal": { en: "Estimated Total", ur: "تخمینی کل" },
  "booking.submit": { en: "Submit Booking Inquiry", ur: "بکنگ کی درخواست جمع کریں" },
  "booking.whatsapp": { en: "Prefer to talk directly?", ur: "براہ راست بات کرنا چاہتے ہیں؟" },
  "booking.whatsappDesc": { en: "Connect with us on WhatsApp for instant assistance", ur: "فوری مدد کے لیے واٹس ایپ پر ہم سے رابطہ کریں" },
  
  // Event Types
  "eventType.wedding": { en: "Wedding", ur: "شادی" },
  "eventType.birthday": { en: "Birthday Party", ur: "سالگرہ کی تقریب" },
  "eventType.corporate": { en: "Corporate Event", ur: "کارپوریٹ ایونٹ" },
  "eventType.engagement": { en: "Engagement", ur: "منگنی" },
  "eventType.anniversary": { en: "Anniversary", ur: "سالگرہ" },
  "eventType.conference": { en: "Conference", ur: "کانفرنس" },
  "eventType.other": { en: "Other", ur: "دیگر" },
  
  // My Bookings
  "myBookings.title": { en: "My Bookings", ur: "میری بکنگز" },
  "myBookings.welcome": { en: "Welcome back", ur: "خوش آمدید" },
  "myBookings.noBookings": { en: "No Bookings Yet", ur: "ابھی کوئی بکنگ نہیں" },
  "myBookings.noBookingsDesc": { en: "You haven't made any bookings yet. Start planning your event today!", ur: "آپ نے ابھی کوئی بکنگ نہیں کی۔ آج ہی اپنا ایونٹ پلان کریں!" },
  "myBookings.makeBooking": { en: "Make a Booking", ur: "بکنگ کریں" },
  "myBookings.countdown": { en: "Days until your event", ur: "آپ کے ایونٹ میں دن باقی" },
  "myBookings.checklist": { en: "Event Checklist", ur: "ایونٹ چیک لسٹ" },
  "myBookings.chat": { en: "Chat with Admin", ur: "ایڈمن سے چیٹ کریں" },
  "myBookings.leaveReview": { en: "Leave a Review", ur: "جائزہ دیں" },
  
  // Reviews
  "reviews.title": { en: "Customer Reviews", ur: "صارفین کے جائزے" },
  "reviews.subtitle": { en: "See what our happy customers have to say", ur: "دیکھیں ہمارے خوش صارفین کیا کہتے ہیں" },
  "reviews.rating": { en: "Rating", ur: "ریٹنگ" },
  "reviews.writeReview": { en: "Write a Review", ur: "جائزہ لکھیں" },
  "reviews.yourRating": { en: "Your Rating", ur: "آپ کی ریٹنگ" },
  "reviews.yourReview": { en: "Your Review", ur: "آپ کا جائزہ" },
  "reviews.submit": { en: "Submit Review", ur: "جائزہ جمع کریں" },
  
  // Common
  "common.loading": { en: "Loading...", ur: "لوڈ ہو رہا ہے..." },
  "common.signOut": { en: "Sign Out", ur: "سائن آؤٹ" },
  "common.viewDetails": { en: "View Details", ur: "تفصیلات دیکھیں" },
  "common.save": { en: "Save", ur: "محفوظ کریں" },
  "common.cancel": { en: "Cancel", ur: "منسوخ" },
  "common.send": { en: "Send", ur: "بھیجیں" },
  "common.guests": { en: "guests", ur: "مہمان" },
  "common.perDay": { en: "/day", ur: "/دن" },
  "common.perPerson": { en: "/person", ur: "/شخص" },
  
  // Status
  "status.pending": { en: "Awaiting Confirmation", ur: "تصدیق کا انتظار" },
  "status.confirmed": { en: "Confirmed", ur: "تصدیق شدہ" },
  "status.cancelled": { en: "Cancelled", ur: "منسوخ" },
  "status.completed": { en: "Completed", ur: "مکمل" },
  
  // Features
  "feature.easyBooking": { en: "Easy Booking", ur: "آسان بکنگ" },
  "feature.easyBookingDesc": { en: "Simple online booking system with instant availability checks", ur: "فوری دستیابی چیک کے ساتھ آسان آن لائن بکنگ سسٹم" },
  "feature.flexibleCapacity": { en: "Flexible Capacity", ur: "لچکدار گنجائش" },
  "feature.flexibleCapacityDesc": { en: "Venues for intimate gatherings to grand celebrations up to 1000 guests", ur: "چھوٹی محفلوں سے لے کر 1000 مہمانوں تک کی بڑی تقریبات کے لیے مقامات" },
  "feature.premiumAmenities": { en: "Premium Amenities", ur: "اعلیٰ سہولیات" },
  "feature.premiumAmenitiesDesc": { en: "AC halls, stage setup, premium lighting, and elegant decor", ur: "ائیر کنڈیشنڈ ہال، اسٹیج سیٹ اپ، پریمیم لائٹنگ، اور خوبصورت سجاوٹ" },
  "feature.support": { en: "24/7 Support", ur: "24/7 سپورٹ" },
  "feature.supportDesc": { en: "Dedicated event managers available via chat or WhatsApp", ur: "چیٹ یا واٹس ایپ کے ذریعے دستیاب مخصوص ایونٹ مینیجرز" },
  "feature.photography": { en: "Photography Ready", ur: "فوٹوگرافی کے لیے تیار" },
  "feature.photographyDesc": { en: "Beautiful backdrops and perfect lighting for memorable photos", ur: "یادگار تصاویر کے لیے خوبصورت پس منظر اور بہترین لائٹنگ" },
  "feature.trusted": { en: "Trusted Service", ur: "قابل اعتماد سروس" },
  "feature.trustedDesc": { en: "Over 500+ successful events with 5-star ratings", ur: "5 ستارہ ریٹنگ کے ساتھ 500+ کامیاب تقریبات" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  useEffect(() => {
    document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) return key;
    return translation[language] || translation.en || key;
  };

  const isRTL = language === "ur";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
