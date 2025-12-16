/**
 * Removes measurement units from ingredient names while preserving the core ingredient
 * Examples:
 * - "800g tomater" → "tomater"
 * - "2 ss olivenolje" → "olivenolje"
 * - "1 dl melk" → "melk"
 * - "600g laksfilet" → "laksfilet"
 */
export function removeUnitsFromIngredient(ingredient: string): string {
  // Remove leading numbers and common Norwegian measurement units
  return ingredient
    .replace(/^\d+[\.,]?\d*\s*(kg|g|mg|l|dl|ml|cl|ss|ts|stk|pk|boks|pose|fedd|stilk|stilker|porsjon|porsjoner|bit|biter)\s+/gi, '')
    .replace(/^\d+[\.,]?\d*\s+/g, '') // Remove remaining standalone numbers
    .trim();
}
