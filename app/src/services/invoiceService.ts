// app/src/services/invoiceService.ts
import { api } from "../api/apiClient";

export interface InvoiceItem {
  id?: number;
  itemId: number;
  quantity: number;
  rate: number;
  taxRate: number;
}

export interface Invoice {
  date: string;
  siteName: string;
  particular: string;
  grandTotal(grandTotal: any): unknown;
  id: number;
  type: "sale" | "purchase";
  partyId: number;
  party?: any;
  items: InvoiceItem[];
  discount: number;
  paidAmount: number;
  totalAmount?: number;
  status: "draft" | "sent" | "paid";
  invoiceNumber?: string;
  createdAt: string;
  balance?: number;
  total?: number;
}

export const InvoiceService = {
  getAll: () => api.get<Invoice[]>("/invoices"),
  getById: (id: number) => api.get<Invoice>(`/invoices/${id}`),
  create: (data: any) => api.post<Invoice>("/invoices", data),

  // FIXED: Use PATCH + trailing slash
  update: (id: number, data: any) =>
    api.patch<Invoice>(`/invoices/${id}/`, data),

  delete: (id: number) => api.delete<void>(`/invoices/${id}/`),
};