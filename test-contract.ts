import { ContractService } from './backend/src/services/contractService';
import { stripeService } from './backend/src/services/stripeService';

async function test() {
  const service = new ContractService();
  try {
    const preview = await service.createContract({
      client_id: 'cus_TEST', // we need a real client id from DB or bypass
      value: 100,
      start_date: new Date(),
      number_of_payments: 2,
      payment_frequency: 'Mensal',
      status: 'ativo'
    } as any);
    console.log(preview);
  } catch (e) {
    console.error(e);
  }
}
test();
