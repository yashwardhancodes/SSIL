import { api } from "../api/apiClient";

export interface Party {
  address: string;
  gstin: string;
  openingBalance: any;
  contact: string;
  id: number;
  name: string;
  type: "customer" | "supplier";
  currentBalance: number;
}

export const PartyService = {
  getAll: async () => {
    console.log("Fetching parties from API...");
    try {
      const response = await api.get<Party[]>("/parties");
      console.log("Raw API Response:", response); // <-- Critical
      return response;
    } catch (err) {
      console.error("API Error in getAll:", err);
      throw err;
    }
  },
  getById: (id: number) => api.get<Party>(`/parties/${id}`),
  create: (data: Omit<Party, "id" | "currentBalance">) =>
    api.post<Party>("/parties", data),
  update: (id: number, data: Partial<Omit<Party, "id">>) =>
    api.put<Party>(`/parties/${id}`, data),
  remove: (id: number) => api.delete<void>(`/parties/${id}`),
};