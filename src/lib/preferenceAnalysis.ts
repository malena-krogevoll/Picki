// Preference analysis for products based on user profile

export interface MatchInfo {
  allergyWarnings: string[];
  dietWarnings: string[];
  dietMatches: string[];
  organicMatch: boolean;
  animalWelfareLevel: 'high' | 'medium' | 'low' | 'unknown';
  animalWelfareReason?: string;
  matchScore: number; // 0-100, higher is better match
}

export interface UserPreferences {
  allergies: string[];
  diets: string[];
  other_preferences: {
    organic: boolean;
    lowest_price: boolean;
    animal_welfare?: boolean;
  };
  priority_order: string[];
}

// Dyrevernmerket brands and animal welfare keywords
const animalWelfareBrands: { keywords: string[]; label: string }[] = [
  // Dyrevernmerket brands (high welfare)
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
];

const animalWelfareMediumKeywords = [
  { keywords: ["økologisk", "organic", "øko"], label: "Økologisk" },
  { keywords: ["frittgående", "free range"], label: "Frittgående" },
  { keywords: ["frilandsegg", "friland"], label: "Frilandsegg" },
  { keywords: ["grasfôret", "grass fed", "gressfôret"], label: "Grasfôret" },
  { keywords: ["utegående"], label: "Utegående" },
];

// Allergen mapping for Norwegian products
const allergenMapping: Record<string, string[]> = {
  "gluten": ["hvete", "rug", "bygg", "havre", "spelt", "gluten", "mel", "semule", "durumhvete"],
  "melk": ["melk", "laktose", "fløte", "smør", "ost", "kasein", "myse", "kremfløte", "rømme", "yoghurt"],
  "egg": ["egg", "eggehvite", "eggeplomme", "majonese"],
  "nøtter": ["mandel", "hasselnøtt", "valnøtt", "cashew", "pistasjnøtt", "pekannøtt", "macadamia", "nøtter"],
  "peanøtter": ["peanøtt", "peanøtter", "jordnøtt", "jordnøtter"],
  "skalldyr": ["reke", "krabbe", "hummer", "skjell", "østers", "sjøkreps", "scampi"],
  "fisk": ["fisk", "torsk", "laks", "makrell", "sild", "sei", "hyse", "kveite", "ørret"],
  "soya": ["soya", "soyabønne", "soyaprotein", "soyaolje", "soyalecitin"],
  "sesam": ["sesam", "sesamfrø", "sesamolje"],
  "selleri": ["selleri", "sellerisalt"],
  "sennep": ["sennep", "sennepsfrø"],
  "lupin": ["lupin", "lupinfrø"],
  "bløtdyr": ["blekksprut", "blåskjell", "muslinger", "snegler", "kamskjell"],
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

function checkAllergens(
  allergener: string,
  ingredienser: string,
  userAllergies: string[]
): string[] {
  const warnings: string[] = [];
  
  // IMPORTANT: Only use ingredients list for allergen checking
  // The "Allergener/Kosthold" field from Kassalapp API often lists ALL possible allergens
  // for a category (not just what the product contains), causing false positives
  // Example: A pure salmon fillet lists "Gluten, Melk, Egg" even though it only contains fish
  const textToCheck = ingredienser.toLowerCase();
  
  // If no ingredients, we can't reliably check - return empty (no warnings)
  if (!textToCheck.trim()) {
    return [];
  }
  
  for (const allergy of userAllergies) {
    const allergyLower = allergy.toLowerCase();
    const allergenKeywords = allergenMapping[allergyLower] || [allergyLower];
    
    if (containsAny(textToCheck, allergenKeywords)) {
      warnings.push(allergy);
    }
  }
  
  return warnings;
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
  
  // Apply priority order weighting
  priorityOrder.forEach((pref, index) => {
    const weight = (priorityOrder.length - index) * 2;
    
    if (pref === 'organic' && matchInfo.organicMatch) {
      score += weight;
    }
    if (pref === 'animal_welfare' && matchInfo.animalWelfareLevel === 'high') {
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
  const allergyWarnings = userPreferences?.allergies 
    ? checkAllergens(allergener, ingredienser, userPreferences.allergies)
    : [];
  
  // Check diets
  const dietResult = userPreferences?.diets
    ? checkDiets(allergener, ingredienser, product.name, userPreferences.diets)
    : { warnings: [], matches: [] };
  
  // Check organic
  const organicMatch = checkOrganic(product.name, product.brand);
  
  // Check animal welfare
  const animalWelfareResult = checkAnimalWelfare(product.name, product.brand, ingredienser);
  
  const partialMatchInfo = {
    allergyWarnings,
    dietWarnings: dietResult.warnings,
    dietMatches: dietResult.matches,
    organicMatch,
    animalWelfareLevel: animalWelfareResult.level,
    animalWelfareReason: animalWelfareResult.reason,
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
