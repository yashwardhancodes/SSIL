// app/src/services/itemService.ts
import { api } from "../api/apiClient";

export interface Item {
  hsnSac: string;
  saleRate: any;
  purchaseRate: any;
  currentStock: any;
  lowStockAlert: any;
  unitPrice(unitPrice: any): number;
  gstRate(gstRate: any): number;
  id: number;
  name: string;
  unit: string;
  price: number;
  taxRate: number;
  stock: number;
}

export const ItemService = {
  getAll: () => api.get<Item[]>("/items"),
  getById: (id: number) => api.get<Item>(`/items/${id}`),
  create: (data: Omit<Item, "id">) => api.post<Item>("/items", data),
  update: (id: number, data: Partial<Omit<Item, "id">>) =>
    api.put<Item>(`/items/${id}`, data),
delete: (id: number) => api.delete(`/items/${id}`),
};