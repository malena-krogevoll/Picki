// Preference analysis for products based on user profile

export interface MatchInfo {
  allergyWarnings: string[];
  allergyTriggers: Record<string, string[]>; // Maps allergen to detected ingredients
  dietWarnings: string[];
  dietMatches: string[];
  organicMatch: boolean;
  animalWelfareLevel: 'high' | 'medium' | 'low' | 'unknown';
  animalWelfareReason?: string;
  localFoodMatch: boolean;
  localFoodReason?: string;
  matchScore: number; // 0-100, higher is better match
}

export interface UserPreferences {
  allergies: string[];
  diets: string[];
  other_preferences: {
    organic: boolean;
    lowest_price: boolean;
    animal_welfare?: boolean;
    local_food?: boolean;
  };
  priority_order: string[];
}

// High animal welfare: Dyrevernmerket, Debio-sertifisert, and premium welfare brands
const animalWelfareBrands: { keywords: string[]; label: string }[] = [
  // === DYREVERNMERKET SERTIFISERTE ===
  { keywords: ["hovelsrud"], label: "Dyrevernmerket" },
  { keywords: ["jerseymeieriet"], label: "Dyrevernmerket" },
  { keywords: ["kolonihagen"], label: "Dyrevernmerket" },
  { keywords: ["heinrichjung", "heinrich jung"], label: "Dyrevernmerket" },
  { keywords: ["grøndalen"], label: "Dyrevernmerket" },
  { keywords: ["nýr"], label: "Dyrevernmerket" },
  { keywords: ["norsk ullgris", "ullgris"], label: "Dyrevernmerket" },
  { keywords: ["rørosmeieriet"], label: "Dyrevernmerket" },
  { keywords: ["homlagarden"], label: "Dyrevernmerket" },
  { keywords: ["tine setermjølk", "setermjølk"], label: "Setermelk" },
  
  // === DEBIO ØKOLOGISK SERTIFISERTE ===
  { keywords: ["debio"], label: "Debio-sertifisert" },
  { keywords: ["eu økologisk", "eu-økologisk"], label: "EU Økologisk" },
  { keywords: ["demeter"], label: "Demeter Biodynamisk" },
  
  // === STOLT FJØRFE OG HØYT DYREVELFERD ===
  { keywords: ["stolt fjørfe", "stoltfjørfe"], label: "Stolt Fjørfe" },
  { keywords: ["hubbard kylling", "hubbard"], label: "Stolt Fjørfe" },
  { keywords: ["liveche"], label: "Stolt Fjørfe" },
  
  // === REGIONALE GÅRDER MED HØYT DYREVELFERD ===
  { keywords: ["grønne skoger gård", "grønne skoger"], label: "Småskala gård" },
  { keywords: ["hokksund egg"], label: "Frittgående høner" },
  { keywords: ["birkebeiner egg", "birkebeiner"], label: "Frittgående høner" },
  { keywords: ["holte gård"], label: "Småskala gård" },
  { keywords: ["sørby gård"], label: "Småskala gård" },
  { keywords: ["kviberg gård"], label: "Småskala gård" },
  { keywords: ["heimdal gård"], label: "Småskala gård" },
  { keywords: ["stangeskovene"], label: "Viltkjøtt" },
  { keywords: ["trøndermat"], label: "Regional kvalitet" },
  { keywords: ["nortura prior", "prior"], label: "Prior" },
  
  // === MEIERIPRODUKTER MED HØYT DYREVELFERD ===
  { keywords: ["brunost seter", "seterost"], label: "Setermjølk" },
  { keywords: ["valdresmeieriet"], label: "Regional meieri" },
  { keywords: ["hanen merket", "hanen-merket"], label: "Hanen-merket" },
  { keywords: ["norsk gardsost"], label: "Gardsmeieri" },
  { keywords: ["ostegården"], label: "Gardsmeieri" },
  
  // === KJØTT MED HØYT DYREVELFERD ===
  { keywords: ["villsvin"], label: "Viltkjøtt" },
  { keywords: ["elgkjøtt", "elg"], label: "Viltkjøtt" },
  { keywords: ["reinsdyrkjøtt", "rein"], label: "Viltkjøtt" },
  { keywords: ["hjortekjøtt", "hjort"], label: "Viltkjøtt" },
  { keywords: ["lofotlam", "lofot lam"], label: "Utegangerlam" },
  { keywords: ["gammalnorsk spælsau", "spælsau"], label: "Urfe" },
  { keywords: ["villsau"], label: "Villsau" },
];

