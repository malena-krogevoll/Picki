export interface ParsedItem {
  product_name: string;
  quantity: number;
  notes?: string;
}

/**
 * Parses free text input into shopping list items
 * Supports formats like:
 * - "milk, eggs, bread"
 * - "2 bananas, 1 liter milk, eggs"
 * - "3x apples, bread (whole grain)"
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

  // Pattern matching for quantities
  const patterns = [
    // "2 bananas", "3 eggs", "1 liter milk"
    /^(\d+(?:[.,]\d+)?)\s*(?:x\s*)?(.+)/i,
    // "2x apples", "3x bread"
    /^(\d+(?:[.,]\d+)?)\s*x\s*(.+)/i,
    // Just the product name
    /^(.+)$/
  ];

  for (const pattern of patterns) {
    const match = cleanItem.match(pattern);
    if (match) {
      if (match.length === 3) {
        // Has quantity
        const quantityStr = match[1].replace(',', '.');
        const parsedQuantity = parseFloat(quantityStr);
        if (!isNaN(parsedQuantity)) {
          quantity = Math.max(1, Math.floor(parsedQuantity));
        }
        cleanItem = match[2].trim();
      } else {
        // Just product name
        cleanItem = match[1].trim();
      }
      break;
    }
  }

  // Clean up the product name
  const productName = cleanItem
    .replace(/^\d+\s*x?\s*/i, '') // Remove any remaining quantity prefixes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  if (!productName) return null;

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