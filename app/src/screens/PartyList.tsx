// app/src/screens/PartyList.tsx
// ZOHO-Styled Party List + Global Theme Support + Polished UI

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
import { Party, PartyService } from "../services/partyService";

export default function PartyList() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { isDark, theme } = useTheme();

  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const { data: parties = [], isLoading, error } = useQuery({
    queryKey: ["parties"],
    queryFn: () => PartyService.getAll().then((r) => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => PartyService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["parties"] }),
    onError: () => Alert.alert("Error", "Could not delete party"),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["parties"] });
    setRefreshing(false);
  };

  const filtered = parties.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderRightActions = (id: number) => (
    <View style={styles.swipeContainer}>
      <TouchableOpacity
        style={styles.deleteBox}
        onPress={() =>
          Alert.alert("Delete Party", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deleteMut.mutate(id) },
          ])
        }
      >
        <IconSymbol name="trash.fill" size={22} color="#fff" />
        <Text style={styles.deleteText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading && !refreshing)
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Text style={styles.loading}>Loading...</Text>
      </SafeAreaView>
    );

  if (error)
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>Failed to load parties</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by party name..."
        placeholderTextColor={theme.textSecondary}
        value={search}
        onChangeText={setSearch}
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/parties/form")}
      >
        <IconSymbol name="plus.circle.fill" size={22} color="#fff" />
        <Text style={styles.addButtonText}>Add Party</Text>
      </TouchableOpacity>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <IconSymbol name="person.2.fill" size={42} color={theme.textSecondary} />
            <Text style={styles.emptyText}>No parties found</Text>
            <Text style={styles.emptySub}>Tap + to add your first party</Text>
          </View>
        }
        renderItem={({ item }: { item: Party }) => {
          const balance = item.currentBalance ?? 0;

          const balanceStyle =
            balance > 0
              ? styles.badgeReceivable
              : balance < 0
              ? styles.badgePayable
              : styles.badgeNeutral;

          return (
            <Swipeable renderRightActions={() => renderRightActions(item.id)}>
              <Animated.View entering={FadeInUp.duration(250)}>
                <TouchableOpacity
                  style={styles.itemCard}
                  onPress={() => router.push(`/parties/form?id=${item.id}`)}
                >
                  {/* Name + Type */}
                  <View style={styles.rowBetween}>
                    <Text style={styles.partyName}>{item.name}</Text>

                    <View style={[styles.balanceBadge, balanceStyle]}>
                      <Text style={styles.badgeText}>
                        {balance > 0 ? "Receivable" : balance < 0 ? "Payable" : "Settled"}
                      </Text>
                    </View>
                  </View>

                  {/* Type + Balance */}
                  <View style={styles.rowBetween}>
                    <Text style={styles.partyType}>{item.type}</Text>

                    <Text style={styles.balanceText}>
                      ₹ {Math.abs(balance).toLocaleString("en-IN")}
                    </Text>
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

// -------------------------------------------------------
// THEMED STYLES — Zoho CRM Look
// -------------------------------------------------------
const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },

    loading: {
      marginTop: 40,
      textAlign: "center",
      color: theme.textSecondary,
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
      borderRadius: 12,
      marginBottom: 10,
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
      alignItems: "center",
      marginTop: 4,
    },

    partyName: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
      flex: 1,
      marginRight: 10,
    },

    partyType: {
      fontSize: 13,
      color: theme.textSecondary,
    },

    balanceText: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.text,
    },

    // Balance badge (Receivable / Payable)
    balanceBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
    },

    badgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#fff",
    },

    badgeReceivable: {
      backgroundColor: "#1E88E5",
    },
    badgePayable: {
      backgroundColor: "#D33",
    },
    badgeNeutral: {
      backgroundColor: "#888",
    },

    arrow: {
      position: "absolute",
      right: 16,
      top: "42%",
    },

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

    // Empty state
    empty: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingTop: 120,
      opacity: 0.75,
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

    error: {
      padding: 20,
      textAlign: "center",
      color: "#d33",
    },
  });
