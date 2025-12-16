import { Recipe } from "@/pages/DinnerExplorer";

export const recipes: Recipe[] = [
  {
    id: "1",
    title: "Bakt laks med grønnsaker",
    description: "Saftig laks med ovnsbakte rotgrønnsaker og friske urter",
    servings: 4,
    prepTime: 15,
    cookTime: 25,
    category: "Fisk",
    ingredients: [
      "600g laksfilet",
      "500g gulrøtter",
      "400g brokkoli",
      "2 ss olivenolje",
      "Salt",
      "Pepper",
      "1 sitron",
      "Fersk dill"
    ],
    steps: [
      "Forvarm ovnen til 200°C.",
      "Skjær gulrøttene i skiver og brokkoli i buketter.",
      "Legg grønnsakene på et stekebrett, drypp over olivenolje, salt og pepper.",
      "Legg laksfileten oppå grønnsakene.",
      "Press sitron over laksen og krydre med salt, pepper og hakket dill.",
      "Stek i ovnen i 20-25 minutter til laksen er gjennomstekt.",
      "Server med sitronbåter på siden."
    ]
  },
  {
    id: "2",
    title: "Hjemmelaget kjøttboller",
    description: "Klassiske kjøttboller av rent kjøtt med kremet saus",
    servings: 4,
    prepTime: 20,
    cookTime: 30,
    category: "Kjøtt",
    ingredients: [
      "500g kjøttdeig",
      "1 egg",
      "1 løk",
      "2 ss havregryn",
      "1 dl melk",
      "Salt",
      "Pepper",
      "2 ss smør",
      "3 dl fløte",
      "2 ss mel"
    ],
    steps: [
      "Bland kjøttdeig, egg, finhakket løk, havregryn, melk, salt og pepper.",
      "Form deigen til kjøttboller.",
      "Stek kjøttbollene i smør til de er gjennomstekte og gylne.",
      "Ta kjøttbollene ut av pannen.",
      "Bland mel i pannen og rør inn fløten for å lage saus.",
      "La sausen koke opp og smak til med salt og pepper.",
      "Legg kjøttbollene tilbake i sausen og la dem varmes.",
      "Server med kokte poteter eller ris."
    ]
  },
  {
    id: "3",
    title: "Grønnsakssuppe",
    description: "Næringsrik og fyldig suppe med ferske grønnsaker",
    servings: 6,
    prepTime: 15,
    cookTime: 30,
    category: "Vegetar",
    ingredients: [
      "3 gulrøtter",
      "2 løk",
      "3 poteter",
      "1 purre",
      "2 stilker stangselleri",
      "1,5 liter grønnsaksbuljong",
      "2 ss olivenolje",
      "Salt",
      "Pepper",
      "Fersk persille"
    ],
    steps: [
      "Skrell og hakk alle grønnsakene i terninger.",
      "Varm opp oljen i en stor gryte.",
      "Stek løk og purre til de er myke.",
      "Tilsett resten av grønnsakene og stek i 5 minutter.",
      "Hell over buljongen og la det koke i 20-25 minutter til grønnsakene er møre.",
      "Smak til med salt og pepper.",
      "Topp med fersk hakket persille før servering."
    ]
  },
  {
    id: "4",
    title: "Kylling med ris og grønnsaker",
    description: "Enkel og sunn middag med saftig kylling",
    servings: 4,
    prepTime: 10,
    cookTime: 35,
    category: "Kylling",
    ingredients: [
      "600g kyllingfilét",
      "3 dl ris",
      "1 rød paprika",
      "1 gul paprika",
      "200g sukkererter",
      "2 ss olivenolje",
      "2 fedd hvitløk",
      "Salt",
      "Pepper"
    ],
    steps: [
      "Kok risen etter anvisning på pakken.",
      "Skjær kyllingen i terninger og krydre med salt og pepper.",
      "Skjær paprika i strimler.",
      "Stek kyllingen i olje til den er gjennomstekt.",
      "Tilsett hakket hvitløk, paprika og sukkererter.",
      "Stek videre i 5 minutter.",
      "Bland inn den kokte risen og rør godt.",
      "Server umiddelbart."
    ]
  },
  {
    id: "5",
    title: "Pasta med tomatsaus",
    description: "Klassisk tomatsaus med ferske urter",
    servings: 4,
    prepTime: 10,
    cookTime: 25,
    category: "Pasta",
    ingredients: [
      "400g pasta",
      "800g tomater",
      "2 fedd hvitløk",
      "1 løk",
      "3 ss olivenolje",
      "Salt",
      "Pepper",
      "Fersk basilikum",
      "Parmesan"
    ],
    steps: [
      "Kok pastaen etter anvisning på pakken.",
      "Stek finhakket løk og hvitløk i olivenolje.",
      "Tilsett hakkede tomater og la det småkoke i 15 minutter.",
      "Smak til med salt, pepper og fersk basilikum.",
      "Bland den varme pastaen med sausen.",
      "Server med revet parmesan på toppen."
    ]
  },
  {
    id: "6",
    title: "Biff med stekte grønnsaker",
    description: "Mørt kjøtt med sprø, fargerike grønnsaker",
    servings: 4,
    prepTime: 15,
    cookTime: 20,
    category: "Kjøtt",
    ingredients: [
      "600g biff",
      "2 squash",
      "1 aubergine",
      "2 paprika",
      "3 ss olivenolje",
      "2 fedd hvitløk",
      "Salt",
      "Pepper",
      "Fersk rosmarin"
    ],
    steps: [
      "Skjær grønnsakene i biter.",
      "Krydre biffen med salt, pepper og hakket rosmarin.",
      "Stek biffen i olje til ønsket stekegrad, la den hvile.",
      "Stek grønnsakene med hvitløk til de er møre men sprø.",
      "Skjær biffen i skiver.",
      "Server biffen med de stekte grønnsakene."
    ]
  }
];
