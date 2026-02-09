import { Stack } from "expo-router";
import React from "react";

export default function PaymentsLayout() {
  return (
    <Stack  screenOptions={{
        headerShown: false, // We use the global AppHeader
      }}>
      <Stack.Screen name="index" options={{ title: "Payments" }} />
      <Stack.Screen name="create" options={{ title: "Record Payment" }} />
      <Stack.Screen name="edit" options={{ title: "Edit Payment" }} />
    </Stack>
  );
}