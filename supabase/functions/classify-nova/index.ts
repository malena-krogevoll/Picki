import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERSION = "1.0.0";
const RULESET_DATE = "2025-01-15";

interface Rule {
  id: string;
  pattern: RegExp;
  type: 'strong' | 'weak' | 'real_food';
  description: string;
}

const UPF_STRONG_RULES: Rule[] = [
  { id: "UPF_STRONG_AROMA_GENERIC", pattern: /\baroma(er)?\b/gi, type: 'strong', description: "Generisk aroma" },
  { id: "UPF_STRONG_AROMA_NATURAL", pattern: /\bnaturlig(e)? aroma(er)?\b/gi, type: 'strong', description: "Naturlig aroma" },
  { id: "UPF_STRONG_AROMA_SMOKE", pattern: /\brøkaroma\b/gi, type: 'strong', description: "Røkaroma" },
  { id: "UPF_STRONG_MSG", pattern: /\b(mononatriumglutamat|E ?621)\b/gi, type: 'strong', description: "Mononatriumglutamat" },
  { id: "UPF_STRONG_YEAST_EXTRACT", pattern: /\bgjærekstrakt\b/gi, type: 'strong', description: "Gjærekstrakt" },
  { id: "UPF_STRONG_SWEETENER", pattern: /\b(aspartam|acesulfam ?k|sukralose|sakkarin|neotam|advantam|stevi(a|ol))\b/gi, type: 'strong', description: "Kunstig søtstoff" },
  { id: "UPF_STRONG_SWEETENER_E", pattern: /\bE ?9[56]\d\b/gi, type: 'strong', description: "E-nummer søtstoff (E950-E969)" },
  { id: "UPF_STRONG_EMULSIFIER", pattern: /\bemulgator(er)?\b/gi, type: 'strong', description: "Emulgator" },
  { id: "UPF_STRONG_STABILIZER", pattern: /\bstabilisator(er)?\b/gi, type: 'strong', description: "Stabilisator" },
  { id: "UPF_STRONG_THICKENER", pattern: /\bfortykningsmiddel\b/gi, type: 'strong', description: "Fortykningsmiddel" },
  { id: "UPF_STRONG_E400", pattern: /\bE ?4\d{2}\b/gi, type: 'strong', description: "E400-serie (emulgatorer/stabilisatorer)" },
  { id: "UPF_STRONG_XANTHAN", pattern: /\b(xanthan|E ?415)\b/gi, type: 'strong', description: "Xanthan gum" },
  { id: "UPF_STRONG_CARRAGEENAN", pattern: /\b(karragenan|E ?407)\b/gi, type: 'strong', description: "Karragenan" },
  { id: "UPF_STRONG_GLUCOSE_SYRUP", pattern: /\b(glukose|fruktose|invertert)[-\s]?sirup\b/gi, type: 'strong', description: "Industriell sirup" },
  { id: "UPF_STRONG_MALTODEXTRIN", pattern: /\bmaltodekstrin\b/gi, type: 'strong', description: "Maltodekstrin" },
  { id: "UPF_STRONG_MODIFIED_STARCH", pattern: /\bmodifisert(e)? stivelse\b/gi, type: 'strong', description: "Modifisert stivelse" },
  { id: "UPF_STRONG_MODIFIED_STARCH_E", pattern: /\bE ?1(404|4[1-5]\d)\b/gi, type: 'strong', description: "E-nummer modifisert stivelse" },
  { id: "UPF_STRONG_HYDROGENATED_FAT", pattern: /\b(hydrogenert|delvis herdet|interesterifisert)\b/gi, type: 'strong', description: "Industrielt bearbeidet fett" },
  { id: "UPF_STRONG_WHEY_ISOLATE", pattern: /\b(myseprotein(konsentrat|isolat)|whey protein( isolate)?)\b/gi, type: 'strong', description: "Myseproteinisolat" },
  { id: "UPF_STRONG_SOY_ISOLATE", pattern: /\bsoyaprotein( isolat)?\b/gi, type: 'strong', description: "Soyaproteinisolat" },
  { id: "UPF_STRONG_COLORANT", pattern: /\bfargestoff\b/gi, type: 'strong', description: "Fargestoff" },
  { id: "UPF_STRONG_CARAMEL_COLOR", pattern: /\b(karamellfarge|E ?150[a-d])\b/gi, type: 'strong', description: "Karamellfarge" },
  { id: "UPF_STRONG_CARMINE", pattern: /\b(karmin|E ?120|annatto|E ?160b)\b/gi, type: 'strong', description: "Karmin/Annatto" },
];

