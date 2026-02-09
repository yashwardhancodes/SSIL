import { useLocalSearchParams } from "expo-router";
import React from "react";
import CreatePayment from "./create";

export default function EditPayment() {
  const { id } = useLocalSearchParams();
  return <CreatePayment paymentId={id ? Number(id) : undefined} />;
}