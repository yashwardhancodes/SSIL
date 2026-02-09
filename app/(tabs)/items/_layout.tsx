// app/(tabs)/items/_layout.tsx
import { Stack } from "expo-router";

export default function ItemsLayout() {
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
