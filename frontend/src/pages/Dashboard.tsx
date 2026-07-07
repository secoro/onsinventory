import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ChefHat, Flame, Package, Search, X } from "lucide-react";
import InventorySection from "../components/InventorySection";
import MetricCard from "../components/MetricCard";
import RecipeDetailModal from "../components/RecipeDetailModal";
import RecipesSection from "../components/RecipesSection";
import { useInventoryQuery, useLocationsQuery, useRecipesQuery, useRecommendationsQuery } from "../hooks/queries";
import { isExpiring } from "../lib/inventory";
import { recommendationLabel } from "../lib/recommendation";
import { Recipe } from "../types";

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expiryFilter, setExpiryFilter] = useState<"expiring" | "expired" | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const locationsQuery = useLocationsQuery();
  const inventoryQuery = useInventoryQuery();
  const recipesQuery = useRecipesQuery();
  const recommendationsQuery = useRecommendationsQuery();

  const inventory = inventoryQuery.data ?? [];
  const recipes = recipesQuery.data ?? [];
  const recommendations = recommendationsQuery.data ?? [];

  const expiringCount = inventory.filter((item) => isExpiring(item)).length;
  const expiredCount = inventory.filter((item) => item.expired).length;

  const isLoading =
    locationsQuery.isLoading ||
    inventoryQuery.isLoading ||
    recipesQuery.isLoading ||
    recommendationsQuery.isLoading;

  return (
    <>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-400" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setSearchQuery("")}
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 py-3 pl-11 pr-10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-600 focus:outline-none"
          placeholder="Search inventory and recipes..."
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6">
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

          <InventorySection
            inventory={inventory}
            locations={locationsQuery.data ?? []}
            searchQuery={searchQuery}
            expiryFilter={expiryFilter}
            onClearExpiryFilter={() => setExpiryFilter(null)}
          />

          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6">
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
                  className="cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900 dark:text-white">{recommendation.recipe.name}</p>
                    <span className="rounded-full bg-brand-100 dark:bg-brand-600/25 px-2 py-1 text-xs text-brand-700 dark:text-brand-100">
                      {recommendationLabel(recommendation.matchPercentage)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Match: {recommendation.matchPercentage}% ({recommendation.matchedIngredients}/
                    {recommendation.totalIngredients})
                  </p>
                  {recommendation.expiringIngredientsUsed.length > 0 && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-200">
                      Use soon: {recommendation.expiringIngredientsUsed.join(", ")}
                    </p>
                  )}
                  {recommendation.insufficientIngredients?.length > 0 && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                      Not enough: {recommendation.insufficientIngredients.join(", ")}
                    </p>
                  )}
                  {recommendation.missingIngredients.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Missing: {recommendation.missingIngredients.join(", ")}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </section>

          <RecipesSection recipes={recipes} searchQuery={searchQuery} onSelectRecipe={setSelectedRecipe} />
        </>
      )}

      {selectedRecipe && (
        <RecipeDetailModal
          key={selectedRecipe.id}
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </>
  );
}