const UPF_WEAK_RULES: Rule[] = [
  { id: "UPF_WEAK_PRESERVATIVE", pattern: /\bkonserveringsmiddel\b/gi, type: 'weak', description: "Konserveringsmiddel" },
  { id: "UPF_WEAK_E200", pattern: /\bE ?2\d{2}\b/gi, type: 'weak', description: "E200-serie (konserveringsmidler)" },
  { id: "UPF_WEAK_ANTIOXIDANT", pattern: /\bantioksidant(er)?\b/gi, type: 'weak', description: "Antioksidant" },
  { id: "UPF_WEAK_E300", pattern: /\bE ?3\d{2}\b/gi, type: 'weak', description: "E300-serie (antioksidanter)" },
  { id: "UPF_WEAK_HUMECTANT", pattern: /\bfuktighetsbevarende\b/gi, type: 'weak', description: "Fuktighetsbevarende middel" },
  { id: "UPF_WEAK_SORBITOL", pattern: /\b(sorbitol|E ?420)\b/gi, type: 'weak', description: "Sorbitol" },
  { id: "UPF_WEAK_GLYCEROL", pattern: /\b(glyserol|E ?422)\b/gi, type: 'weak', description: "Glyserol" },
  { id: "UPF_WEAK_PALM_OIL", pattern: /\bpalmeolje\b/gi, type: 'weak', description: "Palmeolje" },
  { id: "UPF_WEAK_REFINED_OIL", pattern: /\braffinert(e)? vegetabilsk(e)? olje(r)?\b/gi, type: 'weak', description: "Raffinert vegetabilsk olje" },
];

const REAL_FOOD_RULES: Rule[] = [
  { id: "REAL_FOOD_WHOLE_GRAIN", pattern: /\bhel(e)? korn\b/gi, type: 'real_food', description: "Hele korn" },
  { id: "REAL_FOOD_WHOLE_NUTS", pattern: /\bhele nøtter\b/gi, type: 'real_food', description: "Hele nøtter" },
  { id: "REAL_FOOD_LEGUMES", pattern: /\bbelgfrukter\b/gi, type: 'real_food', description: "Belg frukter" },
  { id: "REAL_FOOD_FRUIT", pattern: /\bfrukt(er)?\b/gi, type: 'real_food', description: "Frukt" },
  { id: "REAL_FOOD_VEGETABLES", pattern: /\bgrønnsaker\b/gi, type: 'real_food', description: "Grønnsaker" },
  { id: "REAL_FOOD_RAW_MILK", pattern: /\brå melk\b/gi, type: 'real_food', description: "Rå melk" },
  { id: "REAL_FOOD_RAW_COCOA", pattern: /\brå kakao\b/gi, type: 'real_food', description: "Rå kakao" },
  { id: "REAL_FOOD_PASTEURIZED", pattern: /\bpasteurisert\b/gi, type: 'real_food', description: "Pasteurisert (tradisjonell prosess)" },
  { id: "REAL_FOOD_FERMENTED", pattern: /\bfermentert\b/gi, type: 'real_food', description: "Fermentert" },
  { id: "REAL_FOOD_DRIED", pattern: /\btørket\b/gi, type: 'real_food', description: "Tørket" },
  { id: "REAL_FOOD_SMOKED", pattern: /\brøkt\b(?!\s*aroma)/gi, type: 'real_food', description: "Røkt (ikke røkaroma)" },
];

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').replace(/%/g, '').trim();
}

function extractIngredients(text: string): string[] {
  return text.split(/[,;]/).map(ing => ing.trim()).filter(ing => ing.length > 0);
}

