import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { classifyNova, VERSION, RULESET_DATE } from "../_shared/novaClassifier.ts";
import type { ClassificationInput } from "../_shared/novaClassifier.ts";

const ClassifyInputSchema = z.object({
  ingredients_text: z.string().max(5000),
  additives: z.array(z.string()).optional(),
  product_category: z.string().optional(),
  language: z.string().default('no').optional()
});

const BatchInputSchema = z.array(ClassifyInputSchema).max(100);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await validateAuth(req);
  } catch {
    return unauthorizedResponse();
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    if (req.method === 'GET' && path.endsWith('/health')) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'GET' && path.endsWith('/version')) {
      return new Response(JSON.stringify({ version: VERSION, ruleset_date: RULESET_DATE }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST' && path.endsWith('/classify-nova')) {
      const body = await req.json();
      const validationResult = ClassifyInputSchema.safeParse(body);
      if (!validationResult.success) {
        return new Response(JSON.stringify({ error: 'Validation error', details: validationResult.error.format() }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const result = classifyNova(validationResult.data as ClassificationInput);
      return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST' && path.endsWith('/classify-batch')) {
      const body = await req.json();
      const validationResult = BatchInputSchema.safeParse(body);
      if (!validationResult.success) {
        return new Response(JSON.stringify({ error: 'Validation error', details: validationResult.error.format() }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const results = validationResult.data.map(item => classifyNova(item as ClassificationInput));
      return new Response(JSON.stringify(results), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Not found', available_endpoints: ['GET /health', 'GET /version', 'POST /classify-nova', 'POST /classify-batch'] }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred. Please try again.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
