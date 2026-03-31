import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Category keywords with word-boundary-safe patterns.
 * Each entry is either a plain keyword (matched with word-boundary regex)
 * or a { term, exclude } object for terms that need negative filtering.
 */
interface CategoryRule {
  /** Keywords to match (OR). Matched as word-boundary regex against product name. */
  include: string[];
  /** If any of these match the product name, exclude the product from this category. */
  exclude?: string[];
}

const categoryRules: Record<string, CategoryRule> = {
  "frukt-gront": {
    include: [
      "eple", "epler", "banan", "bananer", "appelsin", "appelsiner",
      "sitron", "sitroner", "druer", "melon", "mango", "avokado",
      "kiwi", "pære", "pærer", "tomat", "tomater", "agurk", "agurker",
      "paprika", "løk", "hvitløk", "gulrot", "gulrøtter",
      "brokkoli", "blomkål", "spinat", "salat", "potet", "poteter",
      "sopp", "squash", "mais", "bær", "jordbær", "bringebær",
      "blåbær", "kirsebær", "plommer", "fersken", "nektarin",
      "ingefær", "persille", "dill", "basilikum", "reddik",
      "selleri", "purre", "purreløk", "rødbet", "kål", "hodekål",
      "grønnkål", "rosenkål", "sukkererter", "asparges",
      "lime", "grapefrukt", "ananas", "granateplet", "fiken",
      "sjampinjong", "kantarell", "ruccola", "babyspinat",
    ],
    exclude: ["juice", "saft", "smoothie", "chips", "snacks", "dressing", "saus", "ketchup", "puré", "syltetøy", "grøt"],
  },
  "meieri": {
    include: [
      "melk", "helmelk", "lettmelk", "skummet",
      "fløte", "kremfløte", "matfløte", "lettrømme", "seterrømme",
      "rømme", "yoghurt", "skyr", "kesam",
      "smør", "meierismør", "egg",
      "kulturmelk", "kefir", "mysost",
    ],
    exclude: ["grøt", "is", "iskrem", "sjokolade", "pudding", "kaffe"],
  },
  "palegg": {
    include: [
      "hvitost", "gulost", "brunost", "norvegia", "jarlsberg",
      "mozzarella", "parmesan", "feta", "brie", "camembert",
      "nøkkelost", "edamer", "gouda", "cheddar", "kremost",
      "cottage cheese", "ricotta", "mascarpone",
      "fløtemysost", "gudbrandsdalsost", "prim",
      "skinke", "kokt skinke", "spekeskinke",
      "salami", "serranoskinke", "bresaola",
      "leverpostei", "kaviar", "makrell i tomat",
      "syltetøy", "marmelade", "honning",
      "peanøttsmør", "nøttepålegg",
      "hummus", "avokadopålegg",
      "røkelaks", "gravet laks",
      "salatost", "middagsost", "blåmuggost",
    ],
    exclude: ["kaffe", "grøt", "chips", "pizza", "kiddylicious", "potetstaver", "knekkebrød"],
  },
  "kjott": {
    include: [
      "kylling", "kyllingfilet", "kyllingbryst", "kyllinglår",
      "svinekjøtt", "svinefilet", "koteletter",
      "bacon", "pølse", "pølser", "grillpølse", "wienerpølse",
      "kjøttdeig", "biff", "entrecote", "ytrefilet", "indrefilet",
      "lammekjøtt", "lammelår", "lammekotelett",
      "oksekjøtt", "storfe", "roastbiff",
      "ribbe", "pinnekjøtt", "fenalår",
      "kalkun", "kalkunfilet", "and",
      "kjøttkaker", "karbonade", "medisterkake",
      "farse", "hamburger",
    ],
    exclude: ["smak", "buljong", "fond"],
  },
  "fisk": {
    include: [
      "laks", "laksefilet", "røkelaks", "gravet laks",
      "ørret", "ørretfilet",
      "torsk", "torskefilet", "torskeloins",
      "sei", "seifilet", "hyse", "kolje",
      "reker", "scampi", "kreps",
      "fiskekaker", "fiskepudding", "fiskeboller",
      "makrell", "sild", "sardiner", "ansjos",
      "tunfisk", "kveite", "steinbit", "breiflabb",
      "blåskjell", "kamskjell",
    ],
    exclude: ["kaffe", "fiskeolje", "omega"],
  },
  "barnemat": {
    include: [
      "barnemat", "barnegrøt", "velling",
      "småbarn", "baby", "fra 6 mnd", "fra 8 mnd", "fra 12 mnd",
      "hipp", "nestlé", "semper", "ella's kitchen",
      "fruktmos", "fruktpuré",
      "lillego", "organix",
    ],
    exclude: [],
  },
  "ferdigmat": {
    include: [
      "ferdigmat", "ferdigrett",
      "pizza", "lasagne", "wok", "gryte",
      "suppe", "pytt i panne",
      "taco", "burrito", "wrap",
    ],
    exclude: ["krydder", "saus", "buljong"],
  },
  "hermetikk": {
    include: [
      "hermetikk", "hermetiske", "hakkede tomater",
      "tomatpuré", "tomater på boks",
      "kikerter", "bønner", "linser",
      "mais på boks", "erter",
      "tunfisk på boks", "sardiner",
      "kokosmilk", "kokosmelk",
    ],
    exclude: [],
  },
  "pasta-ris": {
    include: [
      "pasta", "spaghetti", "penne", "fusilli", "tagliatelle",
      "makaroni", "lasagneplater",
      "ris", "basmati", "jasminris", "fullkornsris",
      "couscous", "bulgur", "quinoa",
      "havregryn", "müsli", "granola",
      "nudler", "glassnudler",
      "mel", "hvetemel", "speltsmel",
    ],
    exclude: ["risotto", "rispudding"],
  },
  "sauser-krydder": {
    include: [
      "ketchup", "sennep", "pesto",
      "soyasaus", "sriracha", "tabasco",
      "buljong", "fond",
      "salt", "pepper", "paprikapulver",
      "kanel", "kardemomme", "ingefærpulver",
      "oregano", "timian", "rosmarin",
      "karri", "gurkemeie", "spisskummen",
      "dressing", "vinaigrette",
      "tomatpuré", "tacosaus",
    ],
    exclude: [],
  },
  "drikkevarer": {
    include: [
      "juice", "appelsinjuice", "eplejuice",
      "saft", "nektar",
      "vann", "mineralvann", "kildevann",
      "kaffe", "kaffefilter", "kaffebønner", "kaffekapsel",
      "te", "grønn te", "svart te", "urtete",
      "smoothie", "kombucha",
    ],
    exclude: ["kaffefløte"],
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const category = url.searchParams.get("category") || "";
    const chain = url.searchParams.get("chain") || "";
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const limit = parseInt(url.searchParams.get("limit") || "40", 10);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Build query
    let productsQuery = supabase
      .from("products")
      .select("ean, name, brand, image_url, nova_class")
      .not("name", "is", null)
      .not("nova_class", "is", null)
      .lte("nova_class", 2)
      .order("nova_class", { ascending: true })
      .order("name", { ascending: true });

    if (search) {
      productsQuery = productsQuery.ilike("name", `%${search}%`);
    }

    if (category && categoryRules[category]) {
      const rule = categoryRules[category];
      // Use OR filter for include keywords
      const orFilter = rule.include.map(kw => `name.ilike.%${kw}%`).join(",");
      productsQuery = productsQuery.or(orFilter);
    }

    // Fetch more than needed so we can post-filter excludes
    const fetchLimit = category ? Math.min(limit * 3, 200) : limit;
    productsQuery = productsQuery.range(offset, offset + fetchLimit - 1);

    const { data: products, error: productsError } = await productsQuery;

    if (productsError) {
      console.error("Products query error:", productsError);
      return new Response(JSON.stringify({ error: productsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ products: [], total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply exclude rules (post-filter)
    let filtered = products;
    if (category && categoryRules[category]) {
      const rule = categoryRules[category];
      if (rule.exclude && rule.exclude.length > 0) {
        filtered = products.filter((p: any) => {
          const nameLower = (p.name || "").toLowerCase();
          return !rule.exclude!.some(ex => nameLower.includes(ex.toLowerCase()));
        });
      }
      // Trim to requested limit
      filtered = filtered.slice(0, limit);
    }

    // Fetch chain availability for these products
    const eans = filtered.map((p: any) => p.ean);
    const { data: offers, error: offersError } = await supabase
      .from("offers")
      .select("ean, chain_id")
      .in("ean", eans);

    if (offersError) {
      console.error("Offers query error:", offersError);
    }

    // Fetch all chains
    const { data: chains } = await supabase.from("chains").select("id, name");
    const chainMap = new Map((chains || []).map((c: any) => [c.id, c.name]));

    // Build chain names per EAN
    const eanChains = new Map<string, string[]>();
    for (const offer of offers || []) {
      const chainName = chainMap.get(offer.chain_id);
      if (chainName) {
        if (!eanChains.has(offer.ean)) eanChains.set(offer.ean, []);
        const arr = eanChains.get(offer.ean)!;
        if (!arr.includes(chainName)) arr.push(chainName);
      }
    }

    // If chain filter is active, filter products to only those available at that chain
    let finalProducts = filtered;
    if (chain) {
      finalProducts = filtered.filter((p: any) => {
        const productChains = eanChains.get(p.ean) || [];
        return productChains.some((cn: string) => cn.toLowerCase().includes(chain.toLowerCase()));
      });
    }

    const result = finalProducts.map((p: any) => ({
      ...p,
      chains: eanChains.get(p.ean) || [],
    }));

    return new Response(JSON.stringify({ products: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
