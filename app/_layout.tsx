// app/_layout.tsx

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AppHeader from "@/components/AppHeader";
import React from "react";
import { ThemeProvider, useTheme } from "./theme/ThemeContext";
// Expo router setting
export const unstable_settings = {
  anchor: "(tabs)",
};

// Global Query Client
const queryClient = new QueryClient();

function LayoutContent() {
  const { isDark } = useTheme();

  return (
    <>
      {/* GLOBAL HEADER ALWAYS VISIBLE */}
      <AppHeader />

      {/* Expo Router Stack (NO NavigationContainer needed!) */}
      <Stack
        screenOptions={{
          headerShown: false, // we use our custom header
        }}
      >
        <Stack.Screen name="index" />  {/* splash */}
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>

      {/* Statusbar follows global theme */}
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {/* GLOBAL THEME CONTEXT (dark/light toggle) */}
          <ThemeProvider>
            <LayoutContent />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