function extractENumbers(text: string): string[] {
  const eNumberPattern = /\bE ?\d{3}[a-d]?\b/gi;
  const matches = text.match(eNumberPattern) || [];
  return [...new Set(matches.map(e => e.replace(/\s+/g, '').toUpperCase()))];
}

interface Signal {
  type: 'strong' | 'weak' | 'real_food';
  rule_id: string;
  match: string;
  description: string;
}

function matchRules(text: string, rules: Rule[]): Signal[] {
  const signals: Signal[] = [];
  for (const rule of rules) {
    const matches = text.match(rule.pattern);
    if (matches && matches.length > 0) {
      const uniqueMatches = [...new Set(matches)];
      for (const match of uniqueMatches) {
        signals.push({ type: rule.type, rule_id: rule.id, match: match.trim(), description: rule.description });
      }
    }
  }
  return signals;
}

interface ClassificationInput {
  ingredients_text: string;
  additives?: string[];
  product_category?: string;
  language?: string;
}

interface ClassificationResult {
  nova_group: 1 | 2 | 3 | 4 | null;
  confidence: number;
  reasoning: string;
  signals: Signal[];
  has_ingredients: boolean;
  is_estimated: boolean;
  debug: {
    ingredients_count: number;
    has_e_numbers: boolean;
    e_numbers: string[];
    strong_hits: number;
    weak_hits: number;
    real_food_hits: number;
    normalized_text_sample: string;
  };
  version: string;
  timestamp: string;
}

// High-risk categories that are typically NOVA 4 (ultra-processed)
const HIGH_RISK_CATEGORIES = ['pizza', 'ferdigrett', 'chips', 'godteri', 'snacks', 'brus', 'kjeks', 'is', 'pølse', 'bacon'];

