import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Testing live connection to:', supabaseUrl);
  const { data: businesses, error: bizErr } = await supabase.from('businesses').select('*');
  if (bizErr) {
    console.error('Error fetching businesses:', bizErr.message);
  } else {
    console.log('✅ Connected! Businesses found in database:', businesses);
  }

  const { data: customers, error: custErr } = await supabase.from('customers').select('*');
  if (custErr) {
    console.error('Error fetching customers:', custErr.message);
  } else {
    console.log('✅ Customers found in database:', customers?.map(c => c.name));
  }

  const { data: products, error: prodErr } = await supabase.from('products').select('*');
  if (prodErr) {
    console.error('Error fetching products:', prodErr.message);
  } else {
    console.log('✅ Products found in database:', products?.map(p => `${p.name} (₹${p.unit_price})`));
  }
}

check().catch(console.error);
