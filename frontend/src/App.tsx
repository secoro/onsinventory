import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ChefHat,
  Flame,
  Package,
  Pencil,
  Refrigerator,
  Sparkles,
  Trash2,
  Undo2
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  addInventoryItem,
  addRecipe,
  deleteInventoryItem,
  deleteRecipe,
  getInventory,
  getLocations,
  getRecommendations,
  getRecipes,
  updateInventoryItem
} from "./api/client";
import { recommendationLabel, topRecommendation } from "./lib/recommendation";
import { InventoryItem, Recipe, RecipeIngredient } from "./types";

const colors = ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#14b8a6"];
const pageSizeOptions = [4, 8, 12];

type AddItemFormState = {
  name: string;
  category: string;
  location: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  notes: string;
};

const initialForm: AddItemFormState = {
  name: "",
  category: "",
  location: "Fridge",
  quantity: 1,
  unit: "pieces",
  expiryDate: "",
  notes: ""
};

type AddRecipeFormState = {
  name: string;
  cuisine: string;
  difficulty: string;
  instructions: string;
  ingredients: string;
};

const initialRecipeForm: AddRecipeFormState = {
  name: "",
  cuisine: "",
  difficulty: "easy",
  instructions: "",
  ingredients: ""
};

function isExpiring(item: InventoryItem): boolean {
  return Boolean(item.expiringSoon ?? item.expiringsoon);
}

