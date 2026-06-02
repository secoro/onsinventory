import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  ChefHat,
  Flame,
  KeyRound,
  LogOut,
  Package,
  Pencil,
  Refrigerator,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  UtensilsCrossed,
  X
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  addInventoryItem,
  addRecipe,
  changePassword,
  checkRecipeAvailability,
  clearToken,
  cookRecipe,
  deleteInventoryItem,
  deleteRecipe,
  getInventory,
  getLocations,
  getMe,
  getRecommendations,
  getRecipes,
  login,
  storeToken,
  updateInventoryItem,
  updateRecipe
} from "./api/client";
import { recommendationLabel, topRecommendation } from "./lib/recommendation";
import { AuthUser, CookResult, InventoryItem, Recipe, RecipeIngredient } from "./types";
import MealPlannerPage from "./pages/MealPlanner";

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
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [formState, setFormState] = useState<AddItemFormState>(initialForm);
  const [recipeForm, setRecipeForm] = useState<AddRecipeFormState>(initialRecipeForm);
  const [activeLocation, setActiveLocation] = useState<string>("All");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedServings, setSelectedServings] = useState(1);
  const [cookResult, setCookResult] = useState<CookResult | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);
  const [searchQuery, setSearchQuery] = useState("");
  const [expiryFilter, setExpiryFilter] = useState<"expiring" | "expired" | null>(null);
  const [page, setPage] = useState<"home" | "planner">("home");

  useEffect(() => {
    getMe()
      .then((user) => setAuthUser({ ...user, token: localStorage.getItem("auth_token") ?? "" }))
      .catch(() => { clearToken(); setAuthUser(null); })
      .finally(() => setAuthChecked(true));
  }, []);

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) => login(username, password),
    onSuccess: (data) => {
      storeToken(data.token);
      setAuthUser({ username: data.username, firstName: data.firstName, token: data.token });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changePassword(currentPassword, newPassword),
    onSuccess: () => setShowChangePassword(false)
  });

  const handleLogout = () => {
    clearToken();
    setAuthUser(null);
    queryClient.clear();
  };

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
    enabled: !!authUser
  });

  const inventoryQuery = useQuery({
    queryKey: ["inventory"],
    queryFn: getInventory,
    enabled: !!authUser
  });

  const recipesQuery = useQuery({
    queryKey: ["recipes"],
    queryFn: getRecipes,
    enabled: !!authUser
  });

  const recommendationsQuery = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => getRecommendations(50),
    enabled: !!authUser
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

  const updateRecipeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateRecipe>[1] }) =>
      updateRecipe(id, payload),
    onSuccess: async () => {
      setEditingRecipeId(null);
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

  const availabilityQuery = useQuery({
    queryKey: ["availability", selectedRecipe?.id, selectedServings],
    queryFn: () => checkRecipeAvailability(selectedRecipe!.id, selectedServings),
    enabled: !!selectedRecipe && !cookResult
  });

  useEffect(() => {
    if (selectedRecipe) {
      setSelectedServings(selectedRecipe.servings ?? 1);
      setCookResult(null);
    }
  }, [selectedRecipe?.id]);

  const cookRecipeMutation = useMutation({
    mutationFn: ({ id, servings }: { id: number; servings: number }) => cookRecipe(id, servings),
    onSuccess: async (result) => {
      setCookResult(result);
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      await queryClient.invalidateQueries({ queryKey: ["availability"] });
    }
  });

  const inventory = useMemo(() => inventoryQuery.data ?? [], [inventoryQuery.data]);
  const recipes = useMemo(() => recipesQuery.data ?? [], [recipesQuery.data]);
  const recommendations = recommendationsQuery.data ?? [];

  const filteredInventory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return inventory.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.notes?.toLowerCase().includes(q) ?? false)
      );
    }
    let result = activeLocation === "All" ? inventory : inventory.filter((item) => item.location === activeLocation);
    if (expiryFilter === "expiring") result = result.filter((item) => isExpiring(item));
    else if (expiryFilter === "expired") result = result.filter((item) => item.expired);
    return result;
  }, [searchQuery, activeLocation, inventory, expiryFilter]);

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

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / pageSize));

  const paginatedInventory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInventory.slice(start, start + pageSize);
  }, [currentPage, filteredInventory, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeLocation, pageSize, searchQuery, expiryFilter]);

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
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parseIngredientLine);

    if (editingRecipeId !== null) {
      updateRecipeMutation.mutate({ id: editingRecipeId, payload: {
        name: recipeForm.name,
        cuisine: recipeForm.cuisine || undefined,
        difficulty: recipeForm.difficulty || undefined,
        instructions: recipeForm.instructions || undefined,
        ingredients
      }});
      return;
    }

    addRecipeMutation.mutate({
      name: recipeForm.name,
      cuisine: recipeForm.cuisine || undefined,
      difficulty: recipeForm.difficulty || undefined,
      instructions: recipeForm.instructions || undefined,
      ingredients
    });
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

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  if (!authUser) {
    return <LoginPage onLogin={loginMutation.mutate} error={loginMutation.isError} isPending={loginMutation.isPending} />;
  }

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
              <h1 className="mt-2 text-3xl font-semibold text-white">Welcome, {authUser.firstName}!</h1>
              <p className="mt-2 text-slate-300">
                Track pantry, fridge, and freezer stock and get recipe ideas before ingredients expire.
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowChangePassword(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Change password
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
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
          </div>
        </motion.header>

        <nav className="flex gap-1 rounded-2xl border border-slate-800 bg-slate-900/80 p-1">
          <button
            type="button"
            onClick={() => setPage("home")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium transition ${
              page === "home" ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Package className="h-4 w-4" />
            Inventory
          </button>
          <button
            type="button"
            onClick={() => setPage("planner")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium transition ${
              page === "planner" ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Meal Planner
          </button>
        </nav>

        {page === "home" && <>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setSearchQuery("")}
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 py-3 pl-11 pr-10 text-slate-100 placeholder:text-slate-500 focus:border-brand-600 focus:outline-none"
            placeholder="Search inventory and recipes..."
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {isLoading ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            Loading your kitchen dashboard...
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={<Package className="h-5 w-5" />} label="Items in stock" value={inventory.length} />
              <MetricCard icon={<ChefHat className="h-5 w-5" />} label="Recipes" value={recipes.length} />
              <MetricCard
                icon={<AlertTriangle className="h-5 w-5" />}
                label="Expiring soon"
                value={expiringCount}
                onClick={() => setExpiryFilter((f) => f === "expiring" ? null : "expiring")}
                active={expiryFilter === "expiring"}
              />
              <MetricCard
                icon={<Flame className="h-5 w-5" />}
                label="Already expired"
                value={expiredCount}
                onClick={() => setExpiryFilter((f) => f === "expired" ? null : "expired")}
                active={expiryFilter === "expired"}
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
              <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">Inventory by location</h2>
                    {expiryFilter && !searchQuery && (
                      <button
                        type="button"
                        onClick={() => setExpiryFilter(null)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                          expiryFilter === "expiring"
                            ? "bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
                            : "bg-rose-500/20 text-rose-200 hover:bg-rose-500/30"
                        }`}
                      >
                        {expiryFilter === "expiring" ? "Expiring soon" : "Already expired"}
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {!searchQuery && (
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
                  )}
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
                        min={0.01}
                        step="any"
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
                <h2 className="text-xl font-semibold">
                  {editingRecipeId !== null ? "Edit recipe" : "Add recipe"}
                </h2>
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
                  <textarea
                    value={recipeForm.ingredients}
                    onChange={(event) => setRecipeForm((prev) => ({ ...prev, ingredients: event.target.value }))}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                    placeholder={"One ingredient per line:\n400 grams pasta\n3 cloves garlic\n100 ml olive oil"}
                    rows={5}
                  />
                  <textarea
                    value={recipeForm.instructions}
                    onChange={(event) => setRecipeForm((prev) => ({ ...prev, instructions: event.target.value }))}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
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
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-slate-200 hover:bg-slate-800"
                    >
                      <Undo2 className="h-4 w-4" />
                      Cancel edit
                    </button>
                  )}
                  {addRecipeMutation.isError && (
                    <p className="text-sm text-rose-300">Could not add recipe. Please check your input.</p>
                  )}
                  {updateRecipeMutation.isError && (
                    <p className="text-sm text-rose-300">Could not update recipe. Try again.</p>
                  )}
                </form>
              </article>

              <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
                <h2 className="text-xl font-semibold">Recipe library</h2>
                <div className="mt-4 space-y-3">
                  {filteredRecipes.length === 0 ? (
                    <p className="rounded-lg bg-slate-800/70 p-4 text-slate-300">
                      {searchQuery ? `No recipes matching "${searchQuery}".` : "No recipes yet. Add your first one."}
                    </p>
                  ) : (
                    filteredRecipes.map((recipe) => (
                      <div
                        key={recipe.id}
                        onClick={() => { setSelectedRecipe(recipe); setCookResult(null); }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedRecipe(recipe); setCookResult(null); } }}
                        className="cursor-pointer rounded-xl bg-slate-800/70 p-4 hover:bg-slate-700/70 transition"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">{recipe.name}</p>
                            <p className="text-sm text-slate-300">
                              {recipe.cuisine || "Unknown cuisine"} · {recipe.difficulty || "unknown"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); startEditingRecipe(recipe); }}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-600"
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); deleteRecipeMutation.mutate(recipe.id); }}
                              className="inline-flex items-center gap-1 rounded-md bg-rose-500/20 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/30"
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
                  <p className="mt-3 text-sm text-rose-300">Could not delete recipe. Try again.</p>
                )}
              </article>
            </section>
          </>
        )}
        </>}

        {page === "planner" && <MealPlannerPage recipes={recipes} inventory={inventory} />}

        {selectedRecipe && (() => {
          const baseServings = selectedRecipe.servings ?? 1;
          const scale = selectedServings / baseServings;
          const availability = availabilityQuery.data;
          const canCook = availability?.canCook ?? false;
          const checkingAvailability = availabilityQuery.isLoading;

          return (
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
                  onClick={() => { setSelectedRecipe(null); setCookResult(null); }}
                  className="rounded-md border border-slate-600 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-slate-300">Servings:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedServings((s) => Math.max(1, s - 1))}
                    disabled={selectedServings <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800 disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="min-w-[2rem] text-center font-semibold text-white">{selectedServings}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedServings((s) => s + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800"
                  >
                    +
                  </button>
                </div>
                {selectedServings !== baseServings && (
                  <span className="text-xs text-slate-500">(recipe is for {baseServings})</span>
                )}
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-100">Ingredients</h4>
                  <ul className="mt-2 space-y-1 text-sm text-slate-200">
                    {(selectedRecipe.ingredients ?? []).map((ingredient, index) => {
                      const scaled = ingredient.quantity * scale;
                      const display = Number.isInteger(scaled) ? scaled : parseFloat(scaled.toFixed(1));
                      return (
                        <li key={`${ingredient.ingredientName}-${index}`}>
                          {display} {ingredient.unit} {ingredient.ingredientName}
                        </li>
                      );
                    })}
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

              <div className="mt-6 border-t border-slate-700 pt-5">
                {cookResult ? (
                  <div className="space-y-3 text-sm">
                    {cookResult.consumed.length > 0 && (
                      <div>
                        <p className="font-medium text-emerald-300">Inventory updated:</p>
                        <ul className="mt-1 space-y-1 text-slate-300">
                          {cookResult.consumed.map((line) => <li key={line}>· {line}</li>)}
                        </ul>
                      </div>
                    )}
                    {cookResult.unmatched.length > 0 && (
                      <div>
                        <p className="font-medium text-amber-300">Not found in inventory:</p>
                        <ul className="mt-1 space-y-1 text-slate-300">
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
                      onClick={() => cookRecipeMutation.mutate({ id: selectedRecipe.id, servings: selectedServings })}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <UtensilsCrossed className="h-4 w-4" />
                      {cookRecipeMutation.isPending ? "Updating inventory..." : "Cooked this!"}
                    </button>
                    {availability && !canCook && (
                      <div className="space-y-1 text-sm">
                        {availability.insufficientIngredients.map((line) => (
                          <p key={line} className="text-amber-300">· Not enough: {line}</p>
                        ))}
                        {availability.missingIngredients.map((line) => (
                          <p key={line} className="text-rose-300">· Missing: {line}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {cookRecipeMutation.isError && (
                  <p className="mt-2 text-sm text-rose-300">Could not update inventory. Try again.</p>
                )}
              </div>
            </div>
          </div>
          );
        })()}
      </main>

      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => { setShowChangePassword(false); changePasswordMutation.reset(); }}
          onSubmit={(currentPassword, newPassword) => changePasswordMutation.mutate({ currentPassword, newPassword })}
          isPending={changePasswordMutation.isPending}
          isError={changePasswordMutation.isError}
          isSuccess={changePasswordMutation.isSuccess}
        />
      )}
    </div>
  );
}

function parseIngredientLine(line: string): RecipeIngredient {
  // Matches: "{qty} {unit} [of|van] {name}"  e.g. "100 ml of water" or "3 cloves garlic"
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

function LoginPage({
  onLogin,
  error,
  isPending
}: {
  onLogin: (args: { username: string; password: string }) => void;
  error: boolean;
  isPending: boolean;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onLogin({ username, password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-glow">
        <p className="text-sm uppercase tracking-[0.2em] text-brand-100">ONS Inventory</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Sign in</h1>
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <input
            required
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500"
            placeholder="Username"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500"
            placeholder="Password"
          />
          {error && <p className="text-sm text-rose-300">Incorrect username or password.</p>}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ChangePasswordModal({
  onClose,
  onSubmit,
  isPending,
  isError,
  isSuccess
}: {
  onClose: () => void;
  onSubmit: (currentPassword: string, newPassword: string) => void;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = next !== confirm && confirm.length > 0;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    onSubmit(current, next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <h3 className="text-lg font-semibold text-white">Change password</h3>
        {isSuccess ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-emerald-300">Password changed successfully.</p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500"
            >
              Close
            </button>
          </div>
        ) : (
          <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              required
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500"
              placeholder="Current password"
            />
            <input
              required
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500"
              placeholder="New password"
            />
            <input
              required
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`rounded-lg border px-3 py-2 text-slate-100 placeholder:text-slate-500 ${mismatch ? "border-rose-500 bg-rose-950/30" : "border-slate-700 bg-slate-800"}`}
              placeholder="Confirm new password"
            />
            {mismatch && <p className="text-sm text-rose-300">Passwords do not match.</p>}
            {isError && <p className="text-sm text-rose-300">Current password is incorrect.</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-slate-200 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || mismatch}
                className="flex-1 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500 disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  onClick,
  active
}: {
  icon: ReactNode;
  label: string;
  value: number;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-slate-900/80 p-5 transition ${
        onClick ? "cursor-pointer hover:bg-slate-800/80" : ""
      } ${active ? "border-brand-500 ring-1 ring-brand-500" : "border-slate-800"}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="flex items-center gap-2 text-brand-100">{icon}</div>
      <p className="mt-3 text-sm text-slate-300">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
