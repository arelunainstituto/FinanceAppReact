/**
 * Script one-off para limpar invoice items pendentes (órfãos) de todos os clientes Stripe.
 * 
 * Uso: npx ts-node src/scripts/cleanupStripeItems.ts
 */
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

async function main() {
  if (!STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY not set');
    process.exit(1);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' as any });

  console.log('🔍 Listing all customers...');
  const customers = await stripe.customers.list({ limit: 100 });
  console.log(`Found ${customers.data.length} customers`);

  let totalCleared = 0;

  for (const customer of customers.data) {
    const items = await stripe.invoiceItems.list({
      customer: customer.id,
      pending: true,
      limit: 100,
    });

    if (items.data.length > 0) {
      console.log(`\n🧹 Customer: ${customer.name || customer.email || customer.id}`);
      console.log(`   ${items.data.length} pending invoice items found:`);
      
      for (const item of items.data) {
        console.log(`   - ${item.description}: €${(item.amount / 100).toFixed(2)} (${item.id})`);
        await stripe.invoiceItems.del(item.id);
        totalCleared++;
      }
      console.log(`   ✅ Deleted ${items.data.length} items`);
    }
  }

  console.log(`\n✅ Done! Cleared ${totalCleared} pending invoice items total.`);
}

main().catch(console.error);
