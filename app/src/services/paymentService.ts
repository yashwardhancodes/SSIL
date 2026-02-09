import { api } from "../api/apiClient";

export const PaymentService = {
  // Get all payments
  getAll: () => api.get("/payments"),
 
  getById: (id: number) => api.get(`/payments/${id}`),
 
  create: (data: any) => api.post("/payments", data),
 
  update: (id: number, data: any) => api.put(`/payments/${id}`, data),
 
  delete: (id: number) => api.delete(`/payments/${id}`),
};
