import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await validateAuth(req);
  } catch {
    return unauthorizedResponse();
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
          { role: 'system', content: 'Du er en ekspert på norske matvarer. Din jobb er å foreslå VARIANTER eller TYPER av samme produkt. IKKE foreslå produkter som brukes sammen med varen. Svar BARE med en kommaseparert liste, ingen annen tekst.' },
          { role: 'user', content: `Bruker skriver: "${query}". Gi 3-5 spesifikke VARIANTER eller TYPER av dette produktet UTEN merkenavn.

VIKTIG: Foreslå kun varianter av SAMME produktkategori, IKKE produkter som spises sammen med det.

Eksempler på RIKTIG:
- "melk" → helmelk, lettmelk, skummet melk, laktosefri melk
- "kylling" → kyllingfilet, kyllingvinger, kyllinglår, hel kylling, strimlet kylling
- "smør" → meierismør, lettsmør, usaltet smør, smør med salt
- "ost" → gulost, brunost, hvitost, kremost, mozzarella
- "brød" → grovbrød, loff, rundstykker, ciabatta, pitabrød

Eksempler på FEIL (ikke gjør dette):
- "smør" → brød, vaffel, kjeks (dette er ting man bruker smør PÅ, ikke typer smør)
- "ost" → brødskive, kjeks (dette er ting man spiser ost MED)

Svar KUN med kommaseparerte varianter av "${query}", ingen annen tekst.` }
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
      JSON.stringify({ error: 'An internal error occurred. Please try again.', suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
