import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ChefHat,
  Flame,
  Package,
  Refrigerator,
  Sparkles
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  addInventoryItem,
  getInventory,
  getLocations,
  getRecommendations,
  getRecipes
} from "./api/client";
import { recommendationLabel, topRecommendation } from "./lib/recommendation";
import { InventoryItem } from "./types";

const colors = ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#14b8a6"];

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

function isExpiring(item: InventoryItem): boolean {
  return Boolean(item.expiringSoon ?? item.expiringsoon);
}

export default function App() {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<AddItemFormState>(initialForm);
  const [activeLocation, setActiveLocation] = useState<string>("All");

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

  const inventory = inventoryQuery.data ?? [];
  const recommendations = recommendationsQuery.data ?? [];

  const filteredInventory = useMemo(() => {
    if (activeLocation === "All") {
      return inventory;
    }
    return inventory.filter((item) => item.location === activeLocation);
  }, [activeLocation, inventory]);

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
    addItemMutation.mutate({
      ...formState,
      expiryDate: formState.expiryDate || undefined,
      notes: formState.notes || undefined
    });
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
              <p className="text-sm uppercase tracking-[0.2em] text-brand-100">Pantry Pilot</p>
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
              <MetricCard icon={<ChefHat className="h-5 w-5" />} label="Recipes" value={recipesQuery.data?.length ?? 0} />
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
                    filteredInventory.map((item) => (
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
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
                  <h2 className="flex items-center gap-2 text-xl font-semibold">
                    <Refrigerator className="h-5 w-5" />
                    Add inventory item
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
                      disabled={addItemMutation.isPending}
                      className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
                    >
                      {addItemMutation.isPending ? "Adding..." : "Add item"}
                    </button>
                    {addItemMutation.isError && (
                      <p className="text-sm text-rose-300">Could not add item. Check backend availability.</p>
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
                    className="rounded-xl border border-slate-700 bg-slate-800/70 p-4"
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
          </>
        )}
      </main>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
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
