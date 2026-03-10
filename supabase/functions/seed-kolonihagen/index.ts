import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const REMA_1000_CHAIN_ID = "199d092a-0c02-452a-996a-f42771975203";

interface KolonihagenProduct {
  name: string;
  ean: string;
  category: string;
  weight: string;
  epd?: string;
  url?: string;
}

interface ScrapedData {
  ingredients_raw: string | null;
  allergens: string[];
  nutrition: Record<string, string>;
  image_url: string | null;
  description: string | null;
}

// Complete product catalog with URLs from kolonihagen.no
const KOLONIHAGEN_PRODUCTS: KolonihagenProduct[] = [
  // === BRØD (FERSK) ===
  { name: "Grovt landbrød", ean: "7090029531565", category: "brød", weight: "700g", epd: "6035323", url: "https://www.kolonihagen.no/produkt/grovt-landbrod" },
  { name: "Havrebrød med hirse", ean: "7090029531688", category: "brød", weight: "750g", epd: "6086490", url: "https://www.kolonihagen.no/produkt/havrebrod-med-hirse" },
  { name: "Landbrød med frø og kjerner", ean: "7090029532197", category: "brød", weight: "630g", epd: "6499040", url: "https://www.kolonihagen.no/produkt/landbrod-med-fro-og-kjerner" },
  { name: "Baguette", ean: "7090029531855", category: "brød", weight: "450g", epd: "6224299", url: "https://www.kolonihagen.no/produkt/baguette" },
  { name: "Milk buns", ean: "7090029532371", category: "brød", weight: "240g", epd: "6775571", url: "https://www.kolonihagen.no/produkt/milk-buns" },
  { name: "Flerkornbrød bakemiks", ean: "7032069721704", category: "brød", weight: "1kg", epd: "4774527", url: "https://www.kolonihagen.no/produkt/flerkornbrod-bakemiks" },
  { name: "Glutenfritt brød", ean: "7090029531626", category: "brød", weight: "500g", epd: "6070734", url: "https://www.kolonihagen.no/produkt/glutenfritt-brod" },
  { name: "Fine rundstykker", ean: "7032069737514", category: "brød", weight: "250g", epd: "6259964", url: "https://www.kolonihagen.no/produkt/fine-rundstykker" },
  { name: "Grove rundstykker", ean: "7090029532098", category: "brød", weight: "400g", epd: "6402010", url: "https://www.kolonihagen.no/produkt/grove-rundstykker" },
  { name: "Landbrødstykker", ean: "7090029532067", category: "brød", weight: "400g", epd: "6401939", url: "https://www.kolonihagen.no/produkt/landbredstykker" },

  // === BRØD (FRYST) ===
  { name: "Ciabatta, fryst", ean: "7032069105047", category: "brød", weight: "260g", epd: "6744759", url: "https://www.kolonihagen.no/produkt/ciabatta" },
  { name: "Milk buns, fryst", ean: "7032069105030", category: "brød", weight: "500g", epd: "6746507", url: "https://www.kolonihagen.no/produkt/milk-buns-fryst" },
  { name: "Pidebrød, fryst", ean: "7032069105023", category: "brød", weight: "220g", epd: "6747901", url: "https://www.kolonihagen.no/produkt/pidebrod" },

  // === KOLONIAL ===
  { name: "Sorte bønner", ean: "7032069736715", category: "kolonial", weight: "380g", epd: "6399091", url: "https://www.kolonihagen.no/produkt/sorte-bonner" },
  { name: "Fullkornscouscous", ean: "7032069735022", category: "kolonial", weight: "500g", epd: "6094882", url: "https://www.kolonihagen.no/produkt/fullkornscouscous" },
  { name: "Quinoa", ean: "7032069735039", category: "kolonial", weight: "500g", epd: "6225395", url: "https://www.kolonihagen.no/produkt/quinoa" },
  { name: "Kokosmelk", ean: "7032069105238", category: "kolonial", weight: "330ml", epd: "6729412", url: "https://www.kolonihagen.no/produkt/kokosmelk" },
  { name: "Tofu naturell", ean: "7032069106310", category: "kolonial", weight: "200g", epd: "6776686", url: "https://www.kolonihagen.no/produkt/tofu-naturell" },
  { name: "Mais", ean: "7032069108239", category: "kolonial", weight: "3x160g", url: "https://www.kolonihagen.no/produkt/mais" },

  // === PÅLEGG OG SMØRBART ===
  { name: "Peanøttsmør", ean: "7032069736890", category: "pålegg", weight: "350g", epd: "6200125", url: "https://www.kolonihagen.no/produkt/peanottsmor" },
  { name: "Sjokopålegg", ean: "7032069103562", category: "pålegg", weight: "300g", epd: "6643597", url: "https://www.kolonihagen.no/produkt/sjokopalegg" },
  { name: "Meierismør", ean: "7032069725757", category: "meieri", weight: "200g", epd: "4961769", url: "https://www.kolonihagen.no/produkt/meierisnor" },

  // === OST ===
  { name: "Blåmuggost", ean: "7032069724439", category: "ost", weight: "125g", epd: "5154497", url: "https://www.kolonihagen.no/produkt/blamuggost" },
  { name: "Feta PDO", ean: "7032069760314", category: "ost", weight: "150g", epd: "6392401", url: "https://www.kolonihagen.no/produkt/feta" },
  { name: "Vesterhavsost", ean: "7032069725740", category: "ost", weight: "250g", epd: "5017488", url: "https://www.kolonihagen.no/produkt/vesterhavsost" },

  // === SAUSER OG PESTO ===
  { name: "Pastasaus arrabbiata", ean: "7032069107034", category: "saus", weight: "280g", epd: "6802839", url: "https://www.kolonihagen.no/produkt/pastasaus-arrabbiata" },
  { name: "Pastasaus tomat og basilikum", ean: "7032069107041", category: "saus", weight: "280g", epd: "6802854", url: "https://www.kolonihagen.no/produkt/pastasaus-tomat-og-basilikum" },
  { name: "Pizzasaus", ean: "7032069107027", category: "saus", weight: "280g", epd: "6802797", url: "https://www.kolonihagen.no/produkt/pizzasaus" },
  { name: "Pesto grønn", ean: "7032069731277", category: "saus", weight: "130g", epd: "5617105", url: "https://www.kolonihagen.no/produkt/pesto-gronn" },
  { name: "Pesto rød", ean: "7032069108246", category: "saus", weight: "130g", url: "https://www.kolonihagen.no/produkt/pesto-rod" },

  // === OLJE ===
  { name: "Olivenolje", ean: "7032069723586", category: "olje", weight: "500ml", epd: "6023980", url: "https://www.kolonihagen.no/produkt/olivenolje" },
  { name: "Rapsolje", ean: "7032069101049", category: "olje", weight: "500ml", epd: "6494223", url: "https://www.kolonihagen.no/produkt/rapsolje" },
  { name: "Solsikkeolje", ean: "7032069105221", category: "olje", weight: "500ml", epd: "6753446", url: "https://www.kolonihagen.no/produkt/solsikkeolje" },
  { name: "Pizzaolje", ean: "7032069108253", category: "olje", weight: "250ml", url: "https://www.kolonihagen.no/produkt/pizzaolje" },

  // === OLIVEN ===
  { name: "Castelvetrano oliven", ean: "7032069739365", category: "kolonial", weight: "240g", epd: "6305213", url: "https://www.kolonihagen.no/produkt/castelvetrano-oliven" },
  { name: "Kalamon oliven", ean: "7032069739358", category: "kolonial", weight: "240g", epd: "6298269", url: "https://www.kolonihagen.no/produkt/kalamon-oliven" },
  { name: "Cerignola oliven", ean: "7032069108260", category: "kolonial", weight: "240g", url: "https://www.kolonihagen.no/produkt/cerignola-oliven" },

  // === DRIKKEVARER ===
  { name: "Iskaffe Cappuccino", ean: "7032069104866", category: "drikke", weight: "250ml", epd: "6753537", url: "https://www.kolonihagen.no/produkt/iskaffe-cappuccino" },
  { name: "Iskaffe Caffe latte", ean: "7032069100127", category: "drikke", weight: "230ml", epd: "6209407", url: "https://www.kolonihagen.no/produkt/iskaffe-caffe-latte" },
  { name: "Iskaffe Mocca latte", ean: "7032069107478", category: "drikke", weight: "230ml", epd: "6419865", url: "https://www.kolonihagen.no/produkt/iskaffe-mocca-latte" },
  { name: "Sparkling appelsin & sitron", ean: "7032069731437", category: "drikke", weight: "330ml", epd: "5651708", url: "https://www.kolonihagen.no/produkt/sparkling-appelsin-sitron" },
  { name: "Sparkling blåbær og sitron", ean: "7032069106563", category: "drikke", weight: "330ml", epd: "6787501", url: "https://www.kolonihagen.no/produkt/sparkling-blabaer-sitron" },
  { name: "Sparkling bringebær & grapefrukt", ean: "7032069735312", category: "drikke", weight: "330ml", epd: "6101554", url: "https://www.kolonihagen.no/produkt/sparkling-bringebaer-grapefrukt" },
  { name: "Sparkling eple & hylleblomst", ean: "7032069100103", category: "drikke", weight: "330ml", epd: "6409825", url: "https://www.kolonihagen.no/produkt/sparkling-eple-hylleblomst" },
  { name: "Sparkling ingefær", ean: "7032069731468", category: "drikke", weight: "330ml", epd: "5651427", url: "https://www.kolonihagen.no/produkt/sparkling-ingefaer" },
  { name: "Sparkling pasjonsfrukt", ean: "7032069102800", category: "drikke", weight: "330ml", epd: "6632947", url: "https://www.kolonihagen.no/produkt/sparkling-pasjonsfrukt" },
  { name: "Sparkling sitron", ean: "7032069731444", category: "drikke", weight: "330ml", epd: "5651690", url: "https://www.kolonihagen.no/produkt/sparkling-sitron" },
  { name: "Hylleblomstdrikk", ean: "7032069108277", category: "drikke", weight: "750ml", url: "https://www.kolonihagen.no/produkt/hylleblomstdrikk" },
  { name: "Rabarbra- og bringebærsaft", ean: "7032069108284", category: "drikke", weight: "500ml", url: "https://www.kolonihagen.no/produkt/rabarbra-og-bringeb%C3%A6rsaft" },

  // === KAFFE ===
  { name: "Filtermalt kaffe", ean: "7032069102459", category: "kaffe", weight: "250g", epd: "6558993", url: "https://www.kolonihagen.no/produkt/filtermalt-kaffe" },
  { name: "Colombia & Etiopia Limited edition kaffebønner", ean: "7032069107478", category: "kaffe", weight: "225g", epd: "6848410", url: "https://www.kolonihagen.no/produkt/colombia-etiopia-limited-edition" },
  { name: "Espresso hele bønner", ean: "7032069730997", category: "kaffe", weight: "225g", epd: "5620802", url: "https://www.kolonihagen.no/produkt/espresso-hele-bonner" },
  { name: "Etiopia hele bønner", ean: "7032069730973", category: "kaffe", weight: "225g", epd: "5620638", url: "https://www.kolonihagen.no/produkt/etiopia-hele-bonner" },
  { name: "Peru hele bønner", ean: "7032069730980", category: "kaffe", weight: "225g", epd: "5620646", url: "https://www.kolonihagen.no/produkt/peru-hele-bonner" },

  // === TE (NYE) ===
  { name: "Chai urtete", ean: "7032069108291", category: "drikke", weight: "36g", url: "https://www.kolonihagen.no/produkt/chai-urtete" },
  { name: "Kamille sitrongress & lavendel urtete", ean: "7032069108307", category: "drikke", weight: "30g", url: "https://www.kolonihagen.no/produkt/kamille-sitrongress-lavendel-urtete" },
  { name: "Kamille urtete", ean: "7032069108314", category: "drikke", weight: "20g", url: "https://www.kolonihagen.no/produkt/kamille-urtete" },
  { name: "Nype & hibiscus urtete", ean: "7032069108321", category: "drikke", weight: "40g", url: "https://www.kolonihagen.no/produkt/nype-hibiscus-urtete" },
  { name: "Sitron & ingefær urtete", ean: "7032069108338", category: "drikke", weight: "30g", url: "https://www.kolonihagen.no/produkt/sitron-ingefer-urtete" },

  // === YOGHURT ===
  { name: "Klemmeyoghurt blåbær", ean: "7032069733011", category: "meieri", weight: "90g", epd: "5848874", url: "https://www.kolonihagen.no/produkt/klemmeyoghurt-blabaer" },
  { name: "Klemmeyoghurt bringebær", ean: "7032069733028", category: "meieri", weight: "90g", epd: "5848783", url: "https://www.kolonihagen.no/produkt/klemmeyoghurt-bringebaer" },
  { name: "Klemmeyoghurt jordbær og banan", ean: "7032069730713", category: "meieri", weight: "90g", epd: "5571369", url: "https://www.kolonihagen.no/produkt/klemmeyoghurt-jordbaer-banan" },
  { name: "Yoghurt, gresk type", ean: "7032069108345", category: "meieri", weight: "1kg", url: "https://www.kolonihagen.no/produkt/yoghurt-gresk-type" },

  // === EGG ===
  { name: "Egg, 10 pakning", ean: "7032069104927", category: "egg", weight: "670g", epd: "6705354", url: "https://www.kolonihagen.no/produkt/egg-10-pakning" },
  { name: "Egg, 6 pakning", ean: "7032069732007", category: "egg", weight: "390g", epd: "5966155", url: "https://www.kolonihagen.no/produkt/egg-6-pakning" },

  // === FERSKVARE (GRØNT) ===
  { name: "Agurk", ean: "7040512555110", category: "grønt", weight: "350g", epd: "6431020", url: "https://www.kolonihagen.no/produkt/agurk" },
  { name: "Crispisalat", ean: "7040512565928", category: "grønt", weight: "150g", epd: "6438042", url: "https://www.kolonihagen.no/produkt/crispisalat" },
  { name: "Epler", ean: "7032069104521", category: "grønt", weight: "500g", url: "https://www.kolonihagen.no/produkt/epler" },
  { name: "Gulrøtter", ean: "7040512530421", category: "grønt", weight: "500g", epd: "6436062", url: "https://www.kolonihagen.no/produkt/gulrotter" },
  { name: "Hjertesalat", ean: "7040512565942", category: "grønt", weight: "200g", epd: "6438626", url: "https://www.kolonihagen.no/produkt/hjertesalat" },
  { name: "Løk, gul", ean: "7032069105252", category: "grønt", weight: "500g", url: "https://www.kolonihagen.no/produkt/lok-gul" },

  // === HAVREGRYN ===
  { name: "Havregryn lettkokt", ean: "7032069729021", category: "frokost", weight: "1kg", epd: "5587738", url: "https://www.kolonihagen.no/produkt/havregryn-lettkokt" },

  // === BARNEMAT ===
  { name: "Biffgryte 12 mnd", ean: "7032069106235", category: "barnemat", weight: "210g", epd: "6771174", url: "https://www.kolonihagen.no/produkt/biffgryte-barnemat-klemmepose-12mnd" },
  { name: "Fullkornslasagne 8 mnd", ean: "7032069106211", category: "barnemat", weight: "190g", epd: "6770804", url: "https://www.kolonihagen.no/produkt/fullkornslasagne-barnemat-klemmepose-8mnd" },
  { name: "Hønsegryte med couscous 12 mnd", ean: "7032069106242", category: "barnemat", weight: "210g", epd: "6771166", url: "https://www.kolonihagen.no/produkt/honsegryte-med-couscous-barnemat-klemmepose-12mnd" },
  { name: "Hønsegryte med grønnsaker 6 mnd", ean: "7032069106174", category: "barnemat", weight: "190g", epd: "6771018", url: "https://www.kolonihagen.no/produkt/h%C3%B8nsegryte-med-gr%C3%B8nnsaker-barnemat-klemmepose-6mnd" },
  { name: "Pasta Bolognese 12 mnd", ean: "7032069106259", category: "barnemat", weight: "210g", epd: "6770986", url: "https://www.kolonihagen.no/produkt/pasta-bolognese-barnemat-klemmepose-12mnd" },
  { name: "Pasta Bolognese 6 mnd", ean: "7032069106181", category: "barnemat", weight: "190g", epd: "6771034", url: "https://www.kolonihagen.no/produkt/pasta-bolognese-barnemat-klemmepose-6mnd" },
  { name: "Pasta med grønnsaker 8 mnd", ean: "7032069106198", category: "barnemat", weight: "190g", epd: "6771158", url: "https://www.kolonihagen.no/produkt/pasta-med-gronnsaker-barnemat-klemmepose-8mnd" },
  { name: "Ragu 8 mnd", ean: "7032069106204", category: "barnemat", weight: "190g", epd: "6771026", url: "https://www.kolonihagen.no/produkt/ragu-barnemat-klemmepose-8mnd" },
  { name: "Tex Mex 8 mnd", ean: "7032069106228", category: "barnemat", weight: "190g", epd: "6770994", url: "https://www.kolonihagen.no/produkt/tex-mex-barnemat-klemmepose-8mnd" },
  { name: "Biffgryte 6 mnd", ean: "7032069108352", category: "barnemat", weight: "190g", url: "https://www.kolonihagen.no/produkt/biffgryte-barnemat-klemmepose-6mnd" },

  // === SJOKOLADE ===
  { name: "Melkesjokolade med karamell og havsalt", ean: "7032069108222", category: "sjokolade", weight: "90g", epd: "6872816", url: "https://www.kolonihagen.no/produkt/melkesjokolade-karamell-havsalt" },
  { name: "Mørk sjokolade med bringebær", ean: "7032069108215", category: "sjokolade", weight: "90g", epd: "6872972", url: "https://www.kolonihagen.no/produkt/mork-sjokolade-bringebaer" },
  { name: "Mørk sjokolade med havsalt", ean: "7032069107225", category: "sjokolade", weight: "90g", epd: "6809883", url: "https://www.kolonihagen.no/produkt/mork-sjokolade-havsalt" },
  { name: "Mørk sjokolade med mandler, karamell og havsalt", ean: "7032069107249", category: "sjokolade", weight: "100g", epd: "6809909", url: "https://www.kolonihagen.no/produkt/mork-sjokolade-mandler-karamell-havsalt" },
  { name: "Mørk sjokolade", ean: "7032069108359", category: "sjokolade", weight: "90g", url: "https://www.kolonihagen.no/produkt/mork-sjokolade" },

  // === JUICE ===
  { name: "Appelsinjuice", ean: "7032069738696", category: "drikke", weight: "90g", epd: "6305148", url: "https://www.kolonihagen.no/produkt/appelsinjuice" },
  { name: "Eplejuice", ean: "7032069738702", category: "drikke", weight: "90g", epd: "6305049", url: "https://www.kolonihagen.no/produkt/eplejuice" },

  // === IS OG SORBET ===
  { name: "Mangosorbet", ean: "7032069737842", category: "frysevarer", weight: "500ml", epd: "6230023", url: "https://www.kolonihagen.no/produkt/mangosorbet" },
  { name: "Sitronsorbet", ean: "7032069737859", category: "frysevarer", weight: "500ml", epd: "6229710", url: "https://www.kolonihagen.no/produkt/sitronsorbet" },
  { name: "Bringebærsorbet", ean: "7032069108366", category: "frysevarer", weight: "500ml", url: "https://www.kolonihagen.no/produkt/bringeb%C3%A6rsorbet" },
  { name: "Latte Macchiato is", ean: "7032069108373", category: "frysevarer", weight: "500ml", url: "https://www.kolonihagen.no/produkt/latte-macchiato-is" },
  { name: "Madagaskar vaniljeis", ean: "7032069108380", category: "frysevarer", weight: "500ml", url: "https://www.kolonihagen.no/produkt/vaniljeis-madagaskar-2" },
  { name: "Pistasjis", ean: "7032069108397", category: "frysevarer", weight: "500ml", url: "https://www.kolonihagen.no/produkt/pistasjis-med-pistasjswirl-karamellliserte-mandelbiter" },

  // === KJØTT OG PÅLEGG ===
  { name: "Bratwurst", ean: "7032069726495", category: "kjøtt", weight: "200g", epd: "5597679", url: "https://www.kolonihagen.no/produkt/bratwurst" },
  { name: "Coppa biff", ean: "2374110000006", category: "kjøtt", weight: "veievare", epd: "6422273", url: "https://www.kolonihagen.no/produkt/coppa-biff" },
  { name: "Filetbacon", ean: "7032069738085", category: "kjøtt", weight: "100g", epd: "6234967", url: "https://www.kolonihagen.no/produkt/filetbacon" },
  { name: "Grillpølser", ean: "7032069739419", category: "kjøtt", weight: "280g", epd: "6295919", url: "https://www.kolonihagen.no/produkt/grillpolser" },
  { name: "Julepølse", ean: "7032069736098", category: "kjøtt", weight: "350g", epd: "6125595", url: "https://www.kolonihagen.no/produkt/julepolse" },
  { name: "Karbonader", ean: "7032069739709", category: "kjøtt", weight: "200g", epd: "6301139", url: "https://www.kolonihagen.no/produkt/karbonader" },
  { name: "Kjøttboller", ean: "7032069106792", category: "kjøtt", weight: "200g", epd: "6774939", url: "https://www.kolonihagen.no/produkt/kjottboller" },
  { name: "Kokt skinke", ean: "7032069726570", category: "kjøtt", weight: "100g", epd: "5073051", url: "https://www.kolonihagen.no/produkt/kokt-skinke" },
  { name: "Medisterkaker", ean: "7032069736104", category: "kjøtt", weight: "400g", epd: "6125520", url: "https://www.kolonihagen.no/produkt/medisterkaker" },
  { name: "Ndujapølse", ean: "7032069100233", category: "kjøtt", weight: "300g", epd: "6450167", url: "https://www.kolonihagen.no/produkt/ndujapolse" },
  { name: "Pepperskinke", ean: "7032069738856", category: "kjøtt", weight: "100g", epd: "6237002", url: "https://www.kolonihagen.no/produkt/pepperskinke" },
  { name: "Pinnekjøtt", ean: "2374113700002", category: "kjøtt", weight: "1,5kg", epd: "6848477", url: "https://www.kolonihagen.no/produkt/pinnekjott" },
  { name: "Presa biff", ean: "2374110100003", category: "kjøtt", weight: "veievare", epd: "6422299", url: "https://www.kolonihagen.no/produkt/presa-biff" },
  { name: "Salami med fennikel", ean: "7032069722626", category: "kjøtt", weight: "60g", epd: "4838603", url: "https://www.kolonihagen.no/produkt/salami-fennikel" },
  { name: "Svin, indrefilet", ean: "2374104000005", category: "kjøtt", weight: "600-800g", epd: "5393707", url: "https://www.kolonihagen.no/produkt/svin-indrefilet" },
  { name: "Svin, nakkefilet", ean: "2374103600008", category: "kjøtt", weight: "700-1000g", epd: "5393715", url: "https://www.kolonihagen.no/produkt/svin-nakkefilet" },
  { name: "Svin, ytrefilet", ean: "2374103700005", category: "kjøtt", weight: "700-1000g", epd: "5393772", url: "https://www.kolonihagen.no/produkt/svin-ytrefilet" },
  { name: "Svineribbe", ean: "2374103500001", category: "kjøtt", weight: "veievare", epd: "4991576", url: "https://www.kolonihagen.no/produkt/svineribbe" },
  { name: "Guanciale", ean: "7032069108406", category: "kjøtt", weight: "150g", url: "https://www.kolonihagen.no/produkt/guanciale" },

  // === NØTTER (NYE) ===
  { name: "Cashewnøtter paprika & rosmarin", ean: "7032069108413", category: "snacks", weight: "120g", url: "https://www.kolonihagen.no/produkt/cashewn%C3%B8tter-paprika-rosmarin" },
  { name: "Peanøtter ingefær & sichuanpepper", ean: "7032069108420", category: "snacks", weight: "120g", url: "https://www.kolonihagen.no/produkt/pean%C3%B8tter-ingef%C3%A6r-sichuanpepper" },

  // === PASTA (NYE) ===
  { name: "Amorini", ean: "7032069108437", category: "kolonial", weight: "500g", url: "https://www.kolonihagen.no/produkt/amorini" },
  { name: "Pappardelle", ean: "7032069108444", category: "kolonial", weight: "500g", url: "https://www.kolonihagen.no/produkt/pappardelle-pasta" },
  { name: "Tortiglioni", ean: "7032069108451", category: "kolonial", weight: "500g", url: "https://www.kolonihagen.no/produkt/tortiglioni" },

  // === TEX MEX (NYE) ===
  { name: "Salsa", ean: "7032069108468", category: "saus", weight: "230g", url: "https://www.kolonihagen.no/produkt/salsa" },
  { name: "Tacokrydder", ean: "7032069108475", category: "krydder", weight: "30g", url: "https://www.kolonihagen.no/produkt/tacokrydder" },
  { name: "Tortillachips", ean: "7032069108482", category: "snacks", weight: "200g", url: "https://www.kolonihagen.no/produkt/tortillachips" },
  { name: "Tortillas", ean: "7032069108499", category: "brød", weight: "240g", url: "https://www.kolonihagen.no/produkt/tortillas" },
];

