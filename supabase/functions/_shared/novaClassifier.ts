/**
 * Shared NOVA classification logic for Deno edge functions.
 * This is the single source of truth for NOVA scoring in the backend.
 *
 * IMPORTANT: Keep this file in sync with src/lib/novaClassifier.ts (frontend copy).
 * Both files must produce identical classification results.
 */

export const VERSION = "1.3.0";
export const RULESET_DATE = "2026-03-23";

export interface Rule {
  id: string;
  pattern: RegExp;
  type: 'strong' | 'weak' | 'real_food';
  description: string;
}

export const UPF_STRONG_RULES: Rule[] = [
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
  { id: "UPF_STRONG_WHEY_PROTEIN", pattern: /\b(myseprotein\w*|whey protein\w*)\b/gi, type: 'strong', description: "Myseprotein (industrielt ekstrahert)" },
  { id: "UPF_STRONG_SOY_ISOLATE", pattern: /\bsoyaprotein\w*\b/gi, type: 'strong', description: "Soyaproteinisolat" },
  { id: "UPF_STRONG_COLORANT", pattern: /\bfargestoff\b/gi, type: 'strong', description: "Fargestoff" },
  { id: "UPF_STRONG_CARAMEL_COLOR", pattern: /\b(karamellfarge|E ?150[a-d])\b/gi, type: 'strong', description: "Karamellfarge" },
  { id: "UPF_STRONG_CARMINE", pattern: /\b(karmin|E ?120|annatto|E ?160b)\b/gi, type: 'strong', description: "Karmin/Annatto" },
  { id: "UPF_STRONG_POWDER_DAIRY", pattern: /\b(ostepulver|melkepulver|fløtepulver|smørpulver|mysepulver)\b/gi, type: 'strong', description: "Industrielt meieripulver" },
  { id: "UPF_STRONG_DEXTROSE", pattern: /\b(druesukker|dekstrose|dextrose|glukose(?![-\s]?sirup))\b/gi, type: 'strong', description: "Industrielt sukker (druesukker/dekstrose)" },
  { id: "UPF_STRONG_CONCENTRATE", pattern: /\bfra konsentrat\b/gi, type: 'strong', description: "Fra konsentrat (industriell prosess)" },
  { id: "UPF_STRONG_ISOLATED_GLUTEN", pattern: /\b(hvete|seitan)?gluten\b/gi, type: 'strong', description: "Isolert gluten" },
  { id: "UPF_STRONG_PROTEIN_ISOLATE", pattern: /\bprotein(konsentrat|isolat|pulver)\b/gi, type: 'strong', description: "Proteinisolat/-konsentrat" },
  { id: "UPF_STRONG_INVERT_SUGAR", pattern: /\binvertsukker\b/gi, type: 'strong', description: "Invertsukker" },
  { id: "UPF_STRONG_LECITHIN", pattern: /\b(lesitin|lecithin|soyalesitin|E ?322)\b/gi, type: 'strong', description: "Industriell emulgator (lesitin)" },
  { id: "UPF_STRONG_CASEIN", pattern: /\b(kasein|kaseinat)\b/gi, type: 'strong', description: "Isolert melkeprotein (kasein)" },
  { id: "UPF_STRONG_MONO_DI_GLYCERIDES", pattern: /\b(mono-?\s*og\s*di\s*glycerider|E ?471)\b/gi, type: 'strong', description: "Industriell emulgator (mono/diglycerider)" },
  { id: "UPF_STRONG_NITRITE", pattern: /\b(natriumnitritt|kaliumnitritt|E ?250|E ?249)\b/gi, type: 'strong', description: "Industrielt konserveringsmiddel (nitritt)" },
  { id: "UPF_STRONG_PHOSPHATE", pattern: /\b(di|tri|poly)?fosfat(er)?|E ?45[0-2]\b/gi, type: 'strong', description: "Industrielt fosfat" },
  { id: "UPF_STRONG_FLAVOR_ENHANCER", pattern: /\bsmaksforsterker(e)?\b/gi, type: 'strong', description: "Industriell smaksforsterker" },
  { id: "UPF_STRONG_CELLULOSE", pattern: /\b(cellulose|E ?460)\b/gi, type: 'strong', description: "Industrielt fyllstoff (cellulose)" },
  { id: "UPF_STRONG_GELATIN", pattern: /\bgelatin\b/gi, type: 'strong', description: "Industrielt ekstrahert gelatin" },
  { id: "UPF_STRONG_GENERIC_SYRUP", pattern: /(?<!(glukose|fruktose|invertert)[-\s]?)\bsirup\b/gi, type: 'strong', description: "Industriell sirup" },
  { id: "UPF_STRONG_POLYDEXTROSE", pattern: /\bpolydekstrose\b/gi, type: 'strong', description: "Syntetisk fiber (polydekstrose)" },
  { id: "UPF_STRONG_INULIN", pattern: /\binulin\b/gi, type: 'strong', description: "Industrielt ekstrahert fiber (inulin)" },
  { id: "UPF_STRONG_CITRIC_ACID_E", pattern: /\bE ?330\b/gi, type: 'strong', description: "Industrielt fremstilt sitronsyre (E330)" },
  { id: "UPF_STRONG_SODIUM_ALGINATE", pattern: /\b(natriumalginat|E ?401)\b/gi, type: 'strong', description: "Fortykningsmiddel (natriumalginat)" },
  { id: "UPF_STRONG_CALCIUM_CHLORIDE", pattern: /\b(kalsiumklorid|E ?509)\b/gi, type: 'strong', description: "Industriell tilsetning (kalsiumklorid)" },
];

export const UPF_WEAK_RULES: Rule[] = [
  { id: "UPF_WEAK_PRESERVATIVE", pattern: /\bkonserveringsmiddel\b/gi, type: 'weak', description: "Konserveringsmiddel" },
  { id: "UPF_WEAK_E200", pattern: /\bE ?2\d{2}\b/gi, type: 'weak', description: "E200-serie (konserveringsmidler)" },
  { id: "UPF_WEAK_ANTIOXIDANT", pattern: /\bantioksidant(er)?\b/gi, type: 'weak', description: "Antioksidant" },
  { id: "UPF_WEAK_E300", pattern: /\bE ?3\d{2}\b/gi, type: 'weak', description: "E300-serie (antioksidanter)" },
  { id: "UPF_WEAK_HUMECTANT", pattern: /\bfuktighetsbevarende\b/gi, type: 'weak', description: "Fuktighetsbevarende middel" },
  { id: "UPF_WEAK_SORBITOL", pattern: /\b(sorbitol|E ?420)\b/gi, type: 'weak', description: "Sorbitol" },
  { id: "UPF_WEAK_GLYCEROL", pattern: /\b(glyserol|E ?422)\b/gi, type: 'weak', description: "Glyserol" },
  { id: "UPF_WEAK_PALM_OIL", pattern: /\bpalmeolje\b/gi, type: 'weak', description: "Palmeolje" },
  { id: "UPF_WEAK_REFINED_OIL", pattern: /\braffinert(e)? vegetabilsk(e)? olje(r)?\b/gi, type: 'weak', description: "Raffinert vegetabilsk olje" },
  { id: "UPF_WEAK_PLAIN_STARCH", pattern: /(?<!modifisert(e)?\s)\bstivelse\b/gi, type: 'weak', description: "Raffinert stivelse" },
  { id: "UPF_WEAK_CITRIC_ACID", pattern: /\bsitronsyre\b/gi, type: 'weak', description: "Sitronsyre (tilsetning)" },
  { id: "UPF_WEAK_ASCORBIC_ACID", pattern: /\b(askorbinsyre|vitamin c)\b/gi, type: 'weak', description: "Askorbinsyre (tilsetning)" },
  { id: "UPF_WEAK_SODIUM_CITRATE", pattern: /\bnatriumsitrat\b/gi, type: 'weak', description: "Natriumsitrat (regulator)" },
  { id: "UPF_WEAK_CALCIUM_CARBONATE", pattern: /\b(kalsiumkarbonat|E ?170)\b/gi, type: 'weak', description: "Kalsiumkarbonat (tilsetning)" },
  { id: "UPF_WEAK_LACTIC_ACID", pattern: /\bmelkesyre\b(?!\s*(bakterie|kultur))/gi, type: 'weak', description: "Melkesyre (industrielt fremstilt)" },
];

export const REAL_FOOD_RULES: Rule[] = [
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

export const HIGH_RISK_CATEGORIES = ['pizza', 'ferdigrett', 'chips', 'godteri', 'snacks', 'brus', 'kjeks', 'is', 'pølse', 'bacon', 'nuggets', 'fiskepinner', 'fiskegrateng', 'grandiosa', 'pølsebrød', 'ketchup', 'majones', 'dressing'];

// Fresh produce categories — products here with no ingredients are single-ingredient NOVA 1
export const FRESH_PRODUCE_CATEGORIES = [
  'fg', 'frukt og grønt', 'frukt', 'grønt', 'grønnsaker', 'bær',
  'ferske grønnsaker', 'fersk frukt', 'poteter', 'løk', 'salat',
  'urter', 'sopp', 'rotgrønnsaker',
];

const NO_INGREDIENTS_PHRASES = [
  'ingen ingrediensinformasjon tilgjengelig',
  'ingen ingrediensinformasjon',
  'ingredienser ikke tilgjengelig',
  'not available',
  'n/a',
  'ingen data',
  'mangler ingredienser',
  'ukjent',
];

export interface Signal {
  type: 'strong' | 'weak' | 'real_food';
  rule_id: string;
  match: string;
  description: string;
}

export interface ClassificationInput {
  ingredients_text: string;
  additives?: string[];
  product_category?: string;
  product_name?: string;
  language?: string;
}

export interface ClassificationResult {
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

export function matchRules(text: string, rules: Rule[]): Signal[] {
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

export function classifyNova(input: ClassificationInput): ClassificationResult {
  const { ingredients_text, additives = [], product_category } = input;
  
  const normalizedInput = (ingredients_text || '').trim().toLowerCase();
  const isMissingIngredients = !ingredients_text || 
    ingredients_text.trim().length === 0 ||
    NO_INGREDIENTS_PHRASES.some(phrase => normalizedInput.includes(phrase));
  
  if (isMissingIngredients) {
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
      debug: { ingredients_count: 0, has_e_numbers: false, e_numbers: [], strong_hits: 0, weak_hits: 0, real_food_hits: 0, normalized_text_sample: normalizedInput.substring(0, 100) },
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
  } else if (ingredientsCount >= 15) {
    novaGroup = 4;
    baseConfidence = 0.5 + Math.min(ingredientsCount * 0.01, 0.15);
  } else if (weakHits >= 1 || hasENumbers) {
    novaGroup = 3;
    baseConfidence = 0.5 + Math.min(weakHits * 0.05, 0.2) + (hasENumbers ? 0.1 : 0);
  } else if (ingredientsCount <= 3) {
    // Few ingredients with no UPF signals = unprocessed/minimally processed (NOVA 1)
    // This covers single-ingredient whole foods like "brokkoli", "eple", "kyllingfilet"
    novaGroup = 1;
    baseConfidence = 0.7 + Math.min(realFoodHits * 0.1, 0.25) + (ingredientsCount === 1 ? 0.1 : 0);
  } else {
    // 4+ ingredients but no UPF signals = likely processed culinary foods (NOVA 2)
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
