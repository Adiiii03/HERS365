import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env.production' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-03-31.basil' as any,
});

async function main() {
  console.log('Testing Stripe Live Key:', process.env.STRIPE_SECRET_KEY?.substring(0, 14) + '...');
  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'H.E.R.S.365 - Pro Subscription' },
          unit_amount: 2999,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: 'http://localhost/success',
      cancel_url: 'http://localhost/cancel',
    });
    console.log('✅ Success! Session ID:', session.id);
    console.log('✅ Session URL:', session.url);
  } catch (err: any) {
    console.error('❌ Stripe Error:', err.message);
  }
  process.exit(0);
}
main();
