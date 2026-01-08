import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Leaf, AlertCircle, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const searchParams = new URLSearchParams(window.location.search);
  const listId = searchParams.get('listId');
  const storeId = searchParams.get('storeId');
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [novaData, setNovaData] = useState<NovaClassification | null>(null);
  const [loading, setLoading] = useState(true);

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
        // Fetch product details
        const { data: productData, error: productError } = await supabase.functions.invoke(
          'get-product-details',
          { body: { ean } }
        );

        if (productError) throw productError;
        setProduct(productData);

        // Fetch NOVA classification with reasoning (always call, even without ingredients)
        const { data: novaResult, error: novaError } = await supabase.functions.invoke(
          'classify-nova',
          { body: { ingredients_text: productData.ingredients || '' } }
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
                <h1 className="text-3xl font-bold text-foreground mb-2">{product.brand}</h1>
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
            <CardTitle>Ingredienser</CardTitle>
          </CardHeader>
          <CardContent>
            {product.ingredients ? (
              <p className="text-foreground whitespace-pre-wrap">{product.ingredients}</p>
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

        {/* Detected Allergens from Ingredients */}
        {product.ingredients && (
          <Card>
            <CardHeader>
              <CardTitle>Allergener (fra ingredienslisten)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
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
                
                const ingredientsLower = product.ingredients.toLowerCase();
                const detectedAllergens: string[] = [];
                
                for (const [allergen, keywords] of Object.entries(allergenMapping)) {
                  if (keywords.some(kw => ingredientsLower.includes(kw))) {
                    detectedAllergens.push(allergen);
                  }
                }
                
                if (detectedAllergens.length === 0) {
                  return (
                    <p className="text-muted-foreground text-sm">
                      Ingen kjente allergener funnet i ingredienslisten
                    </p>
                  );
                }
                
                return (
                  <div className="flex flex-wrap gap-2">
                    {detectedAllergens.map((allergen, idx) => (
                      <Badge key={idx} variant="destructive" className="rounded-full">
                        {allergen}
                      </Badge>
                    ))}
                  </div>
                );
              })()}
              
              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Allergeninformasjon er hentet automatisk fra ingredienslisten og kan inneholde feil. 
                  Sjekk alltid produktets emballasje før bruk. Picki kan ikke garantere at produkter er fri for allergener.
                </p>
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