const animalWelfareMediumKeywords = [
  // === SERTIFISERINGER OG MERKINGER ===
  { keywords: ["økologisk", "organic", "øko"], label: "Økologisk" },
  { keywords: ["frittgående", "free range"], label: "Frittgående" },
  { keywords: ["frilandsegg", "friland"], label: "Frilandsegg" },
  { keywords: ["grasfôret", "grass fed", "gressfôret"], label: "Grasfôret" },
  { keywords: ["utegående"], label: "Utegående" },
  { keywords: ["bærekraftig", "sustainable"], label: "Bærekraftig" },
  { keywords: ["msc sertifisert", "msc-sertifisert", "msc"], label: "MSC Sertifisert" },
  { keywords: ["asc sertifisert", "asc-sertifisert", "asc"], label: "ASC Sertifisert" },
  
  // === PRODUKSJONSMETODER ===
  { keywords: ["utemarksbeite", "beite"], label: "Beitebasert" },
  { keywords: ["løsdrift"], label: "Løsdrift" },
  { keywords: ["saktevoksende"], label: "Saktevoksende" },
  { keywords: ["naturlig fôr"], label: "Naturlig fôr" },
  { keywords: ["gmo-fri", "uten gmo"], label: "GMO-fri" },
  
  // === REGIONALE MERKER MED MIDDELS VELFERD ===
  { keywords: ["nyt norge", "nyt-norge"], label: "Nyt Norge" },
  { keywords: ["spesialitet"], label: "Spesialitet" },
  { keywords: ["tradisjonelt"], label: "Tradisjonelt" },
  { keywords: ["kortreist"], label: "Kortreist" },
  { keywords: ["småskala"], label: "Småskala" },
];