// ─── Scraping logic ───────────────────────────────────────────────

function extractBetween(html: string, startMarker: string, endMarker: string): string | null {
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) return null;
  const contentStart = startIdx + startMarker.length;
  const endIdx = html.indexOf(endMarker, contentStart);
  if (endIdx === -1) return html.substring(contentStart);
  return html.substring(contentStart, endIdx);
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\*Økologisk/g, "*Økologisk")
    .trim();
}

function extractSidebarBlock(html: string, heading: string): string | null {
  // Find the h3 with the heading
  const h3Pattern = `<h3 class="sidebar-block__heading">${heading}</h3>`;
  const h3Idx = html.indexOf(h3Pattern);
  if (h3Idx === -1) return null;

  // Find the content div after h3
  const contentStart = html.indexOf('<div class="sidebar-block__content">', h3Idx);
  if (contentStart === -1) return null;
  const innerStart = contentStart + '<div class="sidebar-block__content">'.length;

  // Find closing </div>
  const innerEnd = html.indexOf("</div>", innerStart);
  if (innerEnd === -1) return null;

  return html.substring(innerStart, innerEnd);
}

function extractCollapsedBlock(html: string, label: string): string | null {
  const labelPattern = `<span class="sidebar-block__toggle-button-label">${label}</span>`;
  const labelIdx = html.indexOf(labelPattern);
  if (labelIdx === -1) return null;

  const contentStart = html.indexOf('<div class="sidebar-block__content">', labelIdx);
  if (contentStart === -1) return null;
  const innerStart = contentStart + '<div class="sidebar-block__content">'.length;
  const innerEnd = html.indexOf("</div>", innerStart);
  if (innerEnd === -1) return null;

  return html.substring(innerStart, innerEnd);
}

