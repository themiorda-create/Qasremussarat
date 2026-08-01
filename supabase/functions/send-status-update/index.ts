import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function requireAdmin(req: Request): Promise<{ ok: true } | { ok: false; response: Response }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false, response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, response: new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
  if (!roleData) {
    return { ok: false, response: new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  return { ok: true };
}

interface StatusUpdateRequest {
  customerName: string;
  customerEmail: string;
  eventDate: string;
  venueName: string;
  newStatus: string;
  totalPrice: number;
}

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

const getStatusMessage = (status: string): { subject: string; message: string; color: string } => {
  switch (status) {
    case "confirmed":
      return {
        subject: "🎉 Booking Confirmed!",
        message: "Great news! Your booking has been confirmed. We're excited to host your event!",
        color: "#28a745"
      };
    case "cancelled":
      return {
        subject: "Booking Cancelled",
        message: "We regret to inform you that your booking has been cancelled. If you have any questions, please contact us.",
        color: "#dc3545"
      };
    case "completed":
      return {
        subject: "Thank You for Choosing Us!",
        message: "We hope your event was wonderful! Thank you for choosing Qassr-e Mussarat. We'd love to host you again!",
        color: "#007bff"
      };
    default:
      return {
        subject: "Booking Status Update",
        message: `Your booking status has been updated to: ${status}`,
        color: "#6c757d"
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const data: StatusUpdateRequest = await req.json();
    console.log("Sending status update email for:", data.customerName, "Status:", data.newStatus);

    const statusInfo = getStatusMessage(data.newStatus);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8B7355, #D4AF37); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .status-badge { display: inline-block; background: ${statusInfo.color}; color: white; padding: 10px 25px; border-radius: 25px; font-size: 18px; font-weight: bold; margin: 20px 0; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Qassr-e Mussarat</h1>
            <p>Booking Update</p>
          </div>
          <div class="content">
            <h2>Dear ${data.customerName},</h2>
            
            <p>${statusInfo.message}</p>
            
            <div style="text-align: center;">
              <span class="status-badge">${data.newStatus.toUpperCase()}</span>
            </div>
            
            <div class="details">
              <h3>Booking Details</h3>
              <div class="detail-row"><span>Event Date:</span><strong>${data.eventDate}</strong></div>
              <div class="detail-row"><span>Venue:</span><strong>${data.venueName}</strong></div>
              <div class="detail-row"><span>Total Amount:</span><strong>Rs. ${data.totalPrice.toLocaleString()}</strong></div>
            </div>
            
            <p>If you have any questions, please don't hesitate to contact us.</p>
          </div>
          <div class="footer">
            <p>Qassr-e Mussarat - Where Dreams Come True</p>
            <p>Phone: +92 XXX XXXXXXX | Email: info@qassremussarat.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await sendEmail(
      data.customerEmail,
      `${statusInfo.subject} - ${data.eventDate}`,
      emailHtml
    );

    console.log("Status update email sent:", response);

    return new Response(
      JSON.stringify({ success: true, response }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending status update email:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