// === LOKALMAT DATABASE ===
// Norwegian brands, certifications, and regional producers
const localFoodHighKeywords: { keywords: string[]; label: string }[] = [
  // === NYT NORGE OG OFFISIELLE MERKINGER ===
  { keywords: ["nyt norge", "nyt-norge"], label: "Nyt Norge" },
  { keywords: ["spesialitet.no", "spesialitet"], label: "Beskyttet betegnelse" },
  { keywords: ["hanen merket", "hanen-merket", "hanen"], label: "Hanen-merket" },
  
  // === STORE NORSKE PRODUSENTER ===
  { keywords: ["tine"], label: "Norsk meieri" },
  { keywords: ["nortura"], label: "Norsk kjøtt" },
  { keywords: ["gilde"], label: "Norsk kjøtt" },
  { keywords: ["prior"], label: "Norsk fjørfe" },
  { keywords: ["synnøve finden", "synnøve"], label: "Norsk meieri" },
  { keywords: ["fjordland"], label: "Norsk mat" },
  { keywords: ["lerøy"], label: "Norsk sjømat" },
  { keywords: ["mowi"], label: "Norsk sjømat" },
  { keywords: ["salmar"], label: "Norsk sjømat" },
  { keywords: ["bama"], label: "Norsk frukt/grønt" },
  { keywords: ["gartnerhallen"], label: "Norsk grønt" },
  
  // === REGIONALE MEIERIER ===
  { keywords: ["rørosmeieriet"], label: "Trøndelag" },
  { keywords: ["valdresmeieriet"], label: "Valdres" },
  { keywords: ["jerseymeieriet"], label: "Vestlandet" },
  { keywords: ["gausdalsmeieriet"], label: "Gudbrandsdalen" },
  { keywords: ["jæren meieri"], label: "Jæren" },
  { keywords: ["q-meieriene", "q meieriene"], label: "Norsk meieri" },
  
  // === REGIONALE KJØTTPRODUSENTER ===
  { keywords: ["trøndermat"], label: "Trøndelag" },
  { keywords: ["lofotlam"], label: "Lofoten" },
  { keywords: ["ryafeet"], label: "Trøndelag" },
  { keywords: ["nordfjordkjøtt"], label: "Nordfjord" },
  { keywords: ["hardanger kjøtt"], label: "Hardanger" },
  { keywords: ["jæren kjøtt"], label: "Jæren" },
  { keywords: ["idsøe"], label: "Rogaland" },
  { keywords: ["fatland"], label: "Vestlandet" },
  
  // === LOKALE BRYGGERIER OG DRIKKEVARER ===
  { keywords: ["olden"], label: "Nordfjord" },
  { keywords: ["imsdal"], label: "Norsk vann" },
  { keywords: ["farris"], label: "Larvik" },
  { keywords: ["aass"], label: "Drammen" },
  { keywords: ["hansa"], label: "Bergen" },
  { keywords: ["ringnes"], label: "Oslo" },
  { keywords: ["mack"], label: "Tromsø" },
  { keywords: ["grans"], label: "Sandefjord" },
  
  // === TRADISJONELLE NORSKE PRODUKTER ===
  { keywords: ["stabburet"], label: "Norsk mat" },
  { keywords: ["idun"], label: "Norsk mat" },
  { keywords: ["orkla"], label: "Norsk mat" },
  { keywords: ["kavli"], label: "Norsk mat" },
  { keywords: ["mills"], label: "Norsk mat" },
  { keywords: ["freia"], label: "Norsk sjokolade" },
  { keywords: ["nidar"], label: "Trondheim" },
  
  // === SJØMATPRODUSENTER ===
  { keywords: ["domstein"], label: "Norsk sjømat" },
  { keywords: ["norway seafoods"], label: "Norsk sjømat" },
  { keywords: ["brødrene sperre"], label: "Norsk sjømat" },
  { keywords: ["king oscar"], label: "Norsk sjømat" },
  { keywords: ["lofoten"], label: "Lofoten" },
  { keywords: ["vesterålen"], label: "Vesterålen" },
  { keywords: ["finnmark"], label: "Finnmark" },
  
  // === BAKEVARER OG MØLLER ===
  { keywords: ["møllerens"], label: "Norsk mel" },
  { keywords: ["regal"], label: "Norsk bakst" },
  { keywords: ["hatting"], label: "Norsk bakst" },
  { keywords: ["mesterbakeren"], label: "Norsk bakst" },
  { keywords: ["bakehuset"], label: "Norsk bakst" },
];