function classifyNova(input: ClassificationInput): ClassificationResult {
  const { ingredients_text, additives = [], product_category } = input;
  
  if (!ingredients_text || ingredients_text.trim().length === 0) {
    const categoryLower = (product_category || '').toLowerCase();
    const isHighRiskCategory = HIGH_RISK_CATEGORIES.some(cat => categoryLower.includes(cat));
    
    return {
      nova_group: isHighRiskCategory ? 4 : null,
      confidence: isHighRiskCategory ? 0.15 : 0,
      has_ingredients: false,
      is_estimated: true,
      reasoning: isHighRiskCategory 
        ? `Ingrediensliste mangler. Basert på produktkategori (${product_category}) anslås produktet som sterkt bearbeidet (NOVA 4), men dette er usikkert.`
        : 'Ingen ingrediensinformasjon tilgjengelig. Klassifisering ikke mulig uten ingrediensliste.',
      signals: [],
      debug: { ingredients_count: 0, has_e_numbers: false, e_numbers: [], strong_hits: 0, weak_hits: 0, real_food_hits: 0, normalized_text_sample: "" },
      version: VERSION, timestamp: new Date().toISOString()
    };
  }
  
  const normalizedText = normalizeText(ingredients_text);
  const ingredients = extractIngredients(normalizedText);
  const ingredientsCount = ingredients.length;
  const detectedENumbers = extractENumbers(normalizedText);
  const allENumbers = [...new Set([...detectedENumbers, ...additives])];
  const hasENumbers = allENumbers.length > 0;
  
  const strongSignals = matchRules(normalizedText, UPF_STRONG_RULES);
  const weakSignals = matchRules(normalizedText, UPF_WEAK_RULES);
  const realFoodSignals = matchRules(normalizedText, REAL_FOOD_RULES);
  
  const strongHits = strongSignals.length;
  const weakHits = weakSignals.length;
  const realFoodHits = realFoodSignals.length;
  const allSignals = [...strongSignals, ...weakSignals, ...realFoodSignals];
  
  const isHighRiskCategory = ['snacks', 'kjeks', 'frokostblanding', 'pålegg', 'ferdigrett'].includes(product_category || '');
  
  let novaGroup: 1 | 2 | 3 | 4;
  let baseConfidence: number;
  
  if (strongHits >= 1) {
    novaGroup = 4;
    baseConfidence = 0.7 + Math.min(strongHits * 0.1, 0.25);
  } else if (ingredientsCount >= 8 && (hasENumbers || weakHits >= 2)) {
    novaGroup = 4;
    baseConfidence = 0.6 + (hasENumbers ? 0.1 : 0) + Math.min(weakHits * 0.05, 0.15);
  } else if (isHighRiskCategory && weakHits >= 2) {
    novaGroup = 4;
    baseConfidence = 0.55 + Math.min(weakHits * 0.05, 0.2);
  } else if (weakHits >= 1 || hasENumbers) {
    novaGroup = 3;
    baseConfidence = 0.5 + Math.min(weakHits * 0.05, 0.2) + (hasENumbers ? 0.1 : 0);
  } else if (ingredientsCount <= 3 && realFoodHits >= 1) {
    novaGroup = 1;
    baseConfidence = 0.7 + Math.min(realFoodHits * 0.1, 0.25);
  } else {
    novaGroup = 2;
    baseConfidence = 0.4 + Math.min(realFoodHits * 0.05, 0.2);
  }
  
  const confidence = Math.min(Math.max(baseConfidence, 0.1), 0.98);
  
  let reasoning = '';
  if (novaGroup === 4) {
    if (strongHits > 0) {
      reasoning = `Dette produktet er klassifisert som NOVA 4 fordi det inneholder ${strongHits} sterkt bearbeidede ingredienser som ${strongSignals.slice(0, 2).map(s => s.description.toLowerCase()).join(', ')}. Disse ingrediensene er typiske for industrielt fremstilte matvarer.`;
    } else {
      reasoning = `Dette produktet er klassifisert som NOVA 4 fordi det har mange ingredienser (${ingredientsCount}) og inneholder ${hasENumbers ? 'E-nummer' : 'svakt bearbeidede ingredienser'}. Dette er typisk for sterkt prosesserte produkter.`;
    }
  } else if (novaGroup === 3) {
    reasoning = `Dette produktet er klassifisert som NOVA 3 fordi det inneholder ${weakHits} moderat bearbeidede ingredienser${hasENumbers ? ' og E-nummer' : ''}. Det er noe bearbeidet, men ikke sterkt industrielt prosessert.`;
  } else if (novaGroup === 2) {
    reasoning = `Dette produktet er klassifisert som NOVA 2 fordi det består hovedsakelig av kulinariske ingredienser som salt, olje eller sukker. Disse brukes typisk i matlaging.`;
  } else {
    reasoning = `Dette produktet er klassifisert som NOVA 1 fordi det består av få (${ingredientsCount}) naturlige ingredienser uten tilsetninger. Dette er ubearbeidet eller minimalt bearbeidet mat.`;
  }
  
  return {
    nova_group: novaGroup, confidence: Math.round(confidence * 100) / 100, reasoning, signals: allSignals,
    has_ingredients: true,
    is_estimated: false,
    debug: { ingredients_count: ingredientsCount, has_e_numbers: hasENumbers, e_numbers: allENumbers, strong_hits: strongHits, weak_hits: weakHits, real_food_hits: realFoodHits, normalized_text_sample: normalizedText.substring(0, 100) },
    version: VERSION, timestamp: new Date().toISOString()
  };
}

const ClassifyInputSchema = z.object({
  ingredients_text: z.string().min(1).max(5000),
  additives: z.array(z.string()).optional(),
  product_category: z.enum(['snacks', 'frokostblanding', 'drikke', 'kjeks', 'pålegg', 'meieri', 'ferdigrett', 'annet']).optional(),
  language: z.string().default('no').optional()
});

const BatchInputSchema = z.array(ClassifyInputSchema).max(100);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
      const result = classifyNova(validationResult.data);
      return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST' && path.endsWith('/classify-batch')) {
      const body = await req.json();
      const validationResult = BatchInputSchema.safeParse(body);
      if (!validationResult.success) {
        return new Response(JSON.stringify({ error: 'Validation error', details: validationResult.error.format() }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const results = validationResult.data.map(item => classifyNova(item));
      return new Response(JSON.stringify(results), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Not found', available_endpoints: ['GET /health', 'GET /version', 'POST /classify-nova', 'POST /classify-batch'] }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
