// Arquivo: backend/simular-mes-2.js

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
// Carrega as variáveis do seu arquivo .env local
require('dotenv').config({ path: __dirname + '/.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('1. Simulando a cobrança do MÊS SEGUINTE para o contrato 4132...');

    await stripe.invoiceItems.create({
        customer: 'cus_UPxkb32rpzKhIf', // Cliente do contrato 4132
        amount: 100000, // 1000 EUR
        currency: 'eur',
        description: 'Cobrança do 2º Mês - Contrato 4132',
    });

    console.log('2. Criando a fatura com o ID interno do contrato...');
    const invoice = await stripe.invoices.create({
        customer: 'cus_UPxkb32rpzKhIf',
        auto_advance: false,
        metadata: {
            internal_contract_id: '50beff4e-8316-4ce4-824f-549e1b216992' // Contrato 4132
        }
    });

    console.log('3. Debitando o cartão para disparar o Webhook...');
    const paidInvoice = await stripe.invoices.pay(invoice.id);
    console.log(`Fatura paga na Stripe com ID: ${paidInvoice.id}`);

    console.log('4. Aguardando 4 segundos para a internet entregar o Webhook ao seu localhost...');
    await new Promise(r => setTimeout(r, 4000));

    console.log('5. Tabela atualizada no Supabase (Note que agora a 2ª parcela também deve estar PAGA):');
    const { data: p, error } = await supabase
        .from('payments')
        .select('due_date, payment_type, amount, paid_amount, paid_date, status, external_id')
        .eq('contract_id', '50beff4e-8316-4ce4-824f-549e1b216992')
        .order('due_date');

    if (error) {
        console.error('Erro ao buscar payments no Supabase:', error);
    } else if (p) {
        console.log(JSON.stringify(p.slice(0, 6), null, 2));
    } else {
        console.log('Nenhum dado retornado.');
    }
}

run().catch(console.error);