export default function App() {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<AddItemFormState>(initialForm);
  const [recipeForm, setRecipeForm] = useState<AddRecipeFormState>(initialRecipeForm);
  const [activeLocation, setActiveLocation] = useState<string>("All");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations
  });

  const inventoryQuery = useQuery({
    queryKey: ["inventory"],
    queryFn: getInventory
  });

  const recipesQuery = useQuery({
    queryKey: ["recipes"],
    queryFn: getRecipes
  });

  const recommendationsQuery = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => getRecommendations(10)
  });

  const addItemMutation = useMutation({
    mutationFn: addInventoryItem,
    onSuccess: async () => {
      setFormState(initialForm);
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AddItemFormState }) =>
      updateInventoryItem(id, {
        ...payload,
        expiryDate: payload.expiryDate || undefined,
        notes: payload.notes || undefined
      }),
    onSuccess: async () => {
      setEditingItemId(null);
      setFormState(initialForm);
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    }
  });

  const addRecipeMutation = useMutation({
    mutationFn: addRecipe,
    onSuccess: async () => {
      setRecipeForm(initialRecipeForm);
      await queryClient.invalidateQueries({ queryKey: ["recipes"] });
      await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    }
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: deleteRecipe,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["recipes"] });
      await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    }
  });

  const inventory = useMemo(() => inventoryQuery.data ?? [], [inventoryQuery.data]);
  const recipes = useMemo(() => recipesQuery.data ?? [], [recipesQuery.data]);
  const recommendations = recommendationsQuery.data ?? [];

  const filteredInventory = useMemo(() => {
    if (activeLocation === "All") {
      return inventory;
    }
    return inventory.filter((item) => item.location === activeLocation);
  }, [activeLocation, inventory]);

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / pageSize));

  const paginatedInventory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInventory.slice(start, start + pageSize);
  }, [currentPage, filteredInventory, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeLocation, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const topMatch = topRecommendation(recommendations);

  const locationDistribution = useMemo(() => {
    const counts = inventory.reduce<Record<string, number>>((acc, item) => {
      acc[item.location] = (acc[item.location] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [inventory]);

  const expiringCount = inventory.filter((item) => isExpiring(item)).length;
  const expiredCount = inventory.filter((item) => item.expired).length;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingItemId !== null) {
      updateItemMutation.mutate({ id: editingItemId, payload: formState });
      return;
    }

    addItemMutation.mutate({
      ...formState,
      expiryDate: formState.expiryDate || undefined,
      notes: formState.notes || undefined
    });
  };

  const handleRecipeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const ingredients: RecipeIngredient[] = recipeForm.ingredients
      .split(",")
      .map((ingredient) => ingredient.trim())
      .filter(Boolean)
      .map((ingredientName) => ({
        ingredientName,
        quantity: 1,
        unit: "unit",
        optional: false
      }));

    addRecipeMutation.mutate({
      name: recipeForm.name,
      cuisine: recipeForm.cuisine || undefined,
      difficulty: recipeForm.difficulty || undefined,
      instructions: recipeForm.instructions || undefined,
      ingredients
    });
  };

  const startEditingItem = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setFormState({
      name: item.name,
      category: item.category,
      location: item.location,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: item.expiryDate ?? "",
      notes: item.notes ?? ""
    });
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setFormState(initialForm);
  };

  const isLoading =
    locationsQuery.isLoading ||
    inventoryQuery.isLoading ||
    recipesQuery.isLoading ||
    recommendationsQuery.isLoading;

  return (
    <div className="min-h-screen px-4 py-8 text-slate-100 md:px-8 lg:px-12">
      <main className="mx-auto max-w-7xl space-y-8">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-glow"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-brand-100">ONS Inventory</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Your kitchen, but smarter</h1>
              <p className="mt-2 text-slate-300">
                Track pantry, fridge, and freezer stock and get recipe ideas before ingredients expire.
              </p>
            </div>
            <div className="rounded-xl bg-brand-600/20 px-4 py-3 text-sm text-brand-50">
              {topMatch ? (
                <>
                  <div className="font-medium">Top suggestion</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {topMatch.recipe.name} ({topMatch.matchPercentage}%)
                  </div>
                </>
              ) : (
                <div className="font-medium">Add inventory to unlock recommendations</div>
              )}
            </div>
          </div>
        </motion.header>

        {isLoading ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            Loading your kitchen dashboard...
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={<Package className="h-5 w-5" />} label="Items in stock" value={inventory.length} />
              <MetricCard icon={<ChefHat className="h-5 w-5" />} label="Recipes" value={recipes.length} />
              <MetricCard icon={<AlertTriangle className="h-5 w-5" />} label="Expiring soon" value={expiringCount} />
              <MetricCard icon={<Flame className="h-5 w-5" />} label="Already expired" value={expiredCount} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
              <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">Inventory by location</h2>
                  <div className="flex flex-wrap gap-2">
                    {["All", ...(locationsQuery.data?.map((location) => location.name) ?? [])].map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setActiveLocation(name)}
                        className={`rounded-lg px-3 py-1 text-sm transition ${
                          activeLocation === name
                            ? "bg-brand-600 text-white"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {filteredInventory.length === 0 ? (
                    <p className="rounded-lg bg-slate-800/70 p-4 text-slate-300">No items in this location yet.</p>
                  ) : (
                    paginatedInventory.map((item) => (
                      <div key={item.id} className="rounded-xl bg-slate-800/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">{item.name}</p>
                            <p className="text-sm text-slate-300">
                              {item.quantity} {item.unit} · {item.category} · {item.location}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              item.expired
                                ? "bg-rose-500/20 text-rose-200"
                                : isExpiring(item)
                                  ? "bg-amber-500/20 text-amber-200"
                                  : "bg-emerald-500/20 text-emerald-200"
                            }`}
                          >
                            {item.expired ? "Expired" : isExpiring(item) ? "Expiring" : "Fresh"}
                          </span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEditingItem(item)}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-600"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteItemMutation.mutate(item.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-rose-500/20 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/30"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {filteredInventory.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 pt-4 text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <span>Items per page</span>
                      <select
                        value={pageSize}
                        onChange={(event) => setPageSize(Number(event.target.value))}
                        className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200"
                      >
                        {pageSizeOptions.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                        className="rounded-md border border-slate-600 px-2 py-1 text-slate-200 disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <span>
                        Page {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-md border border-slate-600 px-2 py-1 text-slate-200 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </article>

              <article className="space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
                  <h2 className="flex items-center gap-2 text-xl font-semibold">
                    <Refrigerator className="h-5 w-5" />
                    {editingItemId !== null ? "Edit inventory item" : "Add inventory item"}
                  </h2>
                  <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
                    <input
                      required
                      value={formState.name}
                      onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                      placeholder="Item name"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        required
                        value={formState.category}
                        onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                        placeholder="Category"
                      />
                      <select
                        value={formState.location}
                        onChange={(event) => setFormState((prev) => ({ ...prev, location: event.target.value }))}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                      >
                        {(locationsQuery.data ?? []).map((location) => (
                          <option key={location.id} value={location.name}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        required
                        type="number"
                        min={1}
                        value={formState.quantity}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, quantity: Number(event.target.value) }))
                        }
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                        placeholder="Quantity"
                      />
                      <input
                        required
                        value={formState.unit}
                        onChange={(event) => setFormState((prev) => ({ ...prev, unit: event.target.value }))}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                        placeholder="Unit"
                      />
                    </div>
                    <input
                      type="date"
                      value={formState.expiryDate}
                      onChange={(event) => setFormState((prev) => ({ ...prev, expiryDate: event.target.value }))}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                    />
                    <textarea
                      value={formState.notes}
                      onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                      placeholder="Notes (optional)"
                    />
                    <button
                      type="submit"
                      disabled={addItemMutation.isPending || updateItemMutation.isPending}
                      className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
                    >
                      {editingItemId !== null
                        ? updateItemMutation.isPending
                          ? "Saving..."
                          : "Save changes"
                        : addItemMutation.isPending
                          ? "Adding..."
                          : "Add item"}
                    </button>
                    {editingItemId !== null && (
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-slate-200 hover:bg-slate-800"
                      >
                        <Undo2 className="h-4 w-4" />
                        Cancel edit
                      </button>
                    )}
                    {addItemMutation.isError && (
                      <p className="text-sm text-rose-300">Could not add item. Check backend availability.</p>
                    )}
                    {updateItemMutation.isError && (
                      <p className="text-sm text-rose-300">Could not update item. Try again.</p>
                    )}
                    {deleteItemMutation.isError && (
                      <p className="text-sm text-rose-300">Could not delete item. Try again.</p>
                    )}
                  </form>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
                  <h2 className="text-xl font-semibold">Stock distribution</h2>
                  <div className="mt-4 h-64">
                    {locationDistribution.length === 0 ? (
                      <p className="text-slate-300">Add a few items to see the chart.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={locationDistribution} dataKey="value" nameKey="name" outerRadius={95}>
                            {locationDistribution.map((entry, index) => (
                              <Cell key={entry.name} fill={colors[index % colors.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </article>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-xl font-semibold">Recipe recommendations</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {recommendations.map((recommendation) => (
                  <motion.div
                    key={recommendation.recipe.id}
                    whileHover={{ y: -3 }}
                    onClick={() => setSelectedRecipe(recommendation.recipe)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedRecipe(recommendation.recipe);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-white">{recommendation.recipe.name}</p>
                      <span className="rounded-full bg-brand-600/25 px-2 py-1 text-xs text-brand-100">
                        {recommendationLabel(recommendation.matchPercentage)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">
                      Match: {recommendation.matchPercentage}% ({recommendation.matchedIngredients}/
                      {recommendation.totalIngredients})
                    </p>
                    {recommendation.expiringIngredientsUsed.length > 0 && (
                      <p className="mt-2 text-xs text-amber-200">
                        Use soon: {recommendation.expiringIngredientsUsed.join(", ")}
                      </p>
                    )}
                    {recommendation.missingIngredients.length > 0 && (
                      <p className="mt-2 text-xs text-slate-400">
                        Missing: {recommendation.missingIngredients.join(", ")}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
              <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
                <h2 className="text-xl font-semibold">Add recipe</h2>
                <form className="mt-4 grid gap-3" onSubmit={handleRecipeSubmit}>
                  <input
                    required
                    value={recipeForm.name}
                    onChange={(event) => setRecipeForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                    placeholder="Recipe name"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={recipeForm.cuisine}
                      onChange={(event) => setRecipeForm((prev) => ({ ...prev, cuisine: event.target.value }))}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                      placeholder="Cuisine"
                    />
                    <select
                      value={recipeForm.difficulty}
                      onChange={(event) => setRecipeForm((prev) => ({ ...prev, difficulty: event.target.value }))}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                    >
                      <option value="easy">easy</option>
                      <option value="medium">medium</option>
                      <option value="hard">hard</option>
                    </select>
                  </div>
                  <input
                    value={recipeForm.ingredients}
                    onChange={(event) => setRecipeForm((prev) => ({ ...prev, ingredients: event.target.value }))}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                    placeholder="Ingredients (comma separated)"
                  />
                  <textarea
                    value={recipeForm.instructions}
                    onChange={(event) => setRecipeForm((prev) => ({ ...prev, instructions: event.target.value }))}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                    placeholder="Instructions"
                  />
                  <button
                    type="submit"
                    disabled={addRecipeMutation.isPending}
                    className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
                  >
                    {addRecipeMutation.isPending ? "Adding..." : "Add recipe"}
                  </button>
                  {addRecipeMutation.isError && (
                    <p className="text-sm text-rose-300">Could not add recipe. Please check your input.</p>
                  )}
                </form>
              </article>

              <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
                <h2 className="text-xl font-semibold">Recipe library</h2>
                <div className="mt-4 space-y-3">
                  {recipes.length === 0 ? (
                    <p className="rounded-lg bg-slate-800/70 p-4 text-slate-300">No recipes yet. Add your first one.</p>
                  ) : (
                    recipes.map((recipe) => (
                      <div key={recipe.id} className="rounded-xl bg-slate-800/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">{recipe.name}</p>
                            <p className="text-sm text-slate-300">
                              {recipe.cuisine || "Unknown cuisine"} · {recipe.difficulty || "unknown"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteRecipeMutation.mutate(recipe.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-rose-500/20 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/30"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {deleteRecipeMutation.isError && (
                  <p className="mt-3 text-sm text-rose-300">Could not delete recipe. Try again.</p>
                )}
              </article>
            </section>
          </>
        )}

        {selectedRecipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
            <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold text-white">{selectedRecipe.name}</h3>
                  <p className="mt-1 text-sm text-slate-300">
                    {selectedRecipe.cuisine || "Unknown cuisine"} · {selectedRecipe.difficulty || "unknown"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecipe(null)}
                  className="rounded-md border border-slate-600 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-100">Ingredients</h4>
                  <ul className="mt-2 space-y-1 text-sm text-slate-200">
                    {(selectedRecipe.ingredients ?? []).map((ingredient, index) => (
                      <li key={`${ingredient.ingredientName}-${index}`}>
                        {ingredient.quantity} {ingredient.unit} {ingredient.ingredientName}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-100">Step-by-step</h4>
                  <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-200">
                    {parseInstructionSteps(selectedRecipe.instructions).map((step, index) => (
                      <li key={`${index}-${step}`}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function parseInstructionSteps(instructions?: string): string[] {
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

function MetricCard({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex items-center gap-2 text-brand-100">{icon}</div>
      <p className="mt-3 text-sm text-slate-300">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
