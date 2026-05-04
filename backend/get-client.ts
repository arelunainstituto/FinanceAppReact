import { supabase } from './src/config/database';

async function run() {
  const { data } = await supabase.from('clients').select('id').limit(1);
  console.log(data);
}
run();
