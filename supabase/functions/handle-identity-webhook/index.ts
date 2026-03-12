import Stripe from "npm:stripe@^14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
});

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_IDENTITY_WEBHOOK_SECRET");
  
  if (!webhookSecret) {
      console.error("STRIPE_IDENTITY_WEBHOOK_SECRET not set");
      return new Response("Configuration error", { status: 500 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const session = event.data.object as any;
  const userId = session.metadata?.user_id;

  if (!userId) {
      console.error("No user_id in session metadata");
      return new Response("No user_id", { status: 200 });
  }

  console.log(`Processing event ${event.type} for user ${userId}`);

  switch (event.type) {
    case 'identity.verification_session.verified': {
      // Fetch the verification report to get user data
      const fullSession = await stripe.identity.verificationSessions.retrieve(session.id, {
        expand: ['last_verification_report'],
      });

      const report = fullSession.last_verification_report as any;
      if (report && report.document) {
        const doc = report.document;
        const firstName = doc.first_name || "";
        const lastName = doc.last_name || "";
        const dob = doc.dob;
        const address = doc.address;

        const updateData: any = {
          identity_verification_status: 'verified',
          is_verified: true,
          real_name: `${firstName} ${lastName}`.trim(),
          address_street: address?.line1,
          address_city: address?.city,
          address_zip: address?.postal_code,
          address_country: address?.country,
        };

        if (dob) {
          updateData.birthdate = `${dob.year}-${String(dob.month).padStart(2, '0')}-${String(dob.day).padStart(2, '0')}`;
        }

        const { error } = await supabaseAdmin
          .from("users")
          .update(updateData)
          .eq("id", userId);

        if (error) console.error("Error updating user on verified:", error);
      }
      break;
    }
    case 'identity.verification_session.requires_input': {
      if (session.last_error) {
        const { error } = await supabaseAdmin
          .from("users")
          .update({
            identity_verification_status: 'rejected',
          })
          .eq("id", userId);
        
        if (error) console.error("Error updating user on rejected:", error);
      }
      break;
    }
    case 'identity.verification_session.canceled': {
      const { error } = await supabaseAdmin
        .from("users")
        .update({
          identity_verification_status: 'none',
        })
        .eq("id", userId);
      
      if (error) console.error("Error updating user on canceled:", error);
      break;
    }
    case 'identity.verification_session.processing': {
      const { error } = await supabaseAdmin
        .from("users")
        .update({
          identity_verification_status: 'pending',
        })
        .eq("id", userId);
      
      if (error) console.error("Error updating user on processing:", error);
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
