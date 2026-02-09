// app/src/screens/ItemList.tsx
// ZOHO PROFESSIONAL UI — Fully Themed + Polished

import { useTheme } from "@/app/theme/ThemeContext";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import Animated, { FadeInUp } from "react-native-reanimated";
import { ItemService } from "../services/itemService";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

export default function ItemList() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // GLOBAL THEME
  const { isDark, theme } = useTheme();

  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: () => ItemService.getAll().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ItemService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      Alert.alert("Deleted", "Item removed successfully");
    },
    onError: () => Alert.alert("Error", "Cannot delete item used in invoices"),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["items"] });
    setRefreshing(false);
  };

  const filteredItems = items.filter((item: any) => {
    return (
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.hsnSac?.includes(search)
    );
  });

  const renderRightActions = (id: number) => (
    <View style={styles.swipeContainer}>
      <TouchableOpacity
        style={styles.deleteBox}
        onPress={() =>
          Alert.alert("Delete Item", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) },
          ])
        }
      >
        <IconSymbol name="trash.fill" size={22} color="#fff" />
        <Text style={styles.deleteText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search items..."
        placeholderTextColor={theme.textSecondary}
        value={search}
        onChangeText={setSearch}
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/items/form")}
      >
        <IconSymbol name="plus.circle.fill" size={22} color="#fff" />
        <Text style={styles.addButtonText}>Add New Item</Text>
      </TouchableOpacity>

      {/* List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <IconSymbol name="shippingbox.fill" size={42} color={theme.textSecondary} />
            <Text style={styles.emptyText}>No items found</Text>
            <Text style={styles.emptySub}>Tap + to add your first item</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isLowStock = item.currentStock <= (item.lowStockAlert || 2);
          const isOutOfStock = item.currentStock <= 0;

          return (
            <Swipeable renderRightActions={() => renderRightActions(item.id)}>
              <Animated.View entering={FadeInUp.duration(250)}>
                <TouchableOpacity
                  style={styles.itemCard}
                  onPress={() => router.push(`/items/form?id=${item.id}`)}
                >
                  {/* Name + Stock badge */}
                  <View style={styles.rowBetween}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>

                    {isOutOfStock ? (
                      <View style={[styles.stockBadge, styles.badgeOut]}>
                        <Text style={styles.badgeText}>OUT</Text>
                      </View>
                    ) : isLowStock ? (
                      <View style={[styles.stockBadge, styles.badgeLow]}>
                        <Text style={styles.badgeText}>LOW</Text>
                      </View>
                    ) : (
                      <View style={[styles.stockBadge, styles.badgeOk]}>
                        <Text style={styles.badgeText}>IN STOCK</Text>
                      </View>
                    )}
                  </View>

                  {/* HSN + Rate */}
                  <View style={styles.rowBetween}>
                    <Text style={styles.hsn}>HSN: {item.hsnSac || "—"}</Text>
                    <Text style={styles.unitRate}>
                      {formatCurrency(item.saleRate)} / {item.unit}
                    </Text>
                  </View>

                  {/* Stock & GST */}
                  <View style={styles.rowBetween}>
                    <Text style={styles.stockText}>
                      Stock:{" "}
                      <Text style={styles.stockValue}>{item.currentStock}</Text>{" "}
                      {item.unit}
                    </Text>

                    <Text style={styles.gstText}>{item.taxRate}% GST</Text>
                  </View>

                  {/* Arrow */}
                  <View style={styles.arrow}>
                    <IconSymbol name="chevron.right" size={20} color={theme.accent} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </Swipeable>
          );
        }}
      />
    </SafeAreaView>
  );
}

// --------------------------------------------------------
// STYLES — ZOHO CRM Styled UI
// --------------------------------------------------------
const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },

    searchInput: {
      margin: 16,
      padding: 14,
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      fontSize: 16,
      color: theme.text,
    },

    addButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 16,
      paddingVertical: 14,
      paddingHorizontal: 18,
      backgroundColor: theme.accent,
      borderRadius: 14,
      marginBottom: 12,
    },

    addButtonText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
    },

    itemCard: {
      backgroundColor: theme.card,
      marginHorizontal: 16,
      marginBottom: 14,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      position: "relative",
    },

    rowBetween: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 6,
    },

    itemName: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
      flex: 1,
      marginRight: 10,
    },

    hsn: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: "600",
    },

    unitRate: {
      fontSize: 13,
      color: theme.accent,
      fontWeight: "700",
    },

    stockText: {
      fontSize: 13,
      color: theme.textSecondary,
    },

    stockValue: {
      fontWeight: "800",
      color: theme.text,
    },

    gstText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.success || "#24C78C",
    },

    arrow: {
      position: "absolute",
      right: 16,
      top: "42%",
    },

    // Stock badges
    stockBadge: {
      paddingHorizontal: 12,
      paddingVertical: 3,
      borderRadius: 20,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#fff",
    },
    badgeOut: { backgroundColor: "#d33" },
    badgeLow: { backgroundColor: "#ff9500" },
    badgeOk: { backgroundColor: "#28a745" },

    // Swipe delete
    swipeContainer: {
      justifyContent: "center",
      alignItems: "center",
      width: 100,
    },
    deleteBox: {
      backgroundColor: "#d33",
      width: 90,
      height: "80%",
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 12,
      marginVertical: 8,
    },
    deleteText: {
      color: "#fff",
      fontSize: 12,
      marginTop: 4,
      fontWeight: "600",
    },

    empty: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingTop: 120,
      opacity: 0.7,
    },
    emptyText: {
      fontSize: 18,
      color: theme.textSecondary,
      marginTop: 12,
      fontWeight: "600",
    },
    emptySub: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 4,
    },
  });
