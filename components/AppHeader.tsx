import { useTheme } from "@/app/theme/ThemeContext";
import { IconSymbol } from "@/components/ui/icon-symbol";
import React from "react";
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function AppHeader() {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.card,
          borderBottomColor: theme.border,
        },
      ]}
    >
      {/* Left Side: Logo + Company Name */}
      <View style={styles.left}>
        <Image
          source={require("../assets/images/logo1.png")}
          style={styles.logo}
        />

        <View style={{ marginLeft: 12 }}>
          <Text style={[styles.title, { color: theme.text }]}>
            SSIL INFRA SOLUTIONS LLP
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            GST Billing & Accounting
          </Text>
        </View>
      </View>

      {/* Right Side: Theme Toggle + Profile */}
      <View style={styles.right}>
        <TouchableOpacity onPress={toggleTheme}>
          <IconSymbol
            name={isDark ? "sun.max.fill" : "moon.fill"}
            size={26}
            color={theme.text}
          />
        </TouchableOpacity>

        <TouchableOpacity>
          <IconSymbol name="person.crop.circle.fill" size={30} color={theme.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === "ios" ? 52 : 52,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: { flexDirection: "row", alignItems: "center", flex: 1 },
  logo: { width: 90, height: 44, borderRadius: 8 },
  title: { fontSize: 16, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 2 },
  right: { flexDirection: "row", alignItems: "center", gap: 18 },
});