function parseNutrition(html: string): Record<string, string> {
  const text = stripHtml(html);
  const nutrition: Record<string, string> = {};
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const energyMatch = line.match(/Energi\s+(.+)/i);
    if (energyMatch) { nutrition.energy = energyMatch[1]; continue; }

    const fettMatch = line.match(/^Fett\s+([\d,.]+\s*g)/i);
    if (fettMatch) { nutrition.fat = fettMatch[1]; continue; }

    const carbMatch = line.match(/^Karbohydrater\s+([\d,.]+\s*g)/i);
    if (carbMatch) { nutrition.carbohydrates = carbMatch[1]; continue; }

    const fiberMatch = line.match(/^Kostfiber\s+([\d,.]+\s*g)/i);
    if (fiberMatch) { nutrition.fiber = fiberMatch[1]; continue; }

    const proteinMatch = line.match(/^Protein\s+([\d,.]+\s*g)/i);
    if (proteinMatch) { nutrition.protein = proteinMatch[1]; continue; }

    const saltMatch = line.match(/^Salt\s+([\d,.]+\s*g)/i);
    if (saltMatch) { nutrition.salt = saltMatch[1]; continue; }
  }

  return nutrition;
}

function extractProductImage(html: string): string | null {
  // Look for product images in the media container (not icons)
  const mediaContainer = extractBetween(html, 'class="product-detail__media-container"', '</div>\n\n');
  if (!mediaContainer) return null;

  // Get the highest-res image from data-srcset
  const srcsetMatch = mediaContainer.match(/data-srcset="([^"]+)"/);
  if (srcsetMatch) {
    const srcset = srcsetMatch[1].replace(/&amp;/g, "&");
    const urls = srcset.split(",").map(s => s.trim());
    // Get the last (highest res) URL
    const lastUrl = urls[urls.length - 1];
    const urlOnly = lastUrl.split(" ")[0];
    if (urlOnly && !urlOnly.includes("Ikoner/")) return urlOnly;
  }

  return null;
}

