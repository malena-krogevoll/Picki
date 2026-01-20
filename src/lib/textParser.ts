export interface ParsedItem {
  product_name: string;
  quantity: number;
  notes?: string;
}

// Norwegian units to strip from ingredient names
const UNITS_TO_STRIP = [
  'stk', 'stykk', 'stykker',
  'g', 'gram',
  'kg', 'kilo',
  'dl', 'desiliter',
  'l', 'liter',
  'ml', 'milliliter',
  'cl', 'centiliter',
  'ss', 'spiseskje', 'spiseskjeer',
  'ts', 'teskje', 'teskjeer',
  'kopp', 'kopper',
  'neve', 'never',
  'klype', 'klyper',
  'dråpe', 'dråper',
  'pk', 'pakke', 'pakker',
  'boks', 'bokser',
  'pose', 'poser',
  'beger', 'begre',
  'flaske', 'flasker',
  'bunt', 'bunter',
  'skive', 'skiver',
  'fedd',
];

// Preparation methods and descriptions to strip (usually at the end)
const PREP_PATTERNS = [
  /\s+i\s+(terninger|biter|skiver|strimler|ringer|båter)$/i,
  /\s+(hakket|hakkede|raspet|revet|skivet|kuttet|delt|knust|most|presset)$/i,
  /\s+(finhakket|finhakkede|grovhakket|grovhakkede)$/i,
  /\s+(tørket|tørkede|fersk|ferske|frossen|frosne|hermetisk|hermetiske)$/i,
  /\s+(rå|rått|kokt|kokte|stekt|stekte|bakt|bakte|grillet|grillede)$/i,
  /\s+(hel|hele|halv|halve|kvart)$/i,
  /\s+(stor|store|liten|små|medium|middels)$/i,
  /\s+(fin|fine|grov|grove|tykk|tykke|tynn|tynne)$/i,
  /\s+(romtemperert|romtempererte|avkjølt|avkjølte|oppvarmet|oppvarmede)$/i,
  /\s+(uten\s+skall|med\s+skall|uten\s+skinn|med\s+skinn)$/i,
  /\s+(renset|rensede|vasket|vaskede)$/i,
  /\s+til\s+(steking|koking|servering|pynt)$/i,
  /\s+etter\s+smak$/i,
  /\s+ca\.?$/i,
  /\s+eller\s+mer$/i,
];

// Words that should be stripped when they appear alone after a unit
const FILLER_WORDS = ['av', 'med', 'til', 'fra', 'på', 'i'];

/**
 * Parses free text input into shopping list items
 * Supports formats like:
 * - "milk, eggs, bread"
 * - "2 bananas, 1 liter milk, eggs"
 * - "3x apples, bread (whole grain)"
 * - "200 g tørket pasta" -> "pasta"
 * - "2 stk paprika i terninger" -> "paprika"
 */
export function parseShoppingListText(text: string): ParsedItem[] {
  if (!text.trim()) return [];

  // Split by common separators (comma, newline, semicolon)
  const items = text.split(/[,\n;]/).map(item => item.trim()).filter(Boolean);
  
  const parsedItems: ParsedItem[] = [];

  for (const item of items) {
    const parsed = parseIndividualItem(item);
    if (parsed) {
      parsedItems.push(parsed);
    }
  }

  return parsedItems;
}

function parseIndividualItem(item: string): ParsedItem | null {
  if (!item.trim()) return null;

  let cleanItem = item.trim();
  let quantity = 1;
  let notes = '';

  // Extract notes in parentheses
  const notesMatch = cleanItem.match(/\(([^)]+)\)/);
  if (notesMatch) {
    notes = notesMatch[1].trim();
    cleanItem = cleanItem.replace(/\([^)]+\)/, '').trim();
  }

  // Extract quantity from the beginning
  // Pattern: number followed by optional unit
  const quantityMatch = cleanItem.match(/^(\d+(?:[.,]\d+)?)\s*/);
  if (quantityMatch) {
    const quantityStr = quantityMatch[1].replace(',', '.');
    const parsedQuantity = parseFloat(quantityStr);
    if (!isNaN(parsedQuantity) && parsedQuantity > 0) {
      quantity = Math.max(1, Math.floor(parsedQuantity));
    }
    cleanItem = cleanItem.slice(quantityMatch[0].length).trim();
  }

  // Remove unit if present at the start
  const unitPattern = new RegExp(`^(${UNITS_TO_STRIP.join('|')})\\.?\\s+`, 'i');
  cleanItem = cleanItem.replace(unitPattern, '').trim();

  // Also handle "Xx" pattern like "2x apples"
  cleanItem = cleanItem.replace(/^x\s*/i, '').trim();

  // Remove filler words at the start
  const fillerPattern = new RegExp(`^(${FILLER_WORDS.join('|')})\\s+`, 'i');
  cleanItem = cleanItem.replace(fillerPattern, '').trim();

  // Apply preparation pattern removals (from end)
  for (const pattern of PREP_PATTERNS) {
    cleanItem = cleanItem.replace(pattern, '').trim();
  }

  // Clean up the product name
  const productName = cleanItem
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  if (!productName || productName.length < 2) return null;

  return {
    product_name: productName,
    quantity,
    notes: notes || undefined
  };
}

/**
 * Formats a parsed item back to readable text for preview
 */
export function formatParsedItem(item: ParsedItem): string {
  let formatted = '';
  
  if (item.quantity > 1) {
    formatted += `${item.quantity} `;
  }
  
  formatted += item.product_name;
  
  if (item.notes) {
    formatted += ` (${item.notes})`;
  }
  
  return formatted;
}