const localFoodMediumKeywords: { keywords: string[]; label: string }[] = [
  // === GENERELLE NORSKE INDIKATORER ===
  { keywords: ["norsk", "norwegian"], label: "Norsk opprinnelse" },
  { keywords: ["made in norway", "laget i norge"], label: "Produsert i Norge" },
  { keywords: ["kortreist"], label: "Kortreist" },
  { keywords: ["lokal", "lokalt"], label: "Lokal" },
  { keywords: ["tradisjonell norsk"], label: "Tradisjonell" },
  
  // === REGIONALE BETEGNELSER ===
  { keywords: ["trøndelag", "trøndersk"], label: "Trøndelag" },
  { keywords: ["vestland", "vestlandsk"], label: "Vestlandet" },
  { keywords: ["nordland", "nordnorsk"], label: "Nord-Norge" },
  { keywords: ["østland", "østlandsk"], label: "Østlandet" },
  { keywords: ["sørlandet", "sørlandsk"], label: "Sørlandet" },
  { keywords: ["telemark"], label: "Telemark" },
  { keywords: ["hedmark"], label: "Hedmark" },
  { keywords: ["oppland"], label: "Oppland" },
  { keywords: ["rogaland"], label: "Rogaland" },
  { keywords: ["hordaland"], label: "Hordaland" },
  { keywords: ["sogn og fjordane", "sogn"], label: "Sogn og Fjordane" },
  { keywords: ["møre og romsdal", "møre"], label: "Møre og Romsdal" },
  { keywords: ["nordland"], label: "Nordland" },
  { keywords: ["troms"], label: "Troms" },
  { keywords: ["finnmark"], label: "Finnmark" },
  
  // === BESKYTTEDE BETEGNELSER ===
  { keywords: ["hardangereple"], label: "Hardanger" },
  { keywords: ["ringerikserts"], label: "Ringerike" },
  { keywords: ["suldalsrøyra"], label: "Suldal" },
  { keywords: ["tørrfisk fra lofoten"], label: "Lofoten" },
  { keywords: ["fenalår fra norge"], label: "Norsk fenalår" },
  { keywords: ["klippfisk"], label: "Norsk klippfisk" },
  { keywords: ["rakfisk"], label: "Norsk tradisjon" },
  { keywords: ["lutefisk"], label: "Norsk tradisjon" },
  { keywords: ["pinnekjøtt"], label: "Norsk tradisjon" },
  { keywords: ["smalahove"], label: "Vestlandsk tradisjon" },
  
  // === GÅRDSMAT OG SMÅSKALA ===
  { keywords: ["gårdsmeieri", "gardsmeieri"], label: "Gårdsmeieri" },
  { keywords: ["gårdsost", "gardsost"], label: "Gårdsost" },
  { keywords: ["småskala"], label: "Småskala" },
  { keywords: ["håndlaget"], label: "Håndlaget" },
  { keywords: ["hjemmelaget"], label: "Hjemmelaget" },
];

// Allergen mapping for Norwegian products
const allergenMapping: Record<string, string[]> = {
  "gluten": ["hvete", "rug", "bygg", "havre", "spelt", "gluten", "mel", "semule", "durumhvete", "seitan", "couscous", "bulgur", "kamut", "emmer"],
  "melk": ["melk", "laktose", "fløte", "smør", "ost", "kasein", "myse", "kremfløte", "rømme", "yoghurt", "helmelk", "lettmelk", "skummetmelk", "kondensert melk", "tørrmelk", "melkepulver", "melkefett", "melkeprotein", "valle", "kesam", "kremost"],
  "egg": ["egg", "eggehvite", "eggeplomme", "majonese", "eggemasse", "eggepulver", "pasteurisert egg", "aioli"],
  "nøtter": ["mandel", "hasselnøtt", "valnøtt", "cashew", "pistasjnøtt", "pekannøtt", "macadamia", "nøtter", "paranøtt", "mandelmel", "nøtteolje"],
  "peanøtter": ["peanøtt", "peanøtter", "jordnøtt", "jordnøtter", "peanøttolje", "peanøttsmør"],
  "skalldyr": [
    // Grunnleggende
    "reke", "reker", "krabbe", "hummer", "skjell", "østers", "sjøkreps", "scampi",
    // Krepsdyr-varianter
    "krepsdyr", "languster", "langustiner", "langustin", "crevettes", "sjøkrebs",
    // Kjøtt/deler
    "krabbekjøtt", "krabbeklør", "hummerkjøtt", "rekekjøtt",
    // Bearbeidede produkter
    "rekesalat", "rekefett", "rekepulver", "rekebuljong", "rekeolje",
    "skalldyrbuljong", "skalldyrekstrakt", "skalldyrprotein", "skalldyrpulver",
    // Andre varianter
    "kreps", "ferskvannskreps", "signalkreps", "taskekrabbe", "trollkrabbe", "kongekrabbe"
  ],
  "fisk": ["fisk", "torsk", "laks", "makrell", "sild", "sei", "hyse", "kveite", "ørret", "sardiner", "ansjos", "tunfisk", "steinbit", "breiflabb", "fiskegelatin", "fiskeolje", "kaviar", "rogn"],
  "soya": ["soya", "soyabønne", "soyaprotein", "soyaolje", "soyalecitin", "tofu", "miso", "tempeh", "edamame", "soyasaus"],
  "sesam": ["sesam", "sesamfrø", "sesamolje", "tahini", "gomashio"],
  "selleri": ["selleri", "sellerisalt", "selleristang", "sellerirot", "knollselleri"],
  "sennep": ["sennep", "sennepsfrø", "sennepspulver", "dijonsennep"],
  "lupin": ["lupin", "lupinfrø", "lupinmel", "lupinprotein"],
  "bløtdyr": [
    // Grunnleggende
    "blekksprut", "blåskjell", "muslinger", "snegler", "kamskjell",
    // Blekksprut-varianter
    "akkar", "calamari", "squid", "blekksprutringer", "sepia", "åttearmet blekksprut",
    // Skjell-varianter
    "hjerteskjell", "sandskjell", "østersskjell", "grønnleppet musling",
    "hjertemusling", "daggarskjell", "strandsnegl", "sjøsnegle", "albusnegl",
    // Bearbeidede produkter
    "bløtdyrprotein", "bløtdyrekstrakt", "muslingsaus", "østerssaus"
  ],
  "sulfitt": ["sulfitt", "svoveldioksid", "e220", "e221", "e222", "e223", "e224", "e225", "e226", "e227", "e228"]
};

