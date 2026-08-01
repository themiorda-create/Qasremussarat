import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "admin@royalvenue.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

interface MeetingUpdateRequest {
  email: string;
  name: string;
  originalTime: string;
  newTime: string;
  status: string;
  adminNotes?: string;
}

const formatDateTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { email, name, originalTime, newTime, status, adminNotes }: MeetingUpdateRequest =
      await req.json();

    console.log("Sending meeting update email to:", email);

    let subject = "";
    let htmlContent = "";

    if (status === "rescheduled") {
      subject = "Meeting Time Updated - Royal Venue";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8B4513;">Meeting Rescheduled</h1>
          <p>Dear ${name},</p>
          <p>We've reviewed your meeting request and would like to propose a different time:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Originally Requested:</strong><br/>${formatDateTime(originalTime)}</p>
            <p><strong>New Proposed Time:</strong><br/>${formatDateTime(newTime)}</p>
          </div>
          
          ${adminNotes ? `
            <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Message from our team:</strong></p>
              <p>${adminNotes}</p>
            </div>
          ` : ""}
          
          <p>Please let us know if this new time works for you by replying to this email or calling us.</p>
          
          <p>Best regards,<br/>Royal Venue Team</p>
        </div>
      `;
    } else if (status === "approved") {
      subject = "Meeting Confirmed - Royal Venue";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #228B22;">Meeting Confirmed!</h1>
          <p>Dear ${name},</p>
          <p>Great news! Your meeting has been confirmed.</p>
          
          <div style="background-color: #e8f8e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Confirmed Time:</strong><br/>${formatDateTime(newTime || originalTime)}</p>
          </div>
          
          <p>We look forward to meeting you!</p>
          
          <p>Best regards,<br/>Royal Venue Team</p>
        </div>
      `;
    } else if (status === "rejected") {
      subject = "Meeting Request Update - Royal Venue";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8B4513;">Meeting Request Update</h1>
          <p>Dear ${name},</p>
          <p>Unfortunately, we are unable to accommodate your meeting request at this time.</p>
          
          ${adminNotes ? `
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p>${adminNotes}</p>
            </div>
          ` : ""}
          
          <p>Please feel free to submit another request for a different time, or contact us directly.</p>
          
          <p>Best regards,<br/>Royal Venue Team</p>
        </div>
      `;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Royal Venue <onboarding@resend.dev>`,
        to: [email],
        subject,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Failed to send email:", error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const data = await res.json();
    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-meeting-update function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
