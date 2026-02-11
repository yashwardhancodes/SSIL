// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { useTheme } from "@/app/theme/ThemeContext";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const SSIL_ORANGE = "#ff6b00"; // your brand color

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        // Colors from global theme
        tabBarActiveTintColor: SSIL_ORANGE,     // ACTIVE icon + label = ORANGE
        tabBarInactiveTintColor: theme.textSecondary,  // INACTIVE icon + label

        // Label styles
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginBottom: 4,
        },

        // Tab bar container
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          height: Platform.OS === "ios" ? 84 : 70 + insets.bottom,
          paddingBottom: Platform.OS === "ios" ? 28 : 10 + insets.bottom,
          paddingTop: 8,

          // Shadow
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 4,
        },

        tabBarItemStyle: {
          padding: 4,
        },

        tabBarButton: HapticTab,
      }}
    >
      {/* HOME */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={26}
              name="house.fill"
              color={color}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />

      {/* ITEMS */}
      <Tabs.Screen
        name="items"
        options={{
          title: "Items",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={26}
              name="cube.box.fill"
              color={color}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />

      {/* PARTIES */}
      <Tabs.Screen
        name="parties"
        options={{
          title: "Parties",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={26}
              name="person.2.fill"
              color={color}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />

      {/* INVOICES */}
      <Tabs.Screen
        name="invoices"
        options={{
          title: "Invoices",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={26}
              name="doc.text.fill"
              color={color}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />

      {/* PAYMENTS */}
      <Tabs.Screen
        name="payments"
        options={{
          title: "Payments",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={26}
              name="creditcard.fill"
              color={color}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />
    </Tabs>
  );
}