// Diet checking rules
const dietChecks: Record<string, { forbidden: string[]; positive: string[] }> = {
  "vegan": {
    forbidden: ["melk", "egg", "kjøtt", "fisk", "honning", "gelatin", "smør", "ost", "fløte", "myse", "kasein", "laktose", "yoghurt", "rømme", "kylling", "svin", "storfe", "lam", "reke", "laks"],
    positive: ["vegansk", "vegan", "plantebasert", "plant-based"]
  },
  "vegetar": {
    forbidden: ["kjøtt", "fisk", "gelatin", "kylling", "svin", "storfe", "lam", "reke", "laks", "torsk", "sei", "bacon", "skinke"],
    positive: ["vegetar", "vegetarisk"]
  },
  "pescetarianer": {
    forbidden: ["kjøtt", "svin", "kylling", "storfe", "lam", "bacon", "skinke"],
    positive: ["fisk", "sjømat", "laks", "torsk"]
  },
  "glutenfri": {
    forbidden: ["gluten", "hvete", "rug", "bygg", "spelt", "semule", "durumhvete"],
    positive: ["glutenfri", "gluten-free", "uten gluten"]
  },
  "laktosefri": {
    forbidden: ["laktose"],
    positive: ["laktosefri", "lactose-free", "uten laktose"]
  },
  "lavkarbo": {
    forbidden: [],
    positive: ["lavkarbo", "low-carb", "keto"]
  },
  "paleo": {
    forbidden: ["sukker", "mel", "korn", "bønner", "linser", "peanøtt"],
    positive: ["paleo"]
  }
};

function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

function containsAny(text: string, keywords: string[]): boolean {
  const normalizedText = normalizeText(text);
  return keywords.some(keyword => normalizedText.includes(normalizeText(keyword)));
}

interface AllergenCheckResult {
  warnings: string[];
  triggers: Record<string, string[]>; // Maps allergen to the specific keywords found
}

function checkAllergens(
  allergener: string,
  ingredienser: string,
  userAllergies: string[]
): AllergenCheckResult {
  const warnings: string[] = [];
  const triggers: Record<string, string[]> = {};
  
  // IMPORTANT: Only use ingredients list for allergen checking
  // The "Allergener/Kosthold" field from Kassalapp API often lists ALL possible allergens
  // for a category (not just what the product contains), causing false positives
  // Example: A pure salmon fillet lists "Gluten, Melk, Egg" even though it only contains fish
  const textToCheck = ingredienser.toLowerCase();
  
  // If no ingredients, we can't reliably check - return empty (no warnings)
  if (!textToCheck.trim()) {
    return { warnings: [], triggers: {} };
  }
  
  for (const allergy of userAllergies) {
    const allergyLower = allergy.toLowerCase();
    const allergenKeywords = allergenMapping[allergyLower] || [allergyLower];
    
    // Find all matching keywords for this allergen
    const matchedKeywords = allergenKeywords.filter(keyword => 
      textToCheck.includes(normalizeText(keyword))
    );
    
    if (matchedKeywords.length > 0) {
      warnings.push(allergy);
      triggers[allergy] = matchedKeywords;
    }
  }
  
  return { warnings, triggers };
}

