import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const adminEmail = Deno.env.get("ADMIN_EMAIL") || "admin@royalvenue.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Basic HTML escape to prevent stored data from breaking out into the email markup
const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sendEmail = async (to: string, subject: string, html: string) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Qassr-e Mussarat <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const bookingId: string | undefined = body?.bookingId;

    if (!bookingId || typeof bookingId !== "string" || !/^[0-9a-f-]{36}$/i.test(bookingId)) {
      return new Response(JSON.stringify({ error: "Valid bookingId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the booking server-side using service role so customer-controlled
    // input cannot be used to spam arbitrary email addresses.
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("name, email, phone, event_date, package_type, guests, total_price, message, menu_items, venue_id")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let venueName = "";
    if (booking.venue_id) {
      const { data: venue } = await supabase
        .from("venues")
        .select("name")
        .eq("id", booking.venue_id)
        .maybeSingle();
      venueName = venue?.name ?? "";
    }

    const menuItems = Array.isArray(booking.menu_items) ? booking.menu_items : [];
    const menuItemsList = menuItems.length > 0
      ? `<ul>${menuItems.map((item: { name?: string; price?: number }) => `<li>${esc(item?.name)} - Rs. ${esc(item?.price)}/person</li>`).join("")}</ul>`
      : "<p>No menu items selected</p>";

    const customerEmailHtml = `
      <!DOCTYPE html><html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#8B7355,#D4AF37);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0;">
            <h1>Qassr-e Mussarat</h1><p>Booking Confirmation</p>
          </div>
          <div style="background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px;">
            <h2>Dear ${esc(booking.name)},</h2>
            <p>Thank you for your booking inquiry! We have received your request and our team will review it shortly.</p>
            <p>Status: <span style="background:#FFA500;color:white;padding:5px 15px;border-radius:20px;">Pending Approval</span></p>
            <div style="background:white;padding:20px;border-radius:8px;margin:20px 0;">
              <h3>Booking Details</h3>
              <p>Event Date: <strong>${esc(booking.event_date)}</strong></p>
              <p>Venue: <strong>${esc(venueName)}</strong></p>
              <p>Package: <strong>${esc(booking.package_type)}</strong></p>
              <p>Number of Guests: <strong>${esc(booking.guests)}</strong></p>
              <h4>Selected Menu Items:</h4>
              ${menuItemsList}
              ${booking.message ? `<h4>Special Requirements:</h4><p>${esc(booking.message)}</p>` : ""}
              <div style="font-size:24px;color:#8B7355;font-weight:bold;text-align:right;margin-top:20px;">
                Estimated Total: Rs. ${esc(Number(booking.total_price ?? 0).toLocaleString())}
              </div>
            </div>
            <p>We will contact you within 24 hours to confirm your booking.</p>
          </div>
        </div>
      </body></html>
    `;

    const adminEmailHtml = `
      <!DOCTYPE html><html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#DC143C,#8B0000);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0;">
            <h1>🔔 New Booking Inquiry</h1>
          </div>
          <div style="background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px;">
            <h3>Customer Information</h3>
            <p>Name: <strong>${esc(booking.name)}</strong></p>
            <p>Email: <strong>${esc(booking.email)}</strong></p>
            <p>Phone: <strong>${esc(booking.phone)}</strong></p>
            <h3>Event Details</h3>
            <p>Event Date: <strong>${esc(booking.event_date)}</strong></p>
            <p>Venue: <strong>${esc(venueName)}</strong></p>
            <p>Package: <strong>${esc(booking.package_type)}</strong></p>
            <p>Number of Guests: <strong>${esc(booking.guests)}</strong></p>
            <h4>Selected Menu Items:</h4>
            ${menuItemsList}
            ${booking.message ? `<h4>Special Requirements:</h4><p>${esc(booking.message)}</p>` : ""}
            <div style="font-size:24px;color:#DC143C;font-weight:bold;text-align:right;margin-top:20px;">
              Estimated Total: Rs. ${esc(Number(booking.total_price ?? 0).toLocaleString())}
            </div>
          </div>
        </div>
      </body></html>
    `;

    await sendEmail(
      booking.email,
      `Booking Inquiry Received - ${booking.event_date}`,
      customerEmailHtml,
    );
    await sendEmail(
      adminEmail,
      `🔔 New Booking: ${booking.name} - ${booking.event_date}`,
      adminEmailHtml,
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending emails:", errorMessage);
    return new Response(JSON.stringify({ error: "Failed to send emails" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
