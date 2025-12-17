import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ suggestions: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    console.log('Getting suggestions for:', query);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Du er en ekspert på norske matvarer. Din jobb er å gi generiske vareforslag UTEN merkenavn. Gi alltid 3-5 enkle, generiske forslag. Svar BARE med en kommaseparert liste, ingen annen tekst.' },
          { role: 'user', content: `Bruker søker etter: "${query}". Gi 3-5 generiske vareforslag UTEN merkenavn. For eksempel, hvis brukeren skriver "melk", foreslå "helmelk", "lettmelk", "skummet melk". Hvis de skriver "kylling", foreslå "kyllingfilet", "kyllingvinger", "kyllinglår". ALDRI inkluder merkenavn som Tine, Q, Rørosmeiriet, osv. BARE generiske varenavn, kommaseparert, ingen annen tekst.` }
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error('Lovable AI error:', aiResponse.status, await aiResponse.text());
      return new Response(JSON.stringify({ suggestions: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiResponse.json();
    const aiSuggestions = aiData.choices?.[0]?.message?.content || '';
    console.log('AI suggestions:', aiSuggestions);

    const suggestions = aiSuggestions.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0).slice(0, 5);

    return new Response(JSON.stringify({ suggestions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in suggest-items function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
