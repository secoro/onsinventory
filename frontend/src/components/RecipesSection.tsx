import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Undo2 } from "lucide-react";
import { addRecipe, deleteRecipe, updateRecipe } from "../api/client";
import { parseIngredientLine } from "../lib/recipeText";
import { inputClass } from "../lib/ui";
import { Recipe, RecipeIngredient } from "../types";

type RecipeFormState = {
  name: string;
  cuisine: string;
  difficulty: string;
  instructions: string;
  ingredients: string;
};

const initialRecipeForm: RecipeFormState = {
  name: "",
  cuisine: "",
  difficulty: "easy",
  instructions: "",
  ingredients: ""
};

export default function RecipesSection({
  recipes,
  searchQuery,
  onSelectRecipe
}: {
  recipes: Recipe[];
  searchQuery: string;
  onSelectRecipe: (recipe: Recipe) => void;
}) {
  const queryClient = useQueryClient();
  const [recipeForm, setRecipeForm] = useState<RecipeFormState>(initialRecipeForm);
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["recipes"] });
    await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
  };

  const addRecipeMutation = useMutation({
    mutationFn: addRecipe,
    onSuccess: async () => {
      setRecipeForm(initialRecipeForm);
      await invalidate();
    }
  });

  const updateRecipeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateRecipe>[1] }) =>
      updateRecipe(id, payload),
    onSuccess: async () => {
      setEditingRecipeId(null);
      setRecipeForm(initialRecipeForm);
      await invalidate();
    }
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: deleteRecipe,
    onSuccess: invalidate
  });

  const filteredRecipes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(
      (recipe) =>
        recipe.name.toLowerCase().includes(q) ||
        (recipe.cuisine?.toLowerCase().includes(q) ?? false) ||
        recipe.ingredients.some((ing) => ing.ingredientName.toLowerCase().includes(q))
    );
  }, [searchQuery, recipes]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const ingredients: RecipeIngredient[] = recipeForm.ingredients
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parseIngredientLine);

    const payload = {
      name: recipeForm.name,
      cuisine: recipeForm.cuisine || undefined,
      difficulty: recipeForm.difficulty || undefined,
      instructions: recipeForm.instructions || undefined,
      ingredients
    };

    if (editingRecipeId !== null) {
      updateRecipeMutation.mutate({ id: editingRecipeId, payload });
    } else {
      addRecipeMutation.mutate(payload);
    }
  };

  const startEditingRecipe = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    const ingredientsStr = [...(recipe.ingredients ?? [])]
      .map((ing) => `${ing.quantity} ${ing.unit} ${ing.ingredientName}`)
      .join("\n");
    setRecipeForm({
      name: recipe.name,
      cuisine: recipe.cuisine ?? "",
      difficulty: recipe.difficulty ?? "easy",
      instructions: recipe.instructions ?? "",
      ingredients: ingredientsStr
    });
  };

  const cancelEditingRecipe = () => {
    setEditingRecipeId(null);
    setRecipeForm(initialRecipeForm);
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6">
        <h2 className="text-xl font-semibold">
          {editingRecipeId !== null ? "Edit recipe" : "Add recipe"}
        </h2>
        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
          <input
            required
            value={recipeForm.name}
            onChange={(event) => setRecipeForm((prev) => ({ ...prev, name: event.target.value }))}
            className={inputClass}
            placeholder="Recipe name"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={recipeForm.cuisine}
              onChange={(event) => setRecipeForm((prev) => ({ ...prev, cuisine: event.target.value }))}
              className={inputClass}
              placeholder="Cuisine"
            />
            <select
              value={recipeForm.difficulty}
              onChange={(event) => setRecipeForm((prev) => ({ ...prev, difficulty: event.target.value }))}
              className={inputClass}
            >
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </div>
          <textarea
            value={recipeForm.ingredients}
            onChange={(event) => setRecipeForm((prev) => ({ ...prev, ingredients: event.target.value }))}
            className={inputClass}
            placeholder={"One ingredient per line:\n400 grams pasta\n3 cloves garlic\n100 ml olive oil"}
            rows={5}
          />
          <textarea
            value={recipeForm.instructions}
            onChange={(event) => setRecipeForm((prev) => ({ ...prev, instructions: event.target.value }))}
            className={inputClass}
            placeholder="Instructions"
            rows={3}
          />
          <button
            type="submit"
            disabled={addRecipeMutation.isPending || updateRecipeMutation.isPending}
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
          >
            {editingRecipeId !== null
              ? updateRecipeMutation.isPending ? "Saving..." : "Save changes"
              : addRecipeMutation.isPending ? "Adding..." : "Add recipe"}
          </button>
          {editingRecipeId !== null && (
            <button
              type="button"
              onClick={cancelEditingRecipe}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Undo2 className="h-4 w-4" />
              Cancel edit
            </button>
          )}
          {addRecipeMutation.isError && (
            <p className="text-sm text-rose-600 dark:text-rose-300">Could not add recipe. Please check your input.</p>
          )}
          {updateRecipeMutation.isError && (
            <p className="text-sm text-rose-600 dark:text-rose-300">Could not update recipe. Try again.</p>
          )}
        </form>
      </article>

      <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6">
        <h2 className="text-xl font-semibold">Recipe library</h2>
        <div className="mt-4 space-y-3">
          {filteredRecipes.length === 0 ? (
            <p className="rounded-lg bg-slate-50 dark:bg-slate-800/70 p-4 text-slate-600 dark:text-slate-300">
              {searchQuery ? `No recipes matching "${searchQuery}".` : "No recipes yet. Add your first one."}
            </p>
          ) : (
            filteredRecipes.map((recipe) => (
              <div
                key={recipe.id}
                onClick={() => onSelectRecipe(recipe)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectRecipe(recipe); } }}
                className="cursor-pointer rounded-xl bg-slate-50 dark:bg-slate-800/70 p-4 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{recipe.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {recipe.cuisine || "Unknown cuisine"} · {recipe.difficulty || "unknown"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); startEditingRecipe(recipe); }}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-200 dark:bg-slate-700 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); deleteRecipeMutation.mutate(recipe.id); }}
                      className="inline-flex items-center gap-1 rounded-md bg-rose-500/20 px-2 py-1 text-xs text-rose-600 dark:text-rose-200 hover:bg-rose-500/30"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {deleteRecipeMutation.isError && (
          <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">Could not delete recipe. Try again.</p>
        )}
      </article>
    </section>
  );
}
