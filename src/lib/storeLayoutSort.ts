// Typisk layout i norske dagligvarebutikker (Rema 1000, Kiwi, Coop, Meny)
// Sortert etter hvordan man vanligvis går gjennom butikken

interface StoreCategory {
  category: string;
  emoji: string;
  keywords: string[];
}

export const storeLayoutOrder: StoreCategory[] = [
  {
    category: "Frukt og grønt",
    emoji: "🍎",
    keywords: [
      "eple", "banan", "appelsin", "sitron", "druer", "melon", "mango", "avokado", 
      "kiwi", "pære", "plomme", "nektarin", "fersken", "bringebær", "blåbær", "jordbær",
      "tomat", "agurk", "paprika", "løk", "hvitløk", "gulrot", "brokkoli", "blomkål",
      "spinat", "salat", "rucola", "potet", "sopp", "squash", "aubergine", "selleri",
      "grønnkål", "rosenkål", "asparges", "mais", "erter", "bønner", "linser",
      "frukt", "grønt", "grønnsak", "bær", "sitrus"
    ]
  },
  {
    category: "Brød og bakervarer",
    emoji: "🥖",
    keywords: [
      "brød", "loff", "rundstykke", "boller", "croissant", "knekkebrød", "flatbrød",
      "lomper", "lefser", "kake", "wienerbrød", "bagel", "focaccia", "ciabatta",
      "baguette", "polarbrød", "pita", "tortilla", "wraps", "hvetemel", "rugbrød",
      "grovbrød", "kneipp", "muffins", "scones", "kjeks"
    ]
  },
  {
    category: "Meieriprodukter",
    emoji: "🥛",
    keywords: [
      "melk", "mjølk", "fløte", "rømme", "yoghurt", "skyr", "kesam", "cottage",
      "smør", "margarin", "egg", "eggerøre", "kremfløte", "matfløte", "lettmelk",
      "helmelk", "havremelk", "soyamelk", "mandelmelk", "kulturmelk", "kefir",
      "riskrem", "pudding", "vaniljesaus"
    ]
  },
  {
    category: "Ost og pålegg",
    emoji: "🧀",
    keywords: [
      "ost", "brunost", "gulost", "hvitost", "norvegia", "jarlsberg", "brie", "camembert",
      "mozzarella", "parmesan", "feta", "cheddar", "kremost", "smøreost", "philadelphia",
      "skinke", "salami", "leverpostei", "makrell", "kaviar", "majones", "syltetøy",
      "sjokoladepålegg", "nugatti", "peanøttsmør", "honning", "pålegg"
    ]
  },
  {
    category: "Kjøtt og ferskvare",
    emoji: "🥩",
    keywords: [
      "kylling", "kyllingfilet", "kyllinglår", "kalkun", "and", "svin", "svinekjøtt",
      "svinekoteletter", "bacon", "pølse", "wiener", "grillpølse", "kjøttdeig", "karbonade",
      "biff", "entrecote", "mørbrad", "indrefilet", "roastbiff", "ribbe", "lam",
      "lammekjøtt", "kjøttkaker", "medisterkaker", "farsbrød", "okse", "storfe"
    ]
  },
  {
    category: "Fisk og sjømat",
    emoji: "🐟",
    keywords: [
      "laks", "laksefilet", "ørret", "torsk", "torskefilet", "sei", "hyse", "makrell",
      "sild", "reker", "scampi", "blåskjell", "krabbe", "hummer", "fiskekaker",
      "fiskepudding", "fiskeboller", "fiskepinner", "fish & chips", "sushi",
      "sjømat", "fisk"
    ]
  },
  {
    category: "Hermetikk og konserver",
    emoji: "🥫",
    keywords: [
      "hermetikk", "boks", "konserv", "tunfisk", "makrell i tomat", "sardiner",
      "leverpostei", "tomater", "tomatpuré", "mais", "bønner", "kikerter", "linser",
      "suppe", "ferdigsuppe", "gryte", "ravioli", "spaghetti i boks"
    ]
  },
  {
    category: "Pasta, ris og korn",
    emoji: "🍝",
    keywords: [
      "pasta", "spaghetti", "penne", "fusilli", "makaroni", "lasagneplater", "nudler",
      "ris", "basmati", "jasminris", "fullkornsris", "risotto", "couscous", "bulgur",
      "quinoa", "havregryn", "kornblanding", "müsli", "granola", "grøt", "byggryn"
    ]
  },
  {
    category: "Sauser og krydder",
    emoji: "🧂",
    keywords: [
      "saus", "ketchup", "sennep", "majones", "dressing", "pesto", "pastasaus",
      "taco", "salsa", "soyasaus", "teriyaki", "sriracha", "tabasco", "bbq",
      "krydder", "salt", "pepper", "paprika", "oregano", "basilikum", "timian",
      "karri", "gurkemeie", "kanel", "ingefær", "hvitløkspulver", "buljong"
    ]
  },
  {
    category: "Baking",
    emoji: "🎂",
    keywords: [
      "mel", "hvetemel", "grovmel", "sukker", "melis", "vaniljesukker", "bakepulver",
      "natron", "gjær", "kakao", "sjokolade", "kokesjokolade", "mandler", "nøtter",
      "rosiner", "marsipan", "glasur", "marzipan", "valnøtter", "hasselnøtter"
    ]
  },
  {
    category: "Snacks og godteri",
    emoji: "🍫",
    keywords: [
      "chips", "popcorn", "nøtter", "snacks", "sjokolade", "kvikk lunsj", "daim",
      "smash", "twist", "non-stop", "seigmenn", "lakris", "tyggegummi", "drops",
      "kjeks", "cookies", "vafler", "is", "godteri", "smågodt"
    ]
  },
  {
    category: "Drikkevarer",
    emoji: "🥤",
    keywords: [
      "brus", "cola", "fanta", "sprite", "pepsi", "solo", "juice", "appelsinjuice",
      "eplejuice", "smoothie", "vann", "mineralvann", "farris", "saft", "kaffe",
      "te", "kakao", "energidrikk", "redbull", "monster", "øl", "vin", "drikke"
    ]
  },
  {
    category: "Frysevarer",
    emoji: "❄️",
    keywords: [
      "frys", "frosne", "frossen", "frossent", "fryse", "is", "iskrem", "pizza",
      "frossenpizza", "pommes frites", "pølser", "kjøttboller", "fiskepinner",
      "lasagne", "pytt i panne", "grønnsaksblanding", "bær", "grønnsaker"
    ]
  }
];

