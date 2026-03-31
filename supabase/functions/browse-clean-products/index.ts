import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Category keyword mapping (mirrors storeLayoutSort.ts)
    const categoryKeywords: Record<string, string[]> = {
      "frukt-gront": ["eple", "banan", "appelsin", "sitron", "druer", "melon", "mango", "avokado", "kiwi", "pære", "tomat", "agurk", "paprika", "løk", "hvitløk", "gulrot", "brokkoli", "blomkål", "spinat", "salat", "potet", "sopp", "squash", "frukt", "grønt", "grønnsak", "bær"],
      "meieri": ["melk", "fløte", "rømme", "yoghurt", "skyr", "kesam", "smør", "egg", "kremfløte", "matfløte", "havremelk", "kulturmelk"],
      "palegg": ["ost", "brunost", "gulost", "norvegia", "jarlsberg", "mozzarella", "parmesan", "feta", "skinke", "salami", "leverpostei", "kaviar", "syltetøy", "honning", "pålegg", "kremost"],
      "kjott": ["kylling", "kyllingfilet", "svin", "bacon", "pølse", "kjøttdeig", "biff", "entrecote", "lam", "okse", "storfe", "kjøttkaker", "karbonade"],
      "fisk": ["laks", "laksefilet", "ørret", "torsk", "sei", "reker", "scampi", "fiskekaker", "fiskepudding", "sjømat", "fisk"],
      "barnemat": ["barnemat", "grøt", "velling", "barnegrøt", "småbarn", "baby", "morsmelk"],
      "ferdigmat": ["ferdigmat", "ferdigrett", "ferdig", "middag", "pizza", "lasagne", "wok", "gryte", "suppe", "pytt"],
      "hermetikk": ["hermetikk", "boks", "konserv", "tunfisk", "sardiner", "tomatpuré", "tomater", "kikerter", "bønner"],
      "pasta-ris": ["pasta", "spaghetti", "penne", "ris", "basmati", "couscous", "bulgur", "quinoa", "havregryn", "müsli", "granola", "nudler"],
      "sauser-krydder": ["saus", "ketchup", "sennep", "pesto", "soyasaus", "krydder", "salt", "pepper", "buljong", "dressing"],
      "drikkevarer": ["juice", "saft", "vann", "kaffe", "te", "brus", "smoothie", "drikke"],
    };

    // Build WHERE clauses
    let whereConditions = "p.name IS NOT NULL";

    const params: string[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions += ` AND p.name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category && categoryKeywords[category]) {
      const keywords = categoryKeywords[category];
      const keywordConditions = keywords
        .map(() => {
          params.push(`%${keywords[params.length - (paramIndex - 1) + (params.length - (paramIndex - 1))]}`);
          return "";
        });
      // Reset and build properly
      params.length = search ? 1 : 0;
      paramIndex = search ? 2 : 1;

      const kwClauses = keywords.map((kw) => {
        params.push(`%${kw}%`);
        const idx = paramIndex;
        paramIndex++;
        return `p.name ILIKE $${idx}`;
      });
      whereConditions += ` AND (${kwClauses.join(" OR ")})`;
    }

    if (chain) {
      whereConditions += ` AND c.name ILIKE $${paramIndex}`;
      params.push(`%${chain}%`);
      paramIndex++;
    }

    const query = `
      SELECT p.ean, p.name, p.brand, p.image_url, p.nova_class,
             array_agg(DISTINCT c.name) as chains
      FROM products p
      JOIN offers o ON o.ean = p.ean
      JOIN chains c ON c.id = o.chain_id
      WHERE ${whereConditions}
      GROUP BY p.ean, p.name, p.brand, p.image_url, p.nova_class
      ORDER BY p.nova_class ASC, p.name ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const { data, error } = await supabase.rpc("", {}).then(() => ({ data: null, error: null }));

    // Use raw SQL via supabase-js postgres
    // Actually, we need to use the REST API approach with filters
    // Let's use a simpler approach with the Supabase client

    // Rebuild using supabase client queries
    let productsQuery = supabase
      .from("products")
      .select("ean, name, brand, image_url, nova_class")
      .not("name", "is", null)
      .order("nova_class", { ascending: true })
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (search) {
      productsQuery = productsQuery.ilike("name", `%${search}%`);
    }

    if (category && categoryKeywords[category]) {
      const keywords = categoryKeywords[category];
      // Use OR filter for category keywords matching product name
      const orFilter = keywords.map(kw => `name.ilike.%${kw}%`).join(",");
      productsQuery = productsQuery.or(orFilter);
    }

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

    // Fetch chain availability for these products
    const eans = products.map((p: any) => p.ean);
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
    let filteredProducts = products;
    if (chain) {
      filteredProducts = products.filter((p: any) => {
        const productChains = eanChains.get(p.ean) || [];
        return productChains.some((cn: string) => cn.toLowerCase().includes(chain.toLowerCase()));
      });
    }

    const result = filteredProducts.map((p: any) => ({
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