async function scrapeProductPage(url: string): Promise<ScrapedData> {
  const result: ScrapedData = {
    ingredients_raw: null,
    allergens: [],
    nutrition: {},
    image_url: null,
    description: null,
  };

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Picki/1.0 (product enrichment)" },
    });
    if (!res.ok) {
      console.warn(`Scrape failed ${url}: HTTP ${res.status}`);
      return result;
    }

    const html = await res.text();

    // Extract ingredients
    const ingredientsHtml = extractSidebarBlock(html, "Ingredienser");
    if (ingredientsHtml) {
      result.ingredients_raw = stripHtml(ingredientsHtml);
    }

    // Extract allergens
    const allergensHtml = extractSidebarBlock(html, "Allergener");
    if (allergensHtml) {
      const allergensText = stripHtml(allergensHtml);
      result.allergens = allergensText.split(/[,\n]/).map(a => a.trim()).filter(Boolean);
    }

    // Extract nutrition
    const nutritionHtml = extractCollapsedBlock(html, "Næringsinnhold");
    if (nutritionHtml) {
      result.nutrition = parseNutrition(nutritionHtml);
    }

    // Extract product image
    result.image_url = extractProductImage(html);

    // Extract description
    const descBlock = extractBetween(html, 'class="product-detail__body">', '</div>');
    if (descBlock) {
      result.description = stripHtml(descBlock);
    }

    console.log(`Scraped ${url}: ingredients=${!!result.ingredients_raw}, image=${!!result.image_url}, nutrition_keys=${Object.keys(result.nutrition).length}`);
  } catch (e) {
    console.warn(`Scrape error ${url}:`, e instanceof Error ? e.message : e);
  }

  return result;
}

