import { useState, useMemo, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Check, Copy, GripVertical, Minus, Plus, Search, Share2, ShoppingCart, X } from "lucide-react";
import { InventoryItem, Recipe } from "../types";

// ─── Local types ────────────────────────────────────────────────────────────

type PlannedMeal = {
  id: string;
  recipeId: number;
  recipeName: string;
  servings: number;
};

type MealPlan = Record<string, PlannedMeal[]>; // key: YYYY-MM-DD

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STORAGE_KEY = "ons_meal_plan";

// ─── Date helpers ────────────────────────────────────────────────────────────

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekDays(offset: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay(); // 0 = Sunday
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function dayIndex(date: Date): number {
  const dow = date.getDay();
  return dow === 0 ? 6 : dow - 1; // 0 = Mon, 6 = Sun
}

// ─── Grocery helpers ─────────────────────────────────────────────────────────

// Low-stock thresholds: if inventory is at or below these levels, flag for restock
// even when you technically have enough for your planned meals.
function isLowStock(quantity: number, unit: string): boolean {
  const u = unit.toLowerCase().trim();
  if (["g", "gram", "grams"].includes(u)) return quantity <= 200;
  if (["kg", "kilogram", "kilograms"].includes(u)) return quantity <= 0.5;
  if (["ml", "milliliter", "milliliters", "millilitre", "millilitres"].includes(u)) return quantity <= 200;
  if (["l", "liter", "liters", "litre", "litres"].includes(u)) return quantity <= 0.5;
  if (["cl", "centiliter", "centiliters", "centilitre", "centilitres"].includes(u)) return quantity <= 20;
  return quantity <= 5; // pieces, cloves, tbsp, tsp, items, etc.
}

function buildGroceryList(
  mealPlan: MealPlan,
  recipes: Recipe[],
  weekDays: Date[],
  inventory: InventoryItem[]
): string[] {
  // Collect total needed per ingredient (key = lowercase name, value = { displayName, units })
  const needed = new Map<string, { displayName: string; units: Map<string, number> }>();
  for (const date of weekDays) {
    for (const meal of mealPlan[toDateKey(date)] ?? []) {
      const recipe = recipes.find((r) => r.id === meal.recipeId);
      if (!recipe) continue;
      const scale = meal.servings / (recipe.servings ?? 1);
      for (const ing of recipe.ingredients) {
        const key = ing.ingredientName.toLowerCase().trim();
        if (!needed.has(key)) needed.set(key, { displayName: ing.ingredientName, units: new Map() });
        const entry = needed.get(key)!;
        const unitKey = ing.unit.toLowerCase().trim();
        entry.units.set(unitKey, (entry.units.get(unitKey) ?? 0) + ing.quantity * scale);
      }
    }
  }

  const activeInventory = inventory.filter((item) => !item.expired);
  const result: string[] = [];

  for (const [key, { displayName, units }] of needed) {
    // Match inventory items by name (case-insensitive, handles plural/singular)
    const matches = activeInventory.filter((item) => {
      const n = item.name.toLowerCase().trim();
      return n === key || n.includes(key) || key.includes(n);
    });

    let addToList = matches.length === 0; // not in stock at all

    if (!addToList) {
      // Check if we have enough for the planned meals
      for (const [unit, totalNeeded] of units) {
        const available = matches
          .filter((item) => item.unit.toLowerCase().trim() === unit)
          .reduce((sum, item) => sum + item.quantity, 0);
        if (available < totalNeeded) { addToList = true; break; }
      }
    }

    if (!addToList) {
      // Even if meals are covered, flag if any matching item is running low
      addToList = matches.some((item) => isLowStock(item.quantity, item.unit));
    }

    if (addToList) result.push(displayName);
  }

  return result.sort((a, b) => a.localeCompare(b));
}

function groceryText(items: string[], weekDays: Date[]): string {
  const s = weekDays[0], e = weekDays[6];
  const header = `Grocery list ${s.getDate()} ${MONTH_SHORT[s.getMonth()]} – ${e.getDate()} ${MONTH_SHORT[e.getMonth()]} ${e.getFullYear()}`;
  if (items.length === 0) return `${header}\n\nYou're well stocked — nothing to buy!`;
  return `${header}\n\n${items.map((name) => `• ${name}`).join("\n")}`;
}

// ─── Draggable recipe card ────────────────────────────────────────────────────

function DraggableRecipeCard({ recipe }: { recipe: Recipe }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `recipe-${recipe.id}`,
    data: { recipe },
  });

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` } : undefined}
      {...listeners}
      {...attributes}
      className={`rounded-xl border border-slate-700 bg-slate-800/70 p-3 cursor-grab active:cursor-grabbing select-none transition ${
        isDragging ? "opacity-30" : "hover:bg-slate-700/70"
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
        <div className="min-w-0">
          <p className="font-medium text-white text-sm leading-tight">{recipe.name}</p>
          {(recipe.cuisine || recipe.difficulty) && (
            <p className="text-xs text-slate-400 mt-0.5">
              {[recipe.cuisine, recipe.difficulty].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RecipeOverlay({ recipe }: { recipe: Recipe }) {
  return (
    <div className="rounded-xl border border-brand-500 bg-slate-800 p-3 shadow-xl cursor-grabbing select-none w-56">
      <p className="font-medium text-white text-sm">{recipe.name}</p>
    </div>
  );
}

// ─── Droppable day column ─────────────────────────────────────────────────────

function DroppableDayColumn({
  date,
  meals,
  isToday,
  onRemoveMeal,
  onUpdateServings,
}: {
  date: Date;
  meals: PlannedMeal[];
  isToday: boolean;
  onRemoveMeal: (id: string) => void;
  onUpdateServings: (id: string, servings: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: toDateKey(date) });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border transition-colors ${
        isOver
          ? "border-brand-500 bg-brand-600/15"
          : isToday
          ? "border-brand-600/40 bg-slate-900"
          : "border-slate-800 bg-slate-900/40"
      }`}
      style={{ minHeight: "10rem" }}
    >
      <div className={`shrink-0 px-2 py-2 border-b ${isToday ? "border-brand-600/30" : "border-slate-800"}`}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          {DAY_SHORT[dayIndex(date)]}
        </p>
        <p className={`text-xl font-bold leading-none mt-0.5 ${isToday ? "text-brand-400" : "text-white"}`}>
          {date.getDate()}
        </p>
      </div>

      <div className="flex-1 p-1.5 space-y-1">
        {meals.map((meal) => (
          <div key={meal.id} className="group rounded-lg bg-brand-600/20 px-2 py-1.5">
            <div className="flex items-start justify-between gap-1">
              <p className="text-[11px] text-brand-100 font-medium leading-tight break-words min-w-0">{meal.recipeName}</p>
              <button
                type="button"
                onClick={() => onRemoveMeal(meal.id)}
                className="shrink-0 rounded p-0.5 text-brand-300 opacity-0 group-hover:opacity-100 hover:bg-brand-500/30 transition"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <button
                type="button"
                onClick={() => onUpdateServings(meal.id, Math.max(1, meal.servings - 1))}
                className="rounded p-0.5 text-brand-300 hover:bg-brand-500/30 transition"
              >
                <Minus className="h-2.5 w-2.5" />
              </button>
              <span className="text-[10px] text-brand-200 min-w-[1.75rem] text-center tabular-nums">
                {meal.servings}p
              </span>
              <button
                type="button"
                onClick={() => onUpdateServings(meal.id, meal.servings + 1)}
                className="rounded p-0.5 text-brand-300 hover:bg-brand-500/30 transition"
              >
                <Plus className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        ))}
        {isOver && (
          <div className="rounded-lg border border-dashed border-brand-500/60 py-2 text-center text-[10px] text-brand-400">
            Drop here
          </div>
        )}
        {meals.length === 0 && !isOver && (
          <p className="text-[10px] text-slate-700 text-center pt-2 select-none">Drop recipe</p>
        )}
      </div>
    </div>
  );
}

// ─── Grocery list modal ───────────────────────────────────────────────────────

function GroceryModal({
  items,
  weekDays,
  onClose,
}: {
  items: string[];
  weekDays: Date[];
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const text = groceryText(items, weekDays);
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  const share = async () => {
    const payload = { title: "Grocery list", text };
    try {
      if (canShare && navigator.canShare(payload)) {
        await navigator.share(payload);
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // user cancelled
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const s = weekDays[0], e = weekDays[6];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 flex flex-col max-h-[85vh]">
        <div className="flex items-start justify-between gap-4 shrink-0">
          <div>
            <h3 className="text-xl font-semibold text-white">Grocery list</h3>
            <p className="text-sm text-slate-400 mt-0.5">
              {s.getDate()} {MONTH_SHORT[s.getMonth()]} – {e.getDate()} {MONTH_SHORT[e.getMonth()]} {e.getFullYear()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-600 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-emerald-400">You're well stocked — nothing to buy!</p>
          ) : (
            <ul className="space-y-1.5">
              {items.map((name) => (
                <li
                  key={name}
                  className="flex items-center gap-3 rounded-lg bg-slate-800/70 px-3 py-2 text-sm"
                >
                  <span className="text-slate-500">•</span>
                  <span className="text-white">{name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 shrink-0 flex gap-2 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={share}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500 transition"
          >
            <Share2 className="h-4 w-4" />
            {canShare ? "Share" : copied ? "Copied!" : "Copy"}
          </button>
          {canShare && (
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-slate-200 hover:bg-slate-800 transition"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

export default function MealPlannerPage({ recipes, inventory }: { recipes: Recipe[]; inventory: InventoryItem[] }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [mealPlan, setMealPlan] = useState<MealPlan>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as MealPlan;
    } catch {
      return {};
    }
  });
  const [recipeSearch, setRecipeSearch] = useState("");
  const [showGrocery, setShowGrocery] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const todayKey = toDateKey(new Date());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mealPlan));
  }, [mealPlan]);

  const filteredRecipes = useMemo(() => {
    const q = recipeSearch.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.cuisine?.toLowerCase().includes(q) ?? false) ||
        r.ingredients.some((i) => i.ingredientName.toLowerCase().includes(q))
    );
  }, [recipeSearch, recipes]);

  const groceryItems = useMemo(
    () => buildGroceryList(mealPlan, recipes, weekDays, inventory),
    [mealPlan, recipes, weekDays, inventory]
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveRecipe((event.active.data.current?.recipe as Recipe) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveRecipe(null);
    const { active, over } = event;
    if (!over) return;
    const recipe = active.data.current?.recipe as Recipe | undefined;
    if (!recipe) return;
    const dateKey = String(over.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
    setMealPlan((prev) => ({
      ...prev,
      [dateKey]: [
        ...(prev[dateKey] ?? []),
        {
          id: `${recipe.id}-${Date.now()}`,
          recipeId: recipe.id,
          recipeName: recipe.name,
          servings: recipe.servings ?? 2,
        },
      ],
    }));
  }

  function removeMeal(dateKey: string, mealId: string) {
    setMealPlan((prev) => ({
      ...prev,
      [dateKey]: (prev[dateKey] ?? []).filter((m) => m.id !== mealId),
    }));
  }

  function updateServings(dateKey: string, mealId: string, servings: number) {
    setMealPlan((prev) => ({
      ...prev,
      [dateKey]: (prev[dateKey] ?? []).map((m) => m.id === mealId ? { ...m, servings } : m),
    }));
  }

  const weekLabel = (() => {
    const s = weekDays[0], e = weekDays[6];
    return s.getMonth() === e.getMonth()
      ? `${MONTH_SHORT[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`
      : `${MONTH_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTH_SHORT[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
  })();

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">

        {/* ── Calendar ── */}
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <h2 className="text-xl font-semibold">Meal plan</h2>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setWeekOffset((o) => o - 1)}
                className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-slate-300 min-w-[11rem] text-center">{weekLabel}</span>
              <button
                type="button"
                onClick={() => setWeekOffset((o) => o + 1)}
                className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {weekOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition"
                >
                  Today
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGrocery(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition"
            >
              <ShoppingCart className="h-4 w-4" />
              Grocery list
            </button>
          </div>

          <div className="mt-5 overflow-x-auto">
            <div className="grid grid-cols-7 gap-2 min-w-[560px]">
              {weekDays.map((date) => {
                const key = toDateKey(date);
                return (
                  <DroppableDayColumn
                    key={key}
                    date={date}
                    meals={mealPlan[key] ?? []}
                    isToday={key === todayKey}
                    onRemoveMeal={(mealId) => removeMeal(key, mealId)}
                    onUpdateServings={(mealId, servings) => updateServings(key, mealId, servings)}
                  />
                );
              })}
            </div>
          </div>
        </article>

        {/* ── Recipe panel ── */}
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-xl font-semibold">Recipes</h2>
          <p className="text-xs text-slate-400 mt-1">Drag a recipe onto a day to plan it</p>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={recipeSearch}
              onChange={(e) => setRecipeSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-8 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-600 focus:outline-none"
              placeholder="Search recipes..."
            />
            {recipeSearch && (
              <button
                type="button"
                onClick={() => setRecipeSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="mt-3 space-y-2 overflow-y-auto max-h-[60vh]">
            {recipes.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">
                No recipes yet. Add some on the Inventory page first.
              </p>
            ) : filteredRecipes.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No recipes match your search.</p>
            ) : (
              filteredRecipes.map((recipe) => <DraggableRecipeCard key={recipe.id} recipe={recipe} />)
            )}
          </div>
        </article>
      </div>

      <DragOverlay>{activeRecipe && <RecipeOverlay recipe={activeRecipe} />}</DragOverlay>

      {showGrocery && (
        <GroceryModal items={groceryItems} weekDays={weekDays} onClose={() => setShowGrocery(false)} />
      )}
    </DndContext>
  );
}
