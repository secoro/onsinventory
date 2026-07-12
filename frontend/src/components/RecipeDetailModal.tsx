import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Undo2, UtensilsCrossed, X } from "lucide-react";
import { checkRecipeAvailability, cookRecipe } from "../api/client";
import { difficultyLabel, useI18n } from "../i18n";
import { parseInstructionSteps } from "../lib/recipeText";
import { CookResult, Recipe } from "../types";
import { ModalShell } from "./modals";

// Mount with key={recipe.id} so servings/skips/cook state reset per recipe.
export default function RecipeDetailModal({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const baseServings = recipe.servings ?? 1;
  const [servings, setServings] = useState(baseServings);
  const [skippedIngredients, setSkippedIngredients] = useState<Set<string>>(new Set());
  const [cookResult, setCookResult] = useState<CookResult | null>(null);
  const scale = servings / baseServings;

  const availabilityQuery = useQuery({
    queryKey: ["availability", recipe.id, servings],
    queryFn: () => checkRecipeAvailability(recipe.id, servings),
    enabled: !cookResult
  });

  const cookRecipeMutation = useMutation({
    mutationFn: () => cookRecipe(recipe.id, servings, Array.from(skippedIngredients)),
    onSuccess: async (result) => {
      setCookResult(result);
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      await queryClient.invalidateQueries({ queryKey: ["availability"] });
    }
  });

  const availability = availabilityQuery.data;
  const checkingAvailability = availabilityQuery.isLoading;

  // Filter warnings for ingredients the user chose to skip this cook
  const isSkipped = (warning: string) =>
    Array.from(skippedIngredients).some((skip) => warning.toLowerCase().includes(skip.toLowerCase()));
  const filteredInsufficient = (availability?.insufficientIngredients ?? []).filter((s) => !isSkipped(s));
  const filteredMissing = (availability?.missingIngredients ?? []).filter((s) => !isSkipped(s));
  const filteredMakeable = (availability?.makeableIngredients ?? []).filter((m) => !isSkipped(m.ingredientName));
  const canCook = !checkingAvailability && availability != null
    && filteredInsufficient.length === 0 && filteredMissing.length === 0;

  return (
    <ModalShell wide>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">{recipe.name}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {recipe.cuisine || t("recipes.unknownCuisine")} · {difficultyLabel(t, recipe.difficulty)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {t("common.close")}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-slate-600 dark:text-slate-300">{t("detail.servings")}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setServings((s) => Math.max(1, s - 1))}
            disabled={servings <= 1}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
          >
            −
          </button>
          <span className="min-w-[2rem] text-center font-semibold text-slate-900 dark:text-white">{servings}</span>
          <button
            type="button"
            onClick={() => setServings((s) => s + 1)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            +
          </button>
        </div>
        {servings !== baseServings && (
          <span className="text-xs text-slate-500 dark:text-slate-500">{t("detail.baseServings", { count: baseServings })}</span>
        )}
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-100">{t("detail.ingredients")}</h4>
          <ul className="mt-2 space-y-1 text-sm">
            {(recipe.ingredients ?? []).map((ingredient, index) => {
              const scaled = ingredient.quantity * scale;
              const display = Number.isInteger(scaled) ? scaled : parseFloat(scaled.toFixed(1));
              const skipped = skippedIngredients.has(ingredient.ingredientName);
              const toggle = () => setSkippedIngredients((prev) => {
                const next = new Set(prev);
                if (skipped) {
                  next.delete(ingredient.ingredientName);
                } else {
                  next.add(ingredient.ingredientName);
                }
                return next;
              });
              return (
                <li key={`${ingredient.ingredientName}-${index}`} className="group flex items-center gap-2">
                  <span className={skipped ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}>
                    {display} {ingredient.unit} {ingredient.ingredientName}
                  </span>
                  <button
                    type="button"
                    onClick={toggle}
                    title={skipped ? t("detail.addBack") : t("detail.skip")}
                    className={`shrink-0 rounded p-0.5 transition ${
                      skipped
                        ? "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                        : "sm:opacity-0 sm:group-hover:opacity-100 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400"
                    }`}
                  >
                    {skipped ? <Undo2 className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-100">{t("detail.steps")}</h4>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-200">
            {parseInstructionSteps(recipe.instructions).map((step, index) => (
              <li key={`${index}-${step}`}>{step}</li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-5">
        {cookResult ? (
          <div className="space-y-3 text-sm">
            {cookResult.consumed.length > 0 && (
              <div>
                <p className="font-medium text-emerald-600 dark:text-emerald-300">{t("detail.inventoryUpdated")}</p>
                <ul className="mt-1 space-y-1 text-slate-600 dark:text-slate-300">
                  {cookResult.consumed.map((line) => <li key={line}>· {line}</li>)}
                </ul>
              </div>
            )}
            {cookResult.unmatched.length > 0 && (
              <div>
                <p className="font-medium text-amber-600 dark:text-amber-300">{t("detail.notFoundInInventory")}</p>
                <ul className="mt-1 space-y-1 text-slate-600 dark:text-slate-300">
                  {cookResult.unmatched.map((line) => <li key={line}>· {line}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              disabled={cookRecipeMutation.isPending || checkingAvailability || !canCook}
              onClick={() => cookRecipeMutation.mutate()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <UtensilsCrossed className="h-4 w-4" />
              {cookRecipeMutation.isPending ? t("detail.cooking") : t("detail.cooked")}
            </button>
            {(filteredInsufficient.length > 0 || filteredMissing.length > 0 || filteredMakeable.length > 0) && (
              <div className="space-y-1 text-sm">
                {filteredInsufficient.map((line) => (
                  <p key={line} className="text-amber-600 dark:text-amber-300">· {t("recommendations.notEnough", { items: line })}</p>
                ))}
                {filteredMissing.map((line) => (
                  <p key={line} className="text-rose-600 dark:text-rose-300">· {t("recommendations.missing", { items: line })}</p>
                ))}
                {filteredMakeable.map((m) => (
                  <p key={m.ingredientName} className="text-sky-600 dark:text-sky-300">
                    · {t("detail.makeable", { ingredient: m.ingredientName, recipe: m.recipeName })}
                  </p>
                ))}
                <p className="text-slate-500 dark:text-slate-400 text-xs pt-1">
                  {t("detail.skipHint")}
                </p>
              </div>
            )}
          </div>
        )}
        {cookRecipeMutation.isError && (
          <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">{t("detail.error.cook")}</p>
        )}
      </div>
    </ModalShell>
  );
}