// ─── Seeding logic ────────────────────────────────────────────────

async function seedProducts(): Promise<{
  total: number;
  sourcesUpserted: number;
  productsUpserted: number;
  offersCreated: number;
  epdEnriched: number;
  scraped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let sourcesUpserted = 0;
  let productsUpserted = 0;
  let offersCreated = 0;
  let epdEnriched = 0;
  let scraped = 0;

  console.log(`Starting Kolonihagen seeding: ${KOLONIHAGEN_PRODUCTS.length} products`);

  // 1. Upsert all products into product_sources
  for (const product of KOLONIHAGEN_PRODUCTS) {
    try {
      const { error } = await supabase.from("product_sources").upsert({
        ean: product.ean,
        source: "MANUAL" as const,
        source_product_id: product.ean,
        payload: {
          brand: "Kolonihagen",
          name: product.name,
          category: product.category,
          weight: product.weight,
          epd: product.epd,
          organic: true,
          store_exclusive: "rema_1000",
          url: product.url,
        },
        name: `Kolonihagen ${product.name}`,
        brand: "Kolonihagen",
        fetched_at: new Date().toISOString(),
      }, { onConflict: "ean,source", ignoreDuplicates: false });

      if (error) {
        errors.push(`product_sources ${product.ean}: ${error.message}`);
      } else {
        sourcesUpserted++;
      }
    } catch (e) {
      errors.push(`product_sources ${product.ean}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`product_sources: ${sourcesUpserted}/${KOLONIHAGEN_PRODUCTS.length} upserted`);

  // 2. Upsert into products table
  for (const product of KOLONIHAGEN_PRODUCTS) {
    try {
      const { error } = await supabase.from("products").upsert({
        ean: product.ean,
        name: `Kolonihagen ${product.name}`,
        brand: "Kolonihagen",
        updated_at: new Date().toISOString(),
      }, { onConflict: "ean", ignoreDuplicates: false });

      if (error) {
        errors.push(`products ${product.ean}: ${error.message}`);
      } else {
        productsUpserted++;
      }
    } catch (e) {
      errors.push(`products ${product.ean}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`products: ${productsUpserted}/${KOLONIHAGEN_PRODUCTS.length} upserted`);

  // 3. Create offers for Rema 1000
  const offerRows = KOLONIHAGEN_PRODUCTS.map(p => ({
    ean: p.ean,
    chain_id: REMA_1000_CHAIN_ID,
    last_seen_at: new Date().toISOString(),
    source: "MANUAL",
  }));

  const { error: offersError } = await supabase.from("offers").upsert(offerRows, {
    onConflict: "ean,chain_id",
    ignoreDuplicates: false,
  });

  if (offersError) {
    errors.push(`offers bulk: ${offersError.message}`);
  } else {
    offersCreated = offerRows.length;
  }

  console.log(`offers: ${offersCreated} created for Rema 1000`);

  // 4. EPD enrichment via VDA+ (background, best effort)
  const vdaClientId = Deno.env.get("VDA_CLIENT_ID");
  if (vdaClientId) {
    console.log("Starting VDA+/EPD enrichment...");
    const allEans = KOLONIHAGEN_PRODUCTS.map(p => p.ean);
    const { data: existingEpd } = await supabase
      .from("product_sources")
      .select("ean")
      .in("ean", allEans)
      .eq("source", "EPD");

    const existingEpdEans = new Set((existingEpd || []).map(r => r.ean));
    const needsEpd = KOLONIHAGEN_PRODUCTS.filter(p => !existingEpdEans.has(p.ean));

    console.log(`EPD: ${existingEpdEans.size} already cached, ${needsEpd.length} need enrichment`);

    for (let i = 0; i < needsEpd.length; i += 5) {
      const batch = needsEpd.slice(i, i + 5);
      await Promise.allSettled(
        batch.map(async (product) => {
          try {
            const res = await fetch(`${supabaseUrl}/functions/v1/fetch-epd`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({ action: "lookup", gtin: product.ean }),
            });

            if (!res.ok) { await res.text(); return; }
            const data = await res.json();
            if (data.found) {
              epdEnriched++;
              console.log(`EPD enriched: ${product.name} (${product.ean})`);
              await fetch(`${supabaseUrl}/functions/v1/recompute-master-product`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({ ean: product.ean }),
              });
            }
          } catch (e) {
            console.warn(`EPD failed for ${product.ean}:`, e instanceof Error ? e.message : e);
          }
        })
      );
      if (i + 5 < needsEpd.length) await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`EPD enrichment done: ${epdEnriched} products enriched`);
  } else {
    console.warn("VDA_CLIENT_ID not configured, skipping EPD enrichment");
  }

  // 5. Scrape kolonihagen.no for ingredients, images, nutrition
  console.log("Starting kolonihagen.no scraping...");

  // Check which products already have ingredients in product_sources or products
  const allEans = KOLONIHAGEN_PRODUCTS.map(p => p.ean);
  const { data: existingProducts } = await supabase
    .from("products")
    .select("ean, ingredients_raw, image_url")
    .in("ean", allEans);

  const alreadyEnriched = new Set(
    (existingProducts || [])
      .filter(p => p.ingredients_raw && p.ingredients_raw.length > 5)
      .map(p => p.ean)
  );

  const needsScraping = KOLONIHAGEN_PRODUCTS.filter(
    p => p.url && !alreadyEnriched.has(p.ean)
  );

  console.log(`Scraping: ${alreadyEnriched.size} already enriched, ${needsScraping.length} need scraping`);

  for (let i = 0; i < needsScraping.length; i += 5) {
    const batch = needsScraping.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (product) => {
        if (!product.url) return null;

        const data = await scrapeProductPage(product.url);
        if (!data.ingredients_raw && !data.image_url) return null;

        // Update product_sources
        const updatePayload: Record<string, unknown> = {};
        if (data.ingredients_raw) updatePayload.ingredients_raw = data.ingredients_raw;
        if (data.image_url) updatePayload.image_url = data.image_url;

        // Merge nutrition + allergens into payload
        const { data: existingSource } = await supabase
          .from("product_sources")
          .select("payload")
          .eq("ean", product.ean)
          .eq("source", "MANUAL")
          .single();

        const existingPayload = (existingSource?.payload as Record<string, unknown>) || {};
        updatePayload.payload = {
          ...existingPayload,
          nutrition: data.nutrition,
          allergens: data.allergens,
          description: data.description,
          scraped_at: new Date().toISOString(),
        };

        const { error: srcError } = await supabase
          .from("product_sources")
          .update(updatePayload)
          .eq("ean", product.ean)
          .eq("source", "MANUAL");

        if (srcError) {
          errors.push(`scrape update product_sources ${product.ean}: ${srcError.message}`);
          return null;
        }

        // Update products table
        const productUpdate: Record<string, unknown> = {};
        if (data.ingredients_raw) productUpdate.ingredients_raw = data.ingredients_raw;
        if (data.image_url) productUpdate.image_url = data.image_url;

        if (Object.keys(productUpdate).length > 0) {
          const { error: prodError } = await supabase
            .from("products")
            .update(productUpdate)
            .eq("ean", product.ean);

          if (prodError) {
            errors.push(`scrape update products ${product.ean}: ${prodError.message}`);
          }
        }

        // Trigger recompute for NOVA classification
        if (data.ingredients_raw) {
          await fetch(`${supabaseUrl}/functions/v1/recompute-master-product`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ ean: product.ean }),
          }).catch(() => {});
        }

        scraped++;
        return data;
      })
    );

    if (i + 5 < needsScraping.length) await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`Scraping done: ${scraped} products enriched from kolonihagen.no`);

  return {
    total: KOLONIHAGEN_PRODUCTS.length,
    sourcesUpserted,
    productsUpserted,
    offersCreated,
    epdEnriched,
    scraped,
    errors,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;

  if (!isServiceRole) {
    try {
      await validateAuth(req);
    } catch {
      return unauthorizedResponse();
    }
  }

  try {
    const result = await seedProducts();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in seed-kolonihagen:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
