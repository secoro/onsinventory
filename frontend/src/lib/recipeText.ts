import { RecipeIngredient } from "../types";

export function parseIngredientLine(line: string): RecipeIngredient {
  const match = line.match(/^(\d+(?:[.,]\d+)?)\s+(\S+)(?:\s+(?:of|van))?\s+(.+)$/i);
  if (match) {
    const [, qtyStr, unit, name] = match;
    return {
      ingredientName: name.trim(),
      quantity: parseFloat(qtyStr.replace(",", ".")),
      unit: unit.toLowerCase(),
      optional: false
    };
  }
  return { ingredientName: line.trim(), quantity: 1, unit: "pieces", optional: false };
}

export function parseInstructionSteps(instructions?: string): string[] {
  if (!instructions || !instructions.trim()) {
    return ["No instructions provided."];
  }

  const numbered = instructions
    .split(/\s*(?=\d+\.\s)/)
    .map((step) => step.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  if (numbered.length > 1) {
    return numbered;
  }

  const sentences = instructions
    .split(/\.\s+/)
    .map((step) => step.replace(/\.$/, "").trim())
    .filter(Boolean);

  return sentences.length > 0 ? sentences : [instructions.trim()];
}