function checkDiets(
  allergener: string,
  ingredienser: string,
  productName: string,
  userDiets: string[]
): { warnings: string[]; matches: string[] } {
  const warnings: string[] = [];
  const matches: string[] = [];
  const combinedText = `${allergener} ${ingredienser} ${productName}`.toLowerCase();
  
  for (const diet of userDiets) {
    const dietLower = diet.toLowerCase();
    const dietRules = dietChecks[dietLower];
    
    if (!dietRules) continue;
    
    // Check for positive matches first
    if (containsAny(combinedText, dietRules.positive)) {
      matches.push(diet);
      continue;
    }
    
    // Check for forbidden ingredients
    const hasForbidden = dietRules.forbidden.some(forbidden => 
      combinedText.includes(forbidden.toLowerCase())
    );
    
    if (hasForbidden) {
      warnings.push(diet);
    }
  }
  
  return { warnings, matches };
}

function checkOrganic(productName: string, brand: string): boolean {
  const combinedText = `${productName} ${brand}`.toLowerCase();
  const organicKeywords = ["økologisk", "organic", "øko", "bio"];
  return containsAny(combinedText, organicKeywords);
}

function checkAnimalWelfare(
  productName: string,
  brand: string,
  ingredienser: string
): { level: 'high' | 'medium' | 'low' | 'unknown'; reason?: string } {
  const combinedText = `${productName} ${brand} ${ingredienser}`.toLowerCase();
  
  // Check for high welfare brands first
  for (const item of animalWelfareBrands) {
    if (containsAny(combinedText, item.keywords)) {
      return { level: 'high', reason: item.label };
    }
  }
  
  // Check for medium welfare keywords
  for (const item of animalWelfareMediumKeywords) {
    if (containsAny(combinedText, item.keywords)) {
      return { level: 'medium', reason: item.label };
    }
  }
  
  // Check if it's an animal product category
  const animalProductKeywords = ["melk", "ost", "egg", "kjøtt", "kylling", "svin", "storfe", "lam", "fløte", "smør", "yoghurt", "rømme"];
  const isAnimalProduct = containsAny(combinedText, animalProductKeywords);
  
  if (isAnimalProduct) {
    return { level: 'low', reason: undefined };
  }
  
  return { level: 'unknown', reason: undefined };
}

function checkLocalFood(
  productName: string,
  brand: string
): { isLocal: boolean; reason?: string } {
  const combinedText = `${productName} ${brand}`.toLowerCase();
  
  // Check for high-confidence local food indicators first
  for (const item of localFoodHighKeywords) {
    if (containsAny(combinedText, item.keywords)) {
      return { isLocal: true, reason: item.label };
    }
  }
  
  // Check for medium-confidence local food indicators
  for (const item of localFoodMediumKeywords) {
    if (containsAny(combinedText, item.keywords)) {
      return { isLocal: true, reason: item.label };
    }
  }
  
  return { isLocal: false, reason: undefined };
}

function calculateMatchScore(
  matchInfo: Omit<MatchInfo, 'matchScore'>,
  userPreferences: UserPreferences | null
): number {
  if (!userPreferences) return 50;
  
  let score = 100;
  const priorityOrder = userPreferences.priority_order || [];
  
  // Heavy penalty for allergen warnings (these are dangerous)
  score -= matchInfo.allergyWarnings.length * 50;
  
  // Moderate penalty for diet warnings
  score -= matchInfo.dietWarnings.length * 20;
  
  // Bonus for diet matches
  score += matchInfo.dietMatches.length * 10;
  
  // Check organic preference
  if (userPreferences.other_preferences?.organic) {
    if (matchInfo.organicMatch) {
      score += 15;
    } else {
      score -= 10;
    }
  }
  
  // Check animal welfare preference
  if (userPreferences.other_preferences?.animal_welfare) {
    if (matchInfo.animalWelfareLevel === 'high') {
      score += 20;
    } else if (matchInfo.animalWelfareLevel === 'medium') {
      score += 10;
    } else if (matchInfo.animalWelfareLevel === 'low') {
      score -= 15;
    }
  }
  
  // Check local food preference
  if (userPreferences.other_preferences?.local_food) {
    if (matchInfo.localFoodMatch) {
      score += 15;
    } else {
      score -= 5; // Smaller penalty since non-local isn't harmful
    }
  }
  
  // Apply priority order weighting
  priorityOrder.forEach((pref, index) => {
    const weight = (priorityOrder.length - index) * 2;
    
    if (pref === 'organic' && matchInfo.organicMatch) {
      score += weight;
    }
    if (pref === 'animal_welfare' && matchInfo.animalWelfareLevel === 'high') {
      score += weight;
    }
    if (pref === 'local_food' && matchInfo.localFoodMatch) {
      score += weight;
    }
  });
  
  return Math.max(0, Math.min(100, score));
}

export function analyzeProductMatch(
  product: {
    name: string;
    brand: string;
    allergener?: string;
    ingredienser?: string;
  },
  userPreferences: UserPreferences | null
): MatchInfo {
  const allergener = product.allergener || '';
  const ingredienser = product.ingredienser || '';
  
  // Check allergens
  const allergenResult = userPreferences?.allergies 
    ? checkAllergens(allergener, ingredienser, userPreferences.allergies)
    : { warnings: [], triggers: {} };
  
  // Check diets
  const dietResult = userPreferences?.diets
    ? checkDiets(allergener, ingredienser, product.name, userPreferences.diets)
    : { warnings: [], matches: [] };
  
  // Check organic
  const organicMatch = checkOrganic(product.name, product.brand);
  
  // Check animal welfare
  const animalWelfareResult = checkAnimalWelfare(product.name, product.brand, ingredienser);
  
  // Check local food
  const localFoodResult = checkLocalFood(product.name, product.brand);
  
  const partialMatchInfo = {
    allergyWarnings: allergenResult.warnings,
    allergyTriggers: allergenResult.triggers,
    dietWarnings: dietResult.warnings,
    dietMatches: dietResult.matches,
    organicMatch,
    animalWelfareLevel: animalWelfareResult.level,
    animalWelfareReason: animalWelfareResult.reason,
    localFoodMatch: localFoodResult.isLocal,
    localFoodReason: localFoodResult.reason,
  };
  
  const matchScore = calculateMatchScore(partialMatchInfo, userPreferences);
  
  return {
    ...partialMatchInfo,
    matchScore,
  };
}

export function sortProductsByPreference<T extends { matchInfo: MatchInfo; novaScore: number; price: number | null }>(
  products: T[],
  userPreferences: UserPreferences | null
): T[] {
  return [...products].sort((a, b) => {
    // First: Products with allergen warnings go last
    const aHasAllergyWarning = a.matchInfo.allergyWarnings.length > 0;
    const bHasAllergyWarning = b.matchInfo.allergyWarnings.length > 0;
    
    if (aHasAllergyWarning && !bHasAllergyWarning) return 1;
    if (!aHasAllergyWarning && bHasAllergyWarning) return -1;
    
    // Second: Sort by match score (higher is better)
    if (a.matchInfo.matchScore !== b.matchInfo.matchScore) {
      return b.matchInfo.matchScore - a.matchInfo.matchScore;
    }
    
    // Third: Sort by NOVA score (lower is better = cleaner product)
    if (a.novaScore !== b.novaScore) {
      return a.novaScore - b.novaScore;
    }
    
    // Fourth: Sort by price (lower is better)
    const priceA = a.price ?? Infinity;
    const priceB = b.price ?? Infinity;
    return priceA - priceB;
  });
}
