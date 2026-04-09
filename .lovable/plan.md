

## Problem

The `suggest-items` function asks the AI for **descriptive variants** ("cottage cheese med mindre fett", "cottage cheese med urter"), but these long phrases produce poor search matches in the product database. The user wants suggestions optimized for **search precision** -- short, canonical product names that will actually find clean products (e.g., "cottage cheese", "kremost", "kesam").

## Solution

Update the AI prompt in `suggest-items` to generate **search-optimized product names** instead of descriptive variants. The suggestions should be short, generic category terms that map well to actual product names in Norwegian grocery stores.

### Changes

**`supabase/functions/suggest-items/index.ts`** -- Rewrite the system and user prompts:

- **Goal shift**: From "suggest variants/types" to "suggest the best search terms to find this product category in a grocery database"
- **New prompt rules**:
  - Keep suggestions to 1-2 words max (e.g., "cottage cheese", not "cottage cheese med mindre fett")
  - Focus on the **base product name** as the first suggestion
  - Include related category terms that would also match (e.g., for "cottage" → "cottage cheese, kesam, kremost")
  - No adjectives like "fersk", "stor", "med urter" -- these narrow the search unnecessarily
- **Updated examples**:
  - "cottage" → cottage cheese, kesam, kremost
  - "melk" → helmelk, lettmelk, havremelk, soyamelk
  - "kylling" → kyllingfilet, kyllinglår, kyllingbryst
  - "smør" → smør, lettsmør, margarin

This ensures that when a user clicks a suggestion, the search-products function gets a clean, broad term that maximizes database and API hits.

