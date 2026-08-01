import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, isPast } from "date-fns";
import { Clock, PartyPopper } from "lucide-react";

interface EventCountdownProps {
  eventDate: string;
  eventName?: string;
}

const EventCountdown = ({ eventDate, eventName = "Your Event" }: EventCountdownProps) => {
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isPastEvent, setIsPastEvent] = useState(false);

  useEffect(() => {
    const calculateCountdown = () => {
      const eventDateTime = new Date(eventDate);
      const now = new Date();

      if (isPast(eventDateTime)) {
        setIsPastEvent(true);
        return;
      }

      const days = differenceInDays(eventDateTime, now);
      const hours = differenceInHours(eventDateTime, now) % 24;
      const minutes = differenceInMinutes(eventDateTime, now) % 60;
      const seconds = differenceInSeconds(eventDateTime, now) % 60;

      setCountdown({ days, hours, minutes, seconds });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);

    return () => clearInterval(interval);
  }, [eventDate]);

  if (isPastEvent) {
    return (
      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
        <CardContent className="p-6 text-center">
          <PartyPopper className="h-12 w-12 mx-auto text-green-500 mb-2" />
          <h3 className="text-xl font-bold text-green-700 dark:text-green-400">
            Event Completed!
          </h3>
          <p className="text-muted-foreground mt-1">
            We hope your event was amazing!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Countdown to {eventName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-background/50 rounded-lg p-3">
            <div className="text-3xl font-bold text-primary">{countdown.days}</div>
            <div className="text-xs text-muted-foreground uppercase">Days</div>
          </div>
          <div className="bg-background/50 rounded-lg p-3">
            <div className="text-3xl font-bold text-primary">{countdown.hours}</div>
            <div className="text-xs text-muted-foreground uppercase">Hours</div>
          </div>
          <div className="bg-background/50 rounded-lg p-3">
            <div className="text-3xl font-bold text-primary">{countdown.minutes}</div>
            <div className="text-xs text-muted-foreground uppercase">Minutes</div>
          </div>
          <div className="bg-background/50 rounded-lg p-3">
            <div className="text-3xl font-bold text-primary">{countdown.seconds}</div>
            <div className="text-xs text-muted-foreground uppercase">Seconds</div>
          </div>
        </div>

        {countdown.days <= 7 && countdown.days > 0 && (
          <p className="text-center mt-4 text-sm text-primary font-medium">
            🎉 Only {countdown.days} day{countdown.days > 1 ? "s" : ""} to go!
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default EventCountdown;
