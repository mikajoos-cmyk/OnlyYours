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
        console.log(`📄 Processing invoice.paid: ${invoice.id}`);

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
          }
        }

        if (!subscriptionId) {
          console.log("⚠️ Skipping: No subscription ID found in invoice.");
          break;
        }

        // Abo laden für Metadaten & Laufzeiten
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        console.log(`🔍 Subscription retrieved: ${subscription.id}`);

        // Metadaten-Fallback (Robust gegen camelCase/snake_case)
        let fan_id = subscription.metadata.fan_id || subscription.metadata.userId || subscription.metadata.fanId;
        let creator_id = subscription.metadata.creator_id || subscription.metadata.creatorId;
        let tier_id = subscription.metadata.tier_id || subscription.metadata.tierId;

        if (!fan_id || !creator_id) {
          console.log("ℹ️ No IDs in subscription metadata, checking invoice lines...");
          if (invoice.lines && invoice.lines.data) {
            for (const line of invoice.lines.data) {
              const meta = line.metadata || {};
              if (meta.fan_id || meta.userId || meta.fanId) {
                fan_id = meta.fan_id || meta.userId || meta.fanId;
                creator_id = meta.creator_id || meta.creatorId;
                tier_id = meta.tier_id || meta.tierId;
                break;
              }
            }
          }
        }

        console.log(`👥 Metadata extracted -> Fan: ${fan_id}, Creator: ${creator_id}, Tier: ${tier_id}`);

        // Regulärer Preis aus dem Plan
        const planPrice = subscription.items.data[0]?.price.unit_amount ?? 0;
        const totalAmount = invoice.amount_paid / 100;
        const creatorShare = totalAmount * 0.8; // 80% gehen an den Creator
        const hasDirectTransfer = !!subscription.transfer_data?.destination;

        if (fan_id && creator_id) {
          console.log(`💾 Upserting subscription for fan ${fan_id}...`);
          const { error: subError } = await supabaseAdmin.from("subscriptions").upsert({
            fan_id: fan_id,
            creator_id: creator_id,
            tier_id: (tier_id === 'null' || !tier_id) ? null : tier_id,
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

          // Payment Record (Wir speichern den Creator-Anteil als Einnahme)
          console.log(`💰 Inserting payment record (Creator Share: ${creatorShare}€)...`);
          const { error: payError } = await supabaseAdmin.from("payments").insert({
            user_id: fan_id,
            creator_id: creator_id,
            amount: creatorShare,
            type: 'SUBSCRIPTION',
            status: 'SUCCESS',
            metadata: { 
                from_webhook: true, 
                stripe_sub_id: subscriptionId,
                stripe_invoice_id: invoice.id,
                full_amount: totalAmount,
                is_destination_charge: hasDirectTransfer
            }
          });
          
          if (payError) console.error('❌ Payment Insert Error:', payError);
          else {
              console.log('✅ Payment recorded.');
              
              // Wenn es eine Destination Charge war, markieren wir es sofort als ausgezahlt
              if (hasDirectTransfer) {
                  await supabaseAdmin.from("payouts").insert({
                      creator_id: creator_id,
                      amount: creatorShare,
                      status: 'COMPLETED',
                      payout_method: 'STRIPE_DIRECT',
                      completed_at: new Date().toISOString()
                  });
                  console.log('✅ Automatic payout record created (Destination Charge).');
              }
          }
        } else {
            console.error("❌ Missing fan_id or creator_id. Cannot save to DB.");
        }
        break;
      }

        // --- 2. ABO ÄNDERUNG (Upgrade/Downgrade/Kündigung/Reaktivierung) ---
      case 'customer.subscription.updated': {
        const sub = event.data.object as any;
        console.log(`🔄 Processing subscription.updated: ${sub.id}`);
        if (sub.id) {
          const currentPrice = sub.items?.data?.[0]?.price?.unit_amount ?? 0;

          let newStatus = 'ACTIVE';
          if (sub.status === 'canceled') newStatus = 'CANCELED';
          if (sub.status === 'unpaid' || sub.status === 'past_due') newStatus = 'EXPIRED';

          let endDateStr;
          if (sub.current_period_end) {
            endDateStr = new Date(sub.current_period_end * 1000).toISOString();
          }

          const updateData: any = {
            auto_renew: !sub.cancel_at_period_end,
            price: currentPrice / 100,
            status: newStatus,
          };

          if (endDateStr) {
            updateData.end_date = endDateStr;
          }

          if (sub.metadata?.tier_id && sub.metadata.tier_id !== 'null') {
            updateData.tier_id = sub.metadata.tier_id;
          }

          const { error: updateError } = await supabaseAdmin.from("subscriptions")
              .update(updateData)
              .eq("stripe_subscription_id", sub.id);

          if (updateError) console.error('❌ Sub Update Error:', updateError);
          else console.log(`ℹ️ Subscription ${sub.id} updated via webhook.`);
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
        console.log(`💰 Processing payment_intent.succeeded: ${pi.id}`);
        const meta = pi.metadata || {};
        const userId = meta.userId || meta.fan_id || meta.fanId;
        const type = meta.type;
        const postId = meta.postId || meta.post_id;
        const creatorId = meta.creatorId || meta.creator_id;

        console.log(`🏷️ Meta: userId=${userId}, type=${type}, creatorId=${creatorId}`);

        if (userId && type && type !== 'SUBSCRIPTION') {
          console.log(`💾 Inserting payment record for ${type}...`);
          const totalAmount = pi.amount / 100;
          const creatorShare = totalAmount * 0.8;
          const hasDirectTransfer = !!pi.transfer_data?.destination;

          const { error: payError } = await supabaseAdmin.from("payments").insert({
            user_id: userId,
            creator_id: creatorId || null,
            amount: creatorShare,
            type: type,
            status: 'SUCCESS',
            related_id: (postId && postId !== 'null') ? postId : (meta.productId || null),
            metadata: {
                ...meta,
                full_amount: totalAmount,
                is_destination_charge: hasDirectTransfer
            }
          });

          if (payError) console.error('❌ Payment Insert Error:', payError);
          else {
              console.log('✅ Payment recorded.');

              if (hasDirectTransfer && creatorId) {
                  await supabaseAdmin.from("payouts").insert({
                      creator_id: creatorId,
                      amount: creatorShare,
                      status: 'COMPLETED',
                      payout_method: 'STRIPE_DIRECT',
                      completed_at: new Date().toISOString()
                  });
                  console.log('✅ Automatic payout record created (Destination Charge).');
              }
          }
        } else {
            console.log(`ℹ️ Skipping payment record (either missing data or is SUBSCRIPTION which is handled by invoice.paid)`);
        }
        break;
      }

        // --- 6. CONNECT ACCOUNT UPDATE ---
      case 'account.updated': {
        const account = event.data.object as any;
        const onboardingComplete = account.details_submitted && 
                                  account.charges_enabled && 
                                  account.payouts_enabled;
        
        if (account.id) {
          await supabaseAdmin.from("users")
            .update({ stripe_onboarding_complete: onboardingComplete })
            .eq("stripe_account_id", account.id);
          console.log(`👤 Account ${account.id} updated: Onboarding Complete = ${onboardingComplete}`);
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