import axios from "axios";

const API_BASE_URL = "https://ssil-backend.onrender.com/api"; // ← change to your backend

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});