import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Refrigerator, Trash2, Undo2, X } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { addInventoryItem, deleteInventoryItem, updateInventoryItem } from "../api/client";
import { useI18n } from "../i18n";
import { isExpiring } from "../lib/inventory";
import { inputClass } from "../lib/ui";
import { InventoryItem, Location } from "../types";

const chartColors = ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#14b8a6"];
const pageSizeOptions = [4, 8, 12];

type ItemFormState = {
  name: string;
  category: string;
  location: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  notes: string;
};

const initialForm: ItemFormState = {
  name: "",
  category: "",
  location: "Fridge",
  quantity: 1,
  unit: "pieces",
  expiryDate: "",
  notes: ""
};

export default function InventorySection({
  inventory,
  locations,
  searchQuery,
  expiryFilter,
  onClearExpiryFilter
}: {
  inventory: InventoryItem[];
  locations: Location[];
  searchQuery: string;
  expiryFilter: "expiring" | "expired" | null;
  onClearExpiryFilter: () => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<ItemFormState>(initialForm);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [activeLocation, setActiveLocation] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["inventory"] });
    await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
  };

  const addItemMutation = useMutation({
    mutationFn: addInventoryItem,
    onSuccess: async () => {
      setFormState(initialForm);
      await invalidate();
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ItemFormState }) =>
      updateInventoryItem(id, {
        ...payload,
        expiryDate: payload.expiryDate || undefined,
        notes: payload.notes || undefined
      }),
    onSuccess: async () => {
      setEditingItemId(null);
      setFormState(initialForm);
      await invalidate();
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess: invalidate
  });

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

  const locationDistribution = useMemo(() => {
    const counts = inventory.reduce<Record<string, number>>((acc, item) => {
      acc[item.location] = (acc[item.location] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [inventory]);

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

  return (
    <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{t("inventory.title")}</h2>
            {expiryFilter && !searchQuery && (
              <button
                type="button"
                onClick={onClearExpiryFilter}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                  expiryFilter === "expiring"
                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-200 hover:bg-amber-500/30"
                    : "bg-rose-500/20 text-rose-600 dark:text-rose-200 hover:bg-rose-500/30"
                }`}
              >
                {expiryFilter === "expiring" ? t("metrics.expiringSoon") : t("metrics.expired")}
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {!searchQuery && (
            <div className="flex flex-wrap gap-2">
              {[{ name: "All", label: t("inventory.all") }, ...locations.map((location) => ({ name: location.name, label: location.name }))].map(({ name, label }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setActiveLocation(name)}
                  className={`rounded-lg px-3 py-1 text-sm transition ${
                    activeLocation === name
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {filteredInventory.length === 0 ? (
            <p className="rounded-lg bg-slate-50 dark:bg-slate-800/70 p-4 text-slate-600 dark:text-slate-300">{t("inventory.empty")}</p>
          ) : (
            paginatedInventory.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {item.quantity} {item.unit} · {item.category} · {item.location}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      item.expired
                        ? "bg-rose-500/20 text-rose-600 dark:text-rose-200"
                        : isExpiring(item)
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-200"
                          : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-200"
                    }`}
                  >
                    {item.expired ? t("inventory.status.expired") : isExpiring(item) ? t("inventory.status.expiring") : t("inventory.status.fresh")}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEditingItem(item)}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-200 dark:bg-slate-700 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
                  >
                    <Pencil className="h-3 w-3" />
                    {t("common.edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItemMutation.mutate(item.id)}
                    className="inline-flex items-center gap-1 rounded-md bg-rose-500/20 px-2 py-1 text-xs text-rose-600 dark:text-rose-200 hover:bg-rose-500/30"
                  >
                    <Trash2 className="h-3 w-3" />
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {filteredInventory.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700 pt-4 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span>{t("pagination.itemsPerPage")}</span>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-slate-800 dark:text-slate-200"
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
                className="rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-slate-700 dark:text-slate-200 disabled:opacity-40"
              >
                {t("pagination.previous")}
              </button>
              <span>
                {t("pagination.page", { current: currentPage, total: totalPages })}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-slate-700 dark:text-slate-200 disabled:opacity-40"
              >
                {t("pagination.next")}
              </button>
            </div>
          </div>
        )}
      </article>

      <article className="space-y-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Refrigerator className="h-5 w-5" />
            {editingItemId !== null ? t("inventory.editItem") : t("inventory.addItem")}
          </h2>
          <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
            <input
              required
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              className={inputClass}
              placeholder={t("inventory.form.name")}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                value={formState.category}
                onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
                className={inputClass}
                placeholder={t("inventory.form.category")}
              />
              <select
                value={formState.location}
                onChange={(event) => setFormState((prev) => ({ ...prev, location: event.target.value }))}
                className={inputClass}
              >
                {locations.map((location) => (
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
                className={inputClass}
                placeholder={t("inventory.form.quantity")}
              />
              <input
                required
                value={formState.unit}
                onChange={(event) => setFormState((prev) => ({ ...prev, unit: event.target.value }))}
                className={inputClass}
                placeholder={t("inventory.form.unit")}
              />
            </div>
            <input
              type="date"
              value={formState.expiryDate}
              onChange={(event) => setFormState((prev) => ({ ...prev, expiryDate: event.target.value }))}
              className={inputClass}
            />
            <textarea
              value={formState.notes}
              onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
              className={inputClass}
              placeholder={t("inventory.form.notes")}
            />
            <button
              type="submit"
              disabled={addItemMutation.isPending || updateItemMutation.isPending}
              className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
            >
              {editingItemId !== null
                ? updateItemMutation.isPending
                  ? t("common.saving")
                  : t("common.saveChanges")
                : addItemMutation.isPending
                  ? t("common.adding")
                  : t("inventory.form.add")}
            </button>
            {editingItemId !== null && (
              <button
                type="button"
                onClick={cancelEditing}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Undo2 className="h-4 w-4" />
                {t("common.cancelEdit")}
              </button>
            )}
            {addItemMutation.isError && (
              <p className="text-sm text-rose-600 dark:text-rose-300">{t("inventory.error.add")}</p>
            )}
            {updateItemMutation.isError && (
              <p className="text-sm text-rose-600 dark:text-rose-300">{t("inventory.error.update")}</p>
            )}
            {deleteItemMutation.isError && (
              <p className="text-sm text-rose-600 dark:text-rose-300">{t("inventory.error.delete")}</p>
            )}
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6">
          <h2 className="text-xl font-semibold">{t("inventory.chart.title")}</h2>
          <div className="mt-4 h-64">
            {locationDistribution.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-300">{t("inventory.chart.empty")}</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={locationDistribution} dataKey="value" nameKey="name" outerRadius={95}>
                    {locationDistribution.map((entry, index) => (
                      <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
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
  );
}
