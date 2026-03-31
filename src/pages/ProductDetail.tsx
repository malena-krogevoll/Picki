import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Leaf, AlertCircle, HelpCircle, Heart, ShieldCheck, MapPin, ArrowRightLeft } from "lucide-react";
import { analyzeProductMatch, UserPreferences } from "@/lib/preferenceAnalysis";
import { extractCountryOfOrigin, CountryInfo, getCountryFromEAN } from "@/utils/countryUtils";
import { CountryFlag } from "@/components/CountryFlag";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useFavoriteProducts } from "@/hooks/useFavoriteProducts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EpdSource {
  ingredients_raw: string | null;
  image_url?: string | null;
  payload: {
    ingredientStatement?: string;
    mainImageUrl?: string;
    image?: string;
    allergens?: unknown;
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
  const { isFavorite, toggleFavorite } = useFavoriteProducts(user?.id);
  const searchParams = new URLSearchParams(window.location.search);
  const listId = searchParams.get('listId');
  const storeId = searchParams.get('storeId');
  const itemId = searchParams.get('itemId');
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [novaData, setNovaData] = useState<NovaClassification | null>(null);
  const [loading, setLoading] = useState(true);
  const [epdSource, setEpdSource] = useState<EpdSource | null>(null);
  const [alternatives, setAlternatives] = useState<Array<{
    ean: string;
    brand: string;
    name: string;
    image: string;
    price: number | null;
    novaScore: number | null;
  }>>([]);
  const [swapping, setSwapping] = useState(false);
  const [showFirstFavoriteDialog, setShowFirstFavoriteDialog] = useState(false);
  const listItemName = searchParams.get('itemName');
  const isFav = ean ? isFavorite(ean) : false;

  const handleToggleFavorite = async () => {
    if (!ean || !product) return;
    const result = await toggleFavorite({
      ean,
      productName: `${product.brand || ''} ${product.name || ''}`.trim(),
      brand: product.brand,
      imageUrl: product.image,
      listItemName: listItemName || undefined,
    });
    if (result.success) {
      if (result.action === 'removed') {
        toast("Fjernet fra favoritter");
      } else if (result.wasFirstFavorite) {
        toast("Lagt til som favoritt ❤️", {
          description: "Neste gang du handler denne varen, vil dette produktet automatisk vises som førstevalg i butikker der det er tilgjengelig.",
          duration: 6000,
        });
      } else {
        toast("Lagt til som favoritt ❤️");
      }
    }
  };

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

  // Extract country of origin from EPD payload, with EAN fallback
  const countryOfOrigin: CountryInfo[] = (() => {
    if (epdSource?.payload) {
      const epd = extractCountryOfOrigin(epdSource.payload as Record<string, unknown>);
      if (epd.length > 0) return epd;
    }
    // Fallback: derive country from EAN barcode prefix
    if (ean) {
      const eanCountry = getCountryFromEAN(ean);
      if (eanCountry) return [eanCountry];
    }
    return [];
  })();
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
        // Fetch product details and best cached source data in parallel
        const [productResult, epdResult, kassalResult] = await Promise.all([
          supabase.functions.invoke('get-product-details', { body: { ean } }),
          supabase.from('product_sources')
            .select('ingredients_raw, image_url, payload')
            .eq('ean', ean)
            .eq('source', 'EPD')
            .maybeSingle(),
          supabase.from('product_sources')
            .select('ingredients_raw, image_url, payload')
            .eq('ean', ean)
            .eq('source', 'KASSALAPP')
            .maybeSingle(),
        ]);

        if (productResult.error) throw productResult.error;

        const productData = productResult.data as ProductDetails;
        const epdData = epdResult.data as EpdSource | null;
        const kassalData = kassalResult.data as EpdSource | null;

        const bestImage = epdData?.payload?.mainImageUrl || epdData?.image_url || kassalData?.image_url || (kassalData?.payload as any)?.image || productData.image || '';
        const bestIngredients = epdData?.ingredients_raw
          || epdData?.payload?.ingredientStatement
          || kassalData?.ingredients_raw
          || (kassalData?.payload as any)?.ingredients
          || productData.ingredients
          || '';

        setProduct({
          ...productData,
          image: bestImage,
          ingredients: bestIngredients,
        });

        if (epdData) {
          setEpdSource(epdData);
        }

        // If no EPD data cached, trigger background fetch
        if (!epdData) {
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
        const ingredientsForNova = epdData?.ingredients_raw 
          || (epdData?.payload as any)?.ingredientStatement
          || kassalData?.ingredients_raw
          || (kassalData?.payload as any)?.ingredients
          || productData.ingredients 
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

  // Load alternatives from cached product_data
  useEffect(() => {
    if (!itemId) return;
    
    const loadAlternatives = async () => {
      const { data, error } = await supabase
        .from('shopping_list_items')
        .select('product_data, selected_product_ean')
        .eq('id', itemId)
        .single();
      
      if (error || !data?.product_data) return;
      
      const cache = data.product_data as Record<string, any>;
      const products = cache.products as Array<any> || [];
      
      // Filter out the currently selected product
      const otherProducts = products.filter((p: any) => p.ean !== ean);
      setAlternatives(otherProducts.map((p: any) => ({
        ean: p.ean,
        brand: p.brand || '',
        name: p.name || '',
        image: p.image || '',
        price: p.price ?? null,
        novaScore: p.novaScore ?? null,
      })));
    };
    
    loadAlternatives();
  }, [itemId, ean]);

  // Swap the selected product with an alternative
  const handleSwapProduct = async (altEan: string) => {
    if (!itemId || swapping) return;
    setSwapping(true);
    
    try {
      // Read current cache
      const { data, error: fetchError } = await supabase
        .from('shopping_list_items')
        .select('product_data')
        .eq('id', itemId)
        .single();
      
      if (fetchError || !data?.product_data) throw new Error('Could not load item data');
      
      const cache = data.product_data as Record<string, any>;
      const products = cache.products as Array<any> || [];
      const newIndex = products.findIndex((p: any) => p.ean === altEan);
      
      if (newIndex === -1) throw new Error('Alternative not found');
      
      // Update selected index and EAN
      const updatedCache = { ...cache, selectedIndex: newIndex };
      await supabase
        .from('shopping_list_items')
        .update({ 
          product_data: updatedCache, 
          selected_product_ean: altEan 
        })
        .eq('id', itemId);
      
      toast.success("Produkt byttet");
      // Navigate to the new product's detail page
      navigate(`/product/${altEan}?listId=${listId}&storeId=${storeId}&itemId=${itemId}`, { replace: true });
    } catch (e) {
      console.error('Swap failed:', e);
      toast.error("Kunne ikke bytte produkt");
    } finally {
      setSwapping(false);
    }
  };

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
                <div className="flex items-start justify-between gap-2">
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    {product.brand}
                    {countryOfOrigin.length > 0 && (
                      <span className="ml-2 inline-flex gap-1 align-middle">
                        {countryOfOrigin.map((c, i) => <CountryFlag key={i} alpha2={c.alpha2} name={c.name} size="md" />)}
                      </span>
                    )}
                  </h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleFavorite}
                    className="rounded-full h-10 w-10 flex-shrink-0"
                    title={isFav ? "Fjern fra favoritter" : "Legg til som favoritt"}
                  >
                    <Heart className={`h-5 w-5 transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
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

        {/* Country of Origin */}
        {countryOfOrigin.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Opprinnelsesland</CardTitle>
                {countryOfOrigin.some(c => !c.code.startsWith('GS1:')) && (
                  <Badge variant="outline" className="rounded-full text-xs gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    EPD-verifisert
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {countryOfOrigin.map((country, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                    <CountryFlag alpha2={country.alpha2} name={country.name} size="lg" />
                    <div>
                      <p className="font-semibold text-foreground">{country.name}</p>
                      <p className="text-xs text-muted-foreground">Landskode: {country.code}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                {countryOfOrigin.some(c => c.code.startsWith('GS1:'))
                  ? 'Opprinnelsesland er estimert basert på strekkodeprefikset (GS1). Dette angir hvor produsenten er registrert, ikke nødvendigvis hvor produktet er produsert.'
                  : 'Opprinnelsesland er hentet fra produsentens EPD-data og angir hvor produktet er produsert eller bearbeidet.'
                }
              </p>
            </CardContent>
          </Card>
        )}


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

        {/* Product Alternatives */}
        {alternatives.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Alternativer ({alternatives.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alternatives.map((alt) => {
                const country = getCountryFromEAN(alt.ean);
                return (
                  <div
                    key={alt.ean}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="bg-white p-1 rounded-lg border border-border shrink-0">
                      <img
                        src={alt.image || '/placeholder.svg'}
                        alt={alt.name}
                        className="w-12 h-12 object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {country && <CountryFlag alpha2={country.alpha2} name={country.name} size="sm" className="mr-1" />}
                        {alt.brand}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{alt.name}</p>
                      <p className="text-sm font-bold text-primary mt-0.5">
                        {alt.price !== null ? `${alt.price.toFixed(2)} kr` : 'Pris ukjent'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl h-10 shrink-0 touch-target"
                      onClick={() => handleSwapProduct(alt.ean)}
                      disabled={swapping}
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                      Bytt
                    </Button>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground pt-2">
                Trykk «Bytt» for å erstatte valgt produkt på handlelisten.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
