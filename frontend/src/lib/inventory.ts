import { InventoryItem } from "../types";

export function isExpiring(item: InventoryItem): boolean {
  return Boolean(item.expiringSoon ?? item.expiringsoon);
}
