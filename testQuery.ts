import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
supabase.from('products').select('id, title, province, condition, size, brand, userId, occasion, createdAt, Listing!inner(status)').limit(1).then(r => console.log(JSON.stringify(r)));