export interface CategorizedItem {
  category: string;
  emoji: string;
  sortOrder: number;
}

/**
 * Kategoriserer et produkt basert på søketekst og produktnavn
 * Returnerer kategori, emoji og sorteringsrekkefølge
 */
export function categorizeProduct(
  searchQuery: string,
  productName?: string,
  productBrand?: string
): CategorizedItem {
  const searchText = [
    searchQuery,
    productName || '',
    productBrand || ''
  ].join(' ').toLowerCase();

  for (let i = 0; i < storeLayoutOrder.length; i++) {
    const category = storeLayoutOrder[i];
    for (const keyword of category.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return {
          category: category.category,
          emoji: category.emoji,
          sortOrder: i
        };
      }
    }
  }

  // Ukjent kategori kommer til slutt
  return {
    category: "Annet",
    emoji: "📦",
    sortOrder: storeLayoutOrder.length
  };
}

/**
 * Grupperer og sorterer varer etter butikklayout
 */
export function groupItemsByCategory<T extends { id: string; name: string }>(
  items: T[],
  getProductInfo?: (itemId: string) => { name?: string; brand?: string } | undefined
): { category: string; emoji: string; items: T[] }[] {
  // Kategoriser alle items
  const categorizedItems = items.map(item => {
    const productInfo = getProductInfo?.(item.id);
    const categoryInfo = categorizeProduct(
      item.name,
      productInfo?.name,
      productInfo?.brand
    );
    return { item, ...categoryInfo };
  });

  // Sorter etter kategori-rekkefølge
  categorizedItems.sort((a, b) => a.sortOrder - b.sortOrder);

  // Grupper etter kategori
  const groups: { category: string; emoji: string; items: T[] }[] = [];
  let currentCategory = '';

  for (const { item, category, emoji } of categorizedItems) {
    if (category !== currentCategory) {
      groups.push({ category, emoji, items: [item] });
      currentCategory = category;
    } else {
      groups[groups.length - 1].items.push(item);
    }
  }

  return groups;
}
