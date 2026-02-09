// app/(tabs)/parties/_layout.tsx
import { Stack } from "expo-router";
import React from "react";

export default function PartiesLayout() {
    return (
    <Stack
      screenOptions={{
        headerShown: false, // We use the global AppHeader
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="form" />
    </Stack>
  );
}