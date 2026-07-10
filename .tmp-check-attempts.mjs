import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

const { data: profile } = await supabase.from('profiles').select('user_id, email').eq('email', 'szommark@gmail.com').maybeSingle();
console.log('PROFILE:', profile);

if (profile) {
  const { data: attempts } = await supabase.from('test_attempts').select('id, final_level, created_at').eq('user_id', profile.user_id);
  console.log('ATTEMPTS:', attempts);
}
