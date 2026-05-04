import dotenv from 'dotenv';
dotenv.config();
import { ContractService } from './src/services/contractService';

async function test() {
  try {
    const service = new ContractService();
    const contract = await service.createContract({
      client_id: '240b327f-a440-4d96-b7ff-18f48d5bf0e8',
      value: 100,
      start_date: '2025-05-04',
      first_installment_date: '2025-05-04',
      number_of_payments: 2,
      payment_frequency: 'Mensal',
      status: 'ativo',
      payment_method: 'Stripe'
    } as any);
    console.log("Success:", contract);
  } catch (e: any) {
    console.error("ERRO TESTE:", e.message);
    if (e.raw) {
       console.error("Stripe Error Details:", e.raw);
    }
  }
}
test();
