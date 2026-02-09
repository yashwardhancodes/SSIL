// app/src/screens/ItemForm.tsx
// FULLY THEMED — Matches Dashboard & ItemList (Global Theme)

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { useTheme } from "@/app/theme/ThemeContext"; // ⭐ GLOBAL THEME
import React from "react";
import { ItemService } from "../services/itemService";

const COMMON_UNITS = ["Month", "Day", "Hour", "Nos", "Kg", "Ltr", "Set"];

export default function ItemForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const itemId = id ? Number(id) : undefined;
  const queryClient = useQueryClient();

  const {
    theme,
    isDark
  } = useTheme(); // GLOBAL THEME SYSTEM

  const styles = useMemo(() => createStyles(theme), [theme]);

  // ------------------ STATE ------------------
  const [name, setName] = useState("");
  const [hsnSac, setHsnSac] = useState("");
  const [unit, setUnit] = useState("Month");
  const [saleRate, setSaleRate] = useState("");
  const [purchaseRate, setPurchaseRate] = useState("");
  const [taxRate, setTaxRate] = useState("18");
  const [currentStock, setCurrentStock] = useState("");
  const [lowStockAlert, setLowStockAlert] = useState("");

  // ------------------ QUERY ------------------
  const { data: item } = useQuery({
    queryKey: ["item", itemId],
    queryFn: () => ItemService.getById(itemId!).then((r) => r.data),
    enabled: !!itemId,
  });

  useEffect(() => {
    if (item) {
      setName(item.name || "");
      setHsnSac(item.hsnSac || "");
      setUnit(item.unit || "Month");
      setSaleRate(item.saleRate?.toString() || "");
      setPurchaseRate(item.purchaseRate?.toString() || "");
      setTaxRate(item.taxRate?.toString() || "18");
      setCurrentStock(item.currentStock?.toString() || "");
      setLowStockAlert(item.lowStockAlert?.toString() || "");
    }
  }, [item]);

  const mutation = useMutation({
    mutationFn: itemId
      ? (data: any) => ItemService.update(itemId, data)
      : (data: any) => ItemService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      Alert.alert("Success", itemId ? "Item updated!" : "Item created!");
      router.back();
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to save item");
    },
  });

  // ------------------ SUBMIT ------------------
  const submit = () => {
    if (!name.trim()) return Alert.alert("Required", "Item name is required");
    if (!saleRate || parseFloat(saleRate) <= 0)
      return Alert.alert("Required", "Sale rate must be > 0");

    mutation.mutate({
      name: name.trim(),
      hsnSac: hsnSac.trim() || null,
      unit: unit.trim(),
      saleRate: parseFloat(saleRate),
      purchaseRate: parseFloat(purchaseRate || "0"),
      taxRate: parseFloat(taxRate || "18"),
      currentStock: parseFloat(currentStock || "0"),
      lowStockAlert: lowStockAlert ? parseFloat(lowStockAlert) : null,
    });
  };

  // ------------------ UI ------------------
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.container}>

          {/* HEADER */}
       

          {/* FORM */}
          <View style={styles.form}>
            
            {/* Item Name */}
            <Text style={styles.label}>Item Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Example: JCB Hire on Monthly Basis"
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
              multiline
            />

            {/* HSN/SAC */}
            <Text style={styles.label}>HSN/SAC Code</Text>
            <TextInput
              style={styles.input}
              placeholder="997319"
              placeholderTextColor={theme.textSecondary}
              value={hsnSac}
              onChangeText={setHsnSac}
              keyboardType="number-pad"
            />

            {/* Unit */}
            <Text style={styles.label}>Unit *</Text>
            <View style={styles.unitGrid}>
              {COMMON_UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.unitBtn,
                    unit === u && styles.unitActive
                  ]}
                  onPress={() => setUnit(u)}
                >
                  <Text
                    style={[
                      styles.unitText,
                      unit === u && styles.unitActiveText
                    ]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sale Rate */}
            <Text style={styles.label}>Sale Rate *</Text>
            <View style={styles.rateInput}>
              <Text style={styles.currency}>₹</Text>
              <TextInput
                style={styles.rateText}
                placeholder="100000"
                placeholderTextColor={theme.textSecondary}
                value={saleRate}
                onChangeText={setSaleRate}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Purchase Rate */}
            <Text style={styles.label}>Purchase Rate</Text>
            <View style={styles.rateInput}>
              <Text style={styles.currency}>₹</Text>
              <TextInput
                style={styles.rateText}
                placeholder="50000"
                placeholderTextColor={theme.textSecondary}
                value={purchaseRate}
                onChangeText={setPurchaseRate}
                keyboardType="decimal-pad"
              />
            </View>

            {/* GST Buttons */}
            <Text style={styles.label}>GST Rate (%)</Text>
            <View style={styles.rateRow}>
              {[0, 5, 12, 18, 28].map((rate) => (
                <TouchableOpacity
                  key={rate}
                  style={[
                    styles.taxBtn,
                    taxRate === rate.toString() && styles.taxActive
                  ]}
                  onPress={() => setTaxRate(rate.toString())}
                >
                  <Text
                    style={[
                      styles.taxText,
                      taxRate === rate.toString() && styles.taxActiveText
                    ]}
                  >
                    {rate}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Current Stock */}
            <Text style={styles.label}>Current Stock</Text>
            <TextInput
              style={styles.input}
              placeholder="5"
              placeholderTextColor={theme.textSecondary}
              value={currentStock}
              onChangeText={setCurrentStock}
              keyboardType="decimal-pad"
            />

            {/* Low Stock Alert */}
            <Text style={styles.label}>Low Stock Alert</Text>
            <TextInput
              style={styles.input}
              placeholder="2"
              placeholderTextColor={theme.textSecondary}
              value={lowStockAlert}
              onChangeText={setLowStockAlert}
              keyboardType="number-pad"
            />

            {/* SAVE */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                mutation.isPending && styles.saveBtnDisabled
              ]}
              onPress={submit}
              disabled={mutation.isPending}
            >
              <Text style={styles.saveText}>
                {mutation.isPending
                  ? "Saving..."
                  : itemId
                  ? "Update Item"
                  : "Create Item"}
              </Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ------------------------- THEMED STYLES -------------------------
const createStyles = (theme: any) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.bg,
    },

    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderColor: theme.border,
    },

    title: {
      flex: 1,
      textAlign: "center",
      fontSize: 20,
      fontWeight: "700",
      color: theme.text,
    },

    form: {
      padding: 20,
    },

    label: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginTop: 20,
      marginBottom: 8,
    },

    input: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.text,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      textAlignVertical: "top",
    },

    unitGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginVertical: 8,
    },

    unitBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
    },

    unitActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },

    unitText: {
      color: theme.text,
      fontWeight: "600",
    },

    unitActiveText: {
      color: "#fff",
    },

    rateInput: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 16,
    },

    currency: {
      fontSize: 18,
      color: theme.textSecondary,
      marginRight: 8,
    },

    rateText: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
    },

    rateRow: {
      flexDirection: "row",
      gap: 12,
      marginVertical: 8,
    },

    taxBtn: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
    },

    taxActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },

    taxText: {
      fontWeight: "600",
      color: theme.text,
    },

    taxActiveText: {
      color: "#fff",
    },

    saveBtn: {
      backgroundColor: theme.accent,
      padding: 18,
      borderRadius: 16,
      alignItems: "center",
      marginTop: 40,
      marginBottom: 60,
    },

    saveBtnDisabled: {
      opacity: 0.5,
    },

    saveText: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "700",
    },
  });
