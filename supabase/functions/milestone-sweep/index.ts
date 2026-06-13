import { adminClient } from '../_shared/admin.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const earlyReturn = handleOptions(req);
  if (earlyReturn) return earlyReturn;

  const supabase = adminClient();
  const { data: swept, error } = await supabase.rpc('do_milestone_sweep');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ swept }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
