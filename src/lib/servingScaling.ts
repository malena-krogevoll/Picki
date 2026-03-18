/**
 * Pure utility functions for recipe serving/portion scaling.
 *
 * Extracted from RecipeDetailEnhanced so the logic is testable
 * and reusable across recipe detail views and cookbook pages.
 *
 * @module servingScaling
 */

/**
 * Compute the scale factor for ingredient quantities.
 */
export function scaleFactor(desiredServings: number, originalServings: number): number {
  if (originalServings <= 0) return 1;
  return desiredServings / originalServings;
}

/**
 * Scale a quantity string by a given factor.
 *
 * Handles:
 * - Fractions like "1/2"
 * - Decimals with comma ("1,5") or dot ("1.5")
 * - Trailing text after the number ("400 g" → number part scaled, "g" preserved)
 * - Plain text without numbers (returned as-is)
 * - null / empty (returned as empty string)
 *
 * Output uses comma as decimal separator (Norwegian locale).
 */
export function scaleQuantity(quantity: string | null | undefined, factor: number): string {
  if (!quantity) return "";

  const trimmed = quantity.trim();
  if (!trimmed) return "";

  // Match leading number (with optional fraction or decimal) + optional remaining text
  const numMatch = trimmed.match(/^([\d.,\/]+)\s*(.*)$/);
  if (!numMatch) return trimmed;

  const numPart = numMatch[1];
  const textPart = numMatch[2];
  const suffix = textPart ? ` ${textPart}` : "";

  // Handle fractions like "1/2"
  if (numPart.includes("/")) {
    const parts = numPart.split("/");
    if (parts.length !== 2) return trimmed;
    const numerator = parseFloat(parts[0].replace(",", "."));
    const denominator = parseFloat(parts[1].replace(",", "."));
    if (isNaN(numerator) || isNaN(denominator) || denominator === 0) return trimmed;
    return formatScaled((numerator / denominator) * factor, suffix);
  }

  const num = parseFloat(numPart.replace(",", "."));
  if (isNaN(num)) return trimmed;

  return formatScaled(num * factor, suffix);
}

/**
 * Format a scaled numeric value for display.
 * Uses whole numbers when possible, otherwise 1 decimal with comma separator.
 */
function formatScaled(value: number, suffix: string): string {
  if (value === Math.floor(value)) {
    return `${value}${suffix}`;
  }
  return `${value.toFixed(1).replace(".", ",")}${suffix}`;
}

/**
 * Determine the default number of servings for a recipe.
 *
 * Dinner recipes default to household_size from the user's profile.
 * Other recipe types (base, diy) use the recipe's own servings value.
 */
export function defaultServings(
  recipeType: string,
  recipeServings: number | null | undefined,
  householdSize: number | null | undefined,
): number {
  if (recipeType === "dinner") {
    return householdSize || recipeServings || 4;
  }
  return recipeServings || 1;
}
