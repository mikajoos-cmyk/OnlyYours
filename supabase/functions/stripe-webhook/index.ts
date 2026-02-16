// supabase/functions/stripe-webhook/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@^14.25.0'

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET");

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature || !endpointSecret) {
    return new Response("Webhook Error: Signature missing", { status: 400 });
  }

  const body = await req.text();
  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook verification failed: ${err.message}`);
    return new Response(err.message, { status: 400 });
  }

  // Admin Client erstellen (Service Role)
  const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  console.log(`🔔 Event received: ${event.type}`);

  try {
    switch (event.type) {

        // --- 1. ABO ZAHLUNG / UPDATE ---
      case 'invoice.paid': {
        const invoice = event.data.object as any;

        // ID finden
        let subscriptionId = typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id;

        // Fallback Suche in Lines
        if (!subscriptionId && invoice.lines && invoice.lines.data) {
          for (const line of invoice.lines.data) {
            if (line.subscription) {
              subscriptionId = line.subscription;
              break;
            }
            if (line.parent?.subscription_item_details?.subscription) {
              subscriptionId = line.parent.subscription_item_details.subscription;
              break;
            }
          }
        }

        if (!subscriptionId) {
          console.log("Skipping: No subscription ID found in invoice.");
          break;
        }

        // Abo laden für Metadaten & Laufzeiten
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Metadaten-Fallback
        let { fan_id, creator_id, tier_id } = subscription.metadata;
        if (!fan_id || !creator_id) {
          if (invoice.lines && invoice.lines.data) {
            for (const line of invoice.lines.data) {
              if (line.metadata && line.metadata.fan_id) {
                fan_id = line.metadata.fan_id;
                creator_id = line.metadata.creator_id;
                tier_id = line.metadata.tier_id;
                break;
              }
            }
          }
        }

        // Regulärer Preis aus dem Plan
        const planPrice = subscription.items.data[0]?.price.unit_amount ?? 0;

        console.log(`Processing Sub ${subscriptionId} -> Fan: ${fan_id}, Plan Price: ${planPrice/100}`);

        if (fan_id && creator_id) {
          const { error: subError } = await supabaseAdmin.from("subscriptions").upsert({
            fan_id: fan_id,
            creator_id: creator_id,
            tier_id: tier_id === 'null' ? null : tier_id,
            status: 'ACTIVE',
            price: planPrice / 100,
            start_date: new Date(subscription.start_date * 1000).toISOString(),
            end_date: new Date(subscription.current_period_end * 1000).toISOString(),
            auto_renew: !subscription.cancel_at_period_end,
            stripe_subscription_id: subscriptionId
          }, {
            onConflict: 'stripe_subscription_id'
          });

          if (subError) console.error('❌ Sub Upsert Error:', subError);
          else console.log('✅ Subscription DB synced.');

          // Payment Record
          await supabaseAdmin.from("payments").insert({
            user_id: fan_id,
            creator_id: creator_id,
            amount: invoice.amount_paid / 100,
            type: 'SUBSCRIPTION',
            status: 'SUCCESS',
            metadata: { from_webhook: true, stripe_sub_id: subscriptionId }
          });
        }
        break;
      }

        // --- 2. ABO ÄNDERUNG (Upgrade/Downgrade/Kündigung/Reaktivierung) ---
      case 'customer.subscription.updated': {
        const sub = event.data.object as any;
        if (sub.id) {
          const currentPrice = sub.items?.data?.[0]?.price?.unit_amount ?? 0;

          let newStatus = 'ACTIVE';
          if (sub.status === 'canceled') newStatus = 'CANCELED';
          if (sub.status === 'unpaid' || sub.status === 'past_due') newStatus = 'EXPIRED';

          // FIX: Kein Fallback auf "Heute" mehr!
          // Wir schreiben das Enddatum nur, wenn wir es sicher von Stripe bekommen.
          let endDateStr;
          if (sub.current_period_end) {
            endDateStr = new Date(sub.current_period_end * 1000).toISOString();
          }

          const updateData: any = {
            auto_renew: !sub.cancel_at_period_end,
            price: currentPrice / 100,
            status: newStatus,
          };

          // Nur updaten, wenn Datum vorhanden. Sonst DB-Wert behalten.
          if (endDateStr) {
            updateData.end_date = endDateStr;
          }

          // Tier ID nur updaten, wenn explizit vorhanden
          if (sub.metadata?.tier_id && sub.metadata.tier_id !== 'null') {
            updateData.tier_id = sub.metadata.tier_id;
          }

          await supabaseAdmin.from("subscriptions")
              .update(updateData)
              .eq("stripe_subscription_id", sub.id);

          console.log(`ℹ️ Subscription ${sub.id} updated via webhook (Auto-Renew: ${!sub.cancel_at_period_end})`);
        }
        break;
      }

        // --- 3. ABO ENDGÜLTIG GELÖSCHT ---
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        if (sub.id) {
          await supabaseAdmin.from("subscriptions")
              .update({ status: 'CANCELED', auto_renew: false })
              .eq("stripe_subscription_id", sub.id);
          console.log(`❌ Subscription ${sub.id} marked CANCELED`);
        }
        break;
      }

        // --- 4. ZAHLUNG FEHLGESCHLAGEN ---
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        if (subId) {
          await supabaseAdmin.from("subscriptions")
              .update({ status: 'EXPIRED', auto_renew: false })
              .eq("stripe_subscription_id", subId);
        }
        break;
      }

        // --- 5. EINMALZAHLUNGEN ---
      case 'payment_intent.succeeded': {
        const pi = event.data.object as any;
        const { userId, type, postId } = pi.metadata || {};

        if (userId && type && type !== 'SUBSCRIPTION') {
          await supabaseAdmin.from("payments").insert({
            user_id: userId,
            creator_id: pi.metadata.creatorId || null,
            amount: pi.amount / 100,
            type: type,
            status: 'SUCCESS',
            related_id: postId || pi.metadata.productId || null,
            metadata: pi.metadata
          });
        }
        break;
      }
    }
  } catch (err: any) {
    console.error(`Webhook Logic Error: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), { status: 200 }); // Status 200 um Retries zu verhindern bei Logikfehlern
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});