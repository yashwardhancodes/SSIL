// app/(tabs)/invoices/_layout.tsx
import { Stack } from "expo-router";
import React from "react";

export default function InvoicesLayout() {
    return (
        <Stack   screenOptions={{
        headerShown: false, // We use the global AppHeader
      }}>
            <Stack.Screen name="index" options={{ title: "Invoices" }} />
            <Stack.Screen name="create" options={{ title: "Create Invoice" }} />
         </Stack>
    );
}