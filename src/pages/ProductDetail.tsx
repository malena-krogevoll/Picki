import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Leaf, AlertCircle, HelpCircle, Heart, ShieldCheck, MapPin } from "lucide-react";
import { analyzeProductMatch, UserPreferences } from "@/lib/preferenceAnalysis";
import { extractCountryOfOrigin, CountryInfo } from "@/utils/countryUtils";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EpdSource {
  ingredients_raw: string | null;
  payload: {
    ingredientStatement?: string;
    allergenInfo?: {
      allergens?: Array<{
        allergenTypeCode?: string;
        levelOfContainmentCode?: string;
      }>;
    };
    nutrientInfo?: {
      nutrients?: Array<{
        nutrientTypeCode?: string;
        quantityContained?: number;
        measurementUnitCode?: string;
      }>;
    };
    [key: string]: unknown;
  };
}

interface Allergen {
  code: string;
  display_name: string;
  contains: string;
}

interface ProductDetails {
  ean: string;
  name: string;
  brand: string;
  vendor: string;
  image: string;
  description: string;
  ingredients: string;
  allergens: Allergen[];
  weight: number;
  weight_unit: string;
  current_price: number;
  store: string;
}

interface NovaClassification {
  score: number | null;
  reasoning: string;
  hasIngredients: boolean;
  isEstimated: boolean;
  matchedRules: Array<{
    type: string;
    description: string;
  }>;
}

const getNovaColor = (score: number) => {
  if (score <= 2) return "bg-primary text-primary-foreground";
  if (score === 3) return "bg-yellow-500 text-white";
  return "bg-destructive text-destructive-foreground";
};

const getNovaLabel = (score: number) => {
  if (score === 1) return "Ubearbeidede eller minimalt bearbeidede matvarer";
  if (score === 2) return "Bearbeidede kulinariske ingredienser";
  if (score === 3) return "Moderat bearbeidede matvarer";
  return "Sterkt bearbeidede matvarer";
};

const getNovaDescription = (score: number) => {
  if (score === 1) return "Naturlige matvarer som frukt, grønnsaker, kjøtt, egg og melk uten tilsetninger.";
  if (score === 2) return "Ingredienser som olje, smør, sukker og salt som brukes i matlaging.";
  if (score === 3) return "Relativt enkle produkter med noen tilsetningsstoffer som hermetikk og ost.";
  return "Industrielt fremstilte produkter med mange tilsetningsstoffer og bearbeidede ingredienser.";
};

export default function ProductDetail() {
  const { ean } = useParams<{ ean: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const searchParams = new URLSearchParams(window.location.search);
  const listId = searchParams.get('listId');
  const storeId = searchParams.get('storeId');
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [novaData, setNovaData] = useState<NovaClassification | null>(null);
  const [loading, setLoading] = useState(true);
  const [epdSource, setEpdSource] = useState<EpdSource | null>(null);

  // Convert profile preferences to UserPreferences format
  const userPreferences: UserPreferences | null = profile?.preferences ? {
    allergies: profile.preferences.allergies || [],
    diets: profile.preferences.diets || [],
    other_preferences: {
      organic: profile.preferences.other_preferences?.organic || false,
      lowest_price: profile.preferences.other_preferences?.lowest_price || false,
      animal_welfare: profile.preferences.other_preferences?.animal_welfare || false,
    },
    priority_order: profile.preferences.priority_order || [],
  } : null;

  // Effective ingredients: prefer EPD (producer-verified) over Kassalapp
  const effectiveIngredients = epdSource?.ingredients_raw || epdSource?.payload?.ingredientStatement || product?.ingredients || '';
  const ingredientSource = epdSource?.ingredients_raw || epdSource?.payload?.ingredientStatement ? 'EPD (produsentverifisert)' : 'Kassalapp';

  // EPD allergens: only those explicitly present
  const epdAllergens = (epdSource?.payload?.allergenInfo?.allergens || [])
    .filter(a => a.levelOfContainmentCode?.toUpperCase() === 'CONTAINS' || a.levelOfContainmentCode?.toUpperCase() === 'YES')
    .map(a => a.allergenTypeCode || '')
    .filter(Boolean);

  // Map VDA allergen codes to Norwegian display names
  const allergenCodeToName: Record<string, string> = {
    'AC': 'Selleri', 'AE': 'Egg', 'AF': 'Fisk', 'AM': 'Melk',
    'AN': 'Nøtter', 'AP': 'Peanøtter', 'AS': 'Soya', 'AW': 'Gluten',
    'AU': 'Sulfitt', 'AX': 'Sesam', 'AY': 'Skalldyr', 'BC': 'Lupin',
    'BM': 'Bløtdyr', 'NL': 'Sennep',
  };

  // Extract country of origin from EPD payload
  const countryOfOrigin: CountryInfo[] = epdSource?.payload 
    ? extractCountryOfOrigin(epdSource.payload as Record<string, unknown>) 
    : [];
  const matchInfo = product ? analyzeProductMatch(
    {
      name: product.name,
      brand: product.brand || '',
      allergener: '',
      ingredienser: effectiveIngredients,
    },
    userPreferences
  ) : null;

  const handleBack = () => {
    if (listId && storeId) {
      navigate(`/list/${listId}?view=shopping&store=${storeId}`);
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!ean) return;

      setLoading(true);
      try {
        // Fetch product details and EPD data in parallel
        const [productResult, epdResult] = await Promise.all([
          supabase.functions.invoke('get-product-details', { body: { ean } }),
          supabase.from('product_sources')
            .select('ingredients_raw, payload')
            .eq('ean', ean)
            .eq('source', 'EPD')
            .maybeSingle(),
        ]);

        if (productResult.error) throw productResult.error;
        setProduct(productResult.data);

        if (epdResult.data) {
          setEpdSource(epdResult.data as unknown as EpdSource);
        }

        // If no EPD data cached, trigger background fetch
        if (!epdResult.data) {
          supabase.functions.invoke('fetch-epd', {
            body: { action: 'lookup', gtin: ean }
          }).then(({ data }) => {
            if (data?.found && data.product) {
              setEpdSource({
                ingredients_raw: data.product.ingredientStatement || null,
                payload: data.product,
              });
            }
          }).catch(e => console.warn('EPD background fetch failed:', e));
        }

        // Use the best available ingredients for NOVA classification
        const ingredientsForNova = epdResult.data?.ingredients_raw 
          || (epdResult.data?.payload as any)?.ingredientStatement
          || productResult.data.ingredients 
          || '';

        const { data: novaResult, error: novaError } = await supabase.functions.invoke(
          'classify-nova',
          { body: { ingredients_text: ingredientsForNova } }
        );

        if (novaError) {
          console.error('Error classifying NOVA:', novaError);
        } else {
          setNovaData({
            score: novaResult.nova_group,
            reasoning: novaResult.reasoning,
            hasIngredients: novaResult.has_ingredients,
            isEstimated: novaResult.is_estimated,
            matchedRules: (novaResult.signals || []).map((s: any) => ({
              type: s.type,
              description: s.description
            }))
          });
        }
      } catch (error) {
        console.error('Error fetching product details:', error);
        toast.error("Kunne ikke hente produktdetaljer");
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [ean]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <Button variant="outline" className="rounded-2xl h-12">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake
          </Button>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6">
          <Button variant="outline" onClick={handleBack} className="rounded-2xl h-12">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake
          </Button>
          <Card className="mt-6">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Produktet ble ikke funnet</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Button variant="outline" onClick={handleBack} className="rounded-2xl h-12">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake
        </Button>

        {/* Product Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-6">
              <div className="bg-white p-4 rounded-lg border border-border">
                <img
                  src={product.image || '/placeholder.svg'}
                  alt={product.name}
                  className="w-32 h-32 object-contain"
                />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {product.brand}
                  {countryOfOrigin.length > 0 && (
                    <span className="ml-2 text-2xl" title={countryOfOrigin.map(c => c.name).join(', ')}>
                      {countryOfOrigin.map(c => c.flag).join(' ')}
                    </span>
                  )}
                </h1>
                <p className="text-lg text-muted-foreground mb-4">{product.name}</p>
                <div className="flex items-center gap-4">
                  <p className="text-2xl font-bold text-primary">
                    {product.current_price ? `${product.current_price.toFixed(2)} kr` : 'Pris ikke tilgjengelig'}
                  </p>
                  {product.weight && (
                    <Badge variant="outline" className="rounded-full">
                      {product.weight} {product.weight_unit}
                    </Badge>
                  )}
                  <Badge variant="outline" className="rounded-full uppercase">
                    {product.store}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NOVA Classification */}
        {novaData && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>NOVA-klassifisering</CardTitle>
                {novaData.hasIngredients && novaData.score !== null ? (
                  <Badge className={`${getNovaColor(novaData.score)} rounded-full px-4 py-2 text-lg`}>
                    NOVA {novaData.score}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="rounded-full px-4 py-2 text-lg border-dashed">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Ukjent
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!novaData.hasIngredients ? (
                <div className="p-4 rounded-xl bg-muted border border-border">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">Ingrediensdata ikke tilgjengelig</h3>
                      <p className="text-sm text-muted-foreground">
                        Vi har ikke tilgang til ingredienslisten for dette produktet, og kan derfor ikke gi en pålitelig NOVA-klassifisering. 
                        Sjekk produktets emballasje for ingrediensinformasjon.
                      </p>
                    </div>
                  </div>
                </div>
              ) : novaData.score !== null && (
                <>
                  <div className={`p-4 rounded-xl ${novaData.score <= 2 ? 'bg-primary/10 border border-primary/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                    <div className="flex items-start gap-3">
                      {novaData.score <= 2 ? (
                        <Leaf className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-1" />
                      )}
                      <div>
                        <h3 className="font-semibold mb-1">{getNovaLabel(novaData.score)}</h3>
                        <p className="text-sm text-muted-foreground">{getNovaDescription(novaData.score)}</p>
                      </div>
                    </div>
                  </div>

                  {novaData.reasoning && (
                    <div>
                      <h4 className="font-semibold mb-2">Grunnlag for klassifisering</h4>
                      <p className="text-sm text-muted-foreground">{novaData.reasoning}</p>
                    </div>
                  )}

                  {novaData.matchedRules && novaData.matchedRules.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Identifiserte ingredienser</h4>
                      <div className="space-y-2">
                        {novaData.matchedRules.map((rule, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 bg-secondary rounded-lg"
                          >
                            <Badge
                              variant={rule.type === 'strong' ? 'destructive' : 'secondary'}
                              className="rounded-full"
                            >
                              {rule.type === 'strong' ? 'Sterk' : 'Svak'}
                            </Badge>
                            <span className="text-sm">{rule.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Ingredients */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Ingredienser</CardTitle>
              {effectiveIngredients && ingredientSource === 'EPD (produsentverifisert)' && (
                <Badge variant="outline" className="rounded-full text-xs gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {ingredientSource}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {effectiveIngredients ? (
              <p className="text-foreground whitespace-pre-wrap">{effectiveIngredients}</p>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-muted rounded-xl">
                <HelpCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Ingrediensliste ikke tilgjengelig for dette produktet. Sjekk produktets emballasje for fullstendig informasjon.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detected Allergens */}
        {(effectiveIngredients || epdAllergens.length > 0) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Allergener</CardTitle>
                {epdAllergens.length > 0 && (
                  <Badge variant="outline" className="rounded-full text-xs gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    EPD-verifisert
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                // EPD allergens (producer-verified, highest priority)
                const verifiedAllergenNames = epdAllergens
                  .map(code => allergenCodeToName[code] || code)
                  .filter(Boolean);

                // Ingredient-text-based detection (fallback / supplement)
                const allergenMapping: Record<string, string[]> = {
                  "Gluten": ["hvete", "rug", "bygg", "havre", "spelt", "gluten", "mel", "semule", "durumhvete"],
                  "Melk": ["melk", "laktose", "fløte", "smør", "ost", "kasein", "myse", "kremfløte", "rømme", "yoghurt"],
                  "Egg": ["egg", "eggehvite", "eggeplomme", "majonese"],
                  "Nøtter": ["mandel", "hasselnøtt", "valnøtt", "cashew", "pistasjnøtt", "pekannøtt", "macadamia", "nøtter"],
                  "Peanøtter": ["peanøtt", "peanøtter", "jordnøtt", "jordnøtter"],
                  "Skalldyr": ["reke", "krabbe", "hummer", "skjell", "østers", "sjøkreps", "scampi"],
                  "Fisk": ["fisk", "torsk", "laks", "makrell", "sild", "sei", "hyse", "kveite", "ørret"],
                  "Soya": ["soya", "soyabønne", "soyaprotein", "soyaolje", "soyalecitin"],
                  "Sesam": ["sesam", "sesamfrø", "sesamolje"],
                  "Selleri": ["selleri", "sellerisalt"],
                  "Sennep": ["sennep", "sennepsfrø"],
                  "Lupin": ["lupin", "lupinfrø"],
                  "Bløtdyr": ["blekksprut", "blåskjell", "muslinger", "snegler", "kamskjell"],
                  "Sulfitt": ["sulfitt", "svoveldioksid", "e220", "e221", "e222", "e223", "e224", "e225", "e226", "e227", "e228"]
                };
                
                const ingredientsLower = effectiveIngredients.toLowerCase();
                const textDetected: string[] = [];
                for (const [allergen, keywords] of Object.entries(allergenMapping)) {
                  if (keywords.some(kw => ingredientsLower.includes(kw))) {
                    textDetected.push(allergen);
                  }
                }

                // Merge: EPD verified first, then text-detected (deduplicated)
                const allAllergens = [...new Set([...verifiedAllergenNames, ...textDetected])];
                
                if (allAllergens.length === 0) {
                  return (
                    <p className="text-muted-foreground text-sm">
                      Ingen kjente allergener funnet
                    </p>
                  );
                }
                
                return (
                  <div className="flex flex-wrap gap-2">
                    {allAllergens.map((allergen, idx) => (
                      <Badge 
                        key={idx} 
                        variant="destructive" 
                        className="rounded-full gap-1"
                      >
                        {verifiedAllergenNames.includes(allergen) && (
                          <ShieldCheck className="h-3 w-3" />
                        )}
                        {allergen}
                      </Badge>
                    ))}
                  </div>
                );
              })()}
              
              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  {epdAllergens.length > 0 
                    ? 'Allergener merket med ✓ er verifisert av produsenten via EPD. Øvrige er detektert automatisk fra ingredienslisten. Sjekk alltid emballasjen.'
                    : 'Allergeninformasjon er hentet automatisk fra ingredienslisten og kan inneholde feil. Sjekk alltid produktets emballasje før bruk. Picki kan ikke garantere at produkter er fri for allergener.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Animal Welfare - only show for animal products */}
        {userPreferences?.other_preferences?.animal_welfare && matchInfo && matchInfo.animalWelfareLevel !== 'unknown' && matchInfo.animalWelfareLevel !== 'not_applicable' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Dyrevelferd</CardTitle>
                <Badge 
                  className={`rounded-full px-4 py-2 ${
                    matchInfo.animalWelfareLevel === 'high' 
                      ? 'bg-primary text-primary-foreground' 
                      : matchInfo.animalWelfareLevel === 'medium'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-destructive text-destructive-foreground'
                  }`}
                >
                  {matchInfo.animalWelfareLevel === 'high' ? 'God' : matchInfo.animalWelfareLevel === 'medium' ? 'Middels' : 'Lav'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-xl ${
                matchInfo.animalWelfareLevel === 'high' 
                  ? 'bg-primary/10 border border-primary/20' 
                  : matchInfo.animalWelfareLevel === 'medium'
                    ? 'bg-yellow-500/10 border border-yellow-500/20'
                    : 'bg-destructive/10 border border-destructive/20'
              }`}>
                <div className="flex items-start gap-3">
                  <Heart className={`h-5 w-5 flex-shrink-0 mt-1 ${
                    matchInfo.animalWelfareLevel === 'high' 
                      ? 'text-primary' 
                      : matchInfo.animalWelfareLevel === 'medium'
                        ? 'text-yellow-500'
                        : 'text-destructive'
                  }`} />
                  <div>
                    <h3 className="font-semibold mb-1">
                      {matchInfo.animalWelfareReason || 'Standardproduksjon'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {matchInfo.animalWelfareLevel === 'high' 
                        ? 'Dette produktet har indikatorer på god dyrevelferd, som sertifiseringer eller produksjonsmetoder som prioriterer dyrenes trivsel.'
                        : matchInfo.animalWelfareLevel === 'medium'
                          ? 'Dette produktet har noen positive indikatorer for dyrevelferd, men ikke fullstendige sertifiseringer.'
                          : 'Dette produktet har indikatorer som tyder på lavere standard for dyrevelferd.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {product.description && (
          <Card>
            <CardHeader>
              <CardTitle>Beskrivelse</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{product.description}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
