// app/src/screens/CreateInvoice.tsx
// Themed CreateInvoice - Option B (Dark/Light premium UI)
// Uses global ThemeContext (useTheme) for consistent app styling

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Asset } from "expo-asset";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "@/app/theme/ThemeContext";
import { InvoiceService } from "../services/invoiceService";
import { ItemService } from "../services/itemService";
import { PartyService } from "../services/partyService";

const formatCurrency = (value?: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value ?? 0);

export default function CreateInvoice() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const invoiceId = id ? Number(id) : null;
  const isEdit = !!invoiceId;
  const router = useRouter();
  const queryClient = useQueryClient();

  // Theme
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Form state
  const [type, setType] = useState<"sale" | "purchase">("sale");
  const [partyId, setPartyId] = useState<number | null>(null);
  const [siteName, setSiteName] = useState("");
  const [particular, setParticular] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");

  const [lineItems, setLineItems] = useState<
    Array<{
      id?: number;
      itemId: number | null;
      hsnSac: string;
      particular: string;
      description: string;
      quantity: string;
      unit: string;
      rate: string;
    }>
  >([]);

  // Modals + search
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");

  // Data queries
  const { data: parties = [] } = useQuery({
    queryKey: ["parties"],
    queryFn: () => PartyService.getAll().then((r: any) => r.data),
  });

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: () => ItemService.getAll().then((r: any) => r.data),
  });

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => InvoiceService.getById(invoiceId!).then((r: any) => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
  if (!isEdit || !invoice) return;

  setType(invoice.type ?? "sale");
  setPartyId(invoice.partyId ?? null);

  setSiteName(invoice.siteName ?? "");
  setParticular(invoice.particular ?? "");

  setDiscount(String(invoice.discount ?? 0));
  setPaidAmount(String(invoice.paidAmount ?? 0));

  setLineItems(
    (invoice.items ?? []).map((i: any) => ({
      id: i.id,
      itemId: i.itemId,
      hsnSac: i.hsnSac ?? "",
      particular: i.particular ?? "",
      description: i.description ?? "",
      quantity: String(i.quantity ?? 0),
      unit: i.unit ?? "Month",
      rate: String(i.rate ?? 0),
    }))
  );
}, [invoice]);


  // Create / update mutation
  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit ? InvoiceService.update(invoiceId!, data) : InvoiceService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      Alert.alert("Success", `Invoice ${isEdit ? "updated" : "created"}!`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.message ?? "Failed to save invoice");
    },
  });

  // Line items helpers
  const addLineItem = (selectedItem?: any) => {
    const newItem = selectedItem
      ? {
          itemId: selectedItem.id,
          hsnSac: selectedItem.hsnSac ?? "",
          particular: selectedItem.name ?? "",
          description: selectedItem.description ?? "",
          quantity: "1",
          unit: selectedItem.unit ?? "Month",
          rate: (selectedItem.saleRate ?? 0).toString(),
        }
      : {
          itemId: null,
          hsnSac: "",
          particular: "",
          description: "",
          quantity: "1",
          unit: "Month",
          rate: "0",
        };

    setLineItems(prev => [...prev, newItem]);
    setShowItemModal(false);
    setItemSearch("");
  };

  const updateLineItem = (index: number, field: keyof typeof lineItems[0], value: string) => {
    setLineItems(prev => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      return updated;
    });
  };

  const removeLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  // calculations
  const calculateSubtotal = () =>
    lineItems.reduce((sum, item) => {
      const q = parseFloat(item.quantity) || 0;
      const r = parseFloat(item.rate) || 0;
      return sum + q * r;
    }, 0);

  const calculateTax = () => calculateSubtotal() * 0.18;
  const calculateTotalBeforeRound = () => calculateSubtotal() + calculateTax() - (parseFloat(discount) || 0);
  const calculateTotal = () => Math.round(calculateTotalBeforeRound());
  const roundOff = () => calculateTotal() - calculateTotalBeforeRound();

  // submit
  const submit = () => {
    if (!partyId) {
      Alert.alert("Required", "Please select a party");
      return;
    }
    if (lineItems.length === 0) {
      Alert.alert("Required", "Add at least one item");
      return;
    }
    if (lineItems.some(i => !(i.particular ?? "").trim())) {
      Alert.alert("Required", "Particular is required for each item");
      return;
    }

    const itemsPayload = lineItems.map(item => ({
      id: item.id,
      itemId: item.itemId,
      hsnSac: item.hsnSac?.trim() || null,
      particular: item.particular.trim(),
      description: item.description.trim() || null,
      quantity: parseFloat(item.quantity) || 0,
      unit: item.unit.trim(),
      rate: parseFloat(item.rate) || 0,
    }));

    const payload = {
      type,
      partyId,
      siteName: siteName.trim() || null,
      particular: particular.trim() || null,
      items: itemsPayload,
      discount: parseFloat(discount) || 0,
      paidAmount: parseFloat(paidAmount) || 0,
      cgstRate: 9,
      sgstRate: 9,
    };

    mutation.mutate(payload);
  };

  const selectedParty = parties.find((p: any) => p.id === partyId) ?? null;

  // Optional: export PDF quick function (light)
  const exportPDF = async (inv: any) => {
    try {
      const letterhead = Asset.fromModule(require("../../../assets/images/letterhead.png"));
      const html = `<html><body><h2>Invoice ${inv?.invoiceNumber ?? ""}</h2></body></html>`;
      const printRes = await (await import("expo-print")).printToFileAsync({ html });
      await (await import("expo-sharing")).shareAsync(printRes.uri);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to export PDF");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            

            <Text style={styles.title}>{isEdit ? "Edit Invoice" : "New Invoice"}</Text>

            <View style={{ width: 40 }} />
          </View>

          {/* Type */}
          <View style={styles.section}>
            <Text style={styles.label}>Invoice Type</Text>
            <View style={styles.toggleRow}>
              {(["sale", "purchase"] as const).map(t => {
                const active = type === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.toggleBtn, active && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                    onPress={() => setType(t)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.toggleText, active && { color: theme.card }]}>{t === "sale" ? "SALE" : "PURCHASE"}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Site & Title */}
          <View style={styles.section}>
            <Text style={styles.label}>Site Name / Location</Text>
            <TextInput
              style={styles.input}
              value={siteName}
              onChangeText={setSiteName}
              placeholder="e.g. Shirdi MIDC Project"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Invoice Title</Text>
            <TextInput
              style={styles.input}
              value={particular}
              onChangeText={setParticular}
              placeholder="e.g. JCB Rent - November 2025"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          {/* Party */}
          <View style={styles.section}>
            <Text style={styles.label}>Bill To *</Text>
            <TouchableOpacity style={styles.selector} onPress={() => setShowPartyModal(true)}>
              <Text style={selectedParty ? styles.selectorText : styles.placeholder}>
                {selectedParty?.name ?? "Select Party"}
              </Text>
              <IconSymbol name="chevron.down" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Items */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>Items</Text>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.accent }]} onPress={() => setShowItemModal(true)}>
                <Text style={styles.addText}>+ Add Item</Text>
              </TouchableOpacity>
            </View>

            {lineItems.map((item, index) => {
              const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
              return (
                <View key={index} style={styles.lineItemCard}>
                  <TextInput
                    placeholder="Particular"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.particularInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                    value={item.particular}
                    onChangeText={(v) => updateLineItem(index, "particular", v)}
                  />

                  <View style={styles.row}>
                    <TextInput
                      placeholder="Qty"
                      placeholderTextColor={theme.textSecondary}
                      value={item.quantity}
                      onChangeText={(v) => updateLineItem(index, "quantity", v)}
                      keyboardType="decimal-pad"
                      style={[styles.qtyInput, { backgroundColor: theme.bg }]}
                    />
                    <Text style={[styles.unitText, { color: theme.accent }]}>{item.unit}</Text>
                    <TextInput
                      placeholder="Rate"
                      placeholderTextColor={theme.textSecondary}
                      value={item.rate}
                      onChangeText={(v) => updateLineItem(index, "rate", v)}
                      keyboardType="decimal-pad"
                      style={[styles.rateInput, { backgroundColor: theme.bg }]}
                    />
                  </View>

                  <View style={styles.amountRow}>
                    <Text style={[styles.amountText, { color: theme.accent }]}>Amount: {formatCurrency(amount)}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <TouchableOpacity onPress={() => removeLineItem(index)} style={{ marginLeft: 12 }}>
                        <IconSymbol name="trash" size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Summary */}
          <View style={[styles.summaryCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{formatCurrency(calculateSubtotal())}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>CGST 9%</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{formatCurrency(calculateSubtotal() * 0.09)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>SGST 9%</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{formatCurrency(calculateSubtotal() * 0.09)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Discount</Text>
              <TextInput
                style={[styles.rightInput, { color: theme.text, borderBottomColor: theme.border }]}
                value={discount}
                onChangeText={setDiscount}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Round Off</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{formatCurrency(roundOff())}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>Net Amount</Text>
              <Text style={[styles.totalValue, { color: theme.accent }]}>{formatCurrency(calculateTotal())}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Paid Now</Text>
              <TextInput
                style={[styles.rightInput, { color: theme.text, borderBottomColor: theme.border }]}
                value={paidAmount}
                onChangeText={setPaidAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
              <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.accent }]}
              onPress={submit}
              disabled={mutation.isPending}
            >
              <Text style={[styles.saveText, { color: theme.card }]}>{mutation.isPending ? "Saving..." : isEdit ? "Update Invoice" : "Create Invoice"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Party Modal */}
        <Modal visible={showPartyModal} animationType="slide">
          <SafeAreaView style={[styles.modalSafe, { backgroundColor: theme.bg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
              <TouchableOpacity onPress={() => setShowPartyModal(false)}>
                <IconSymbol name="chevron.left" size={22} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Party</Text>
              <View style={{ width: 40 }} />
            </View>

            <TextInput
              style={[styles.searchInputModal, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              placeholder="Search party..."
              placeholderTextColor={theme.textSecondary}
              value={partySearch}
              onChangeText={setPartySearch}
            />

            <FlatList
              data={parties.filter((p: { name: string; }) => p.name.toLowerCase().includes(partySearch.toLowerCase()))}
              keyExtractor={(i: any) => i.id.toString()}
              renderItem={({ item }: any) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: theme.border, backgroundColor: theme.card }]}
                  onPress={() => {
                    setPartyId(item.id);
                    setShowPartyModal(false);
                    setPartySearch("");
                  }}
                >
                  <Text style={[styles.modalItemTitle, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.modalItemSub, { color: theme.textSecondary }]}>{item.gstin || "No GSTIN"}</Text>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </Modal>

        {/* Item Modal */}
        <Modal visible={showItemModal} animationType="slide">
          <SafeAreaView style={[styles.modalSafe, { backgroundColor: theme.bg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
              <TouchableOpacity onPress={() => setShowItemModal(false)}>
                <IconSymbol name="chevron.left" size={22} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Item</Text>
              <TouchableOpacity onPress={() => addLineItem()}>
                <Text style={[styles.manualAdd, { color: theme.accent }]}>+ Manual</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.searchInputModal, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              placeholder="Search items..."
              placeholderTextColor={theme.textSecondary}
              value={itemSearch}
              onChangeText={setItemSearch}
            />

            <FlatList
              data={items.filter((i: any) => i.name.toLowerCase().includes(itemSearch.toLowerCase()))}
              keyExtractor={(i: any) => i.id.toString()}
              renderItem={({ item }: any) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: theme.border, backgroundColor: theme.card }]}
                  onPress={() => addLineItem(item)}
                >
                  <Text style={[styles.modalItemTitle, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.modalItemSub, { color: theme.textSecondary }]}>
                    {formatCurrency(item.saleRate)} / {item.unit} • HSN: {item.hsnSac || "—"} • Stock: {item.currentStock ?? 0}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// -------------------- Styles (themed tokens applied) --------------------
const createStyles = (theme: any) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    container: { flex: 1, backgroundColor: theme.bg },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      },
    backBtn: { width: 40, alignItems: "flex-start" },
    title: { fontSize: 18, fontWeight: "800", color: theme.text },

    section: { paddingHorizontal: 16, marginTop: 18 },
    label: { fontSize: 14, fontWeight: "600", color: theme.text, marginBottom: 8 },

    toggleRow: { flexDirection: "row", gap: 12 },
    toggleBtn: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    toggleText: { fontWeight: "700", color: theme.text },
    input: {
      backgroundColor: theme.card,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      fontSize: 15,
      color: theme.text,
    },

    selector: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 14,
      borderRadius: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    selectorText: { color: theme.text, fontSize: 15 },
    placeholder: { color: theme.textSecondary, fontSize: 15 },

    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
    addText: { color: theme.card, fontWeight: "700" },

    lineItemCard: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    particularInput: { padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: theme.border },

    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    qtyInput: {
      width: 80,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      textAlign: "center",
      color: theme.text,
    },
    unitText: { fontWeight: "700" },
    rateInput: {
      flex: 1,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.text,
      textAlign: "center",
    },

    amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
    amountText: { fontWeight: "700" },

    summaryCard: {
      margin: 16,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
    },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 6 },
    summaryLabel: { fontSize: 14 },
    summaryValue: { fontSize: 14, fontWeight: "700" },

    totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 },
    totalLabel: { fontSize: 18, fontWeight: "800" },
    totalValue: { fontSize: 18, fontWeight: "800" },

    rightInput: { borderBottomWidth: 1, borderBottomColor: theme.border, width: 120, textAlign: "right", padding: 4 },

    actionRow: { flexDirection: "row", justifyContent: "flex-end", gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
    cancelBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
    cancelText: { fontWeight: "700" },
    saveBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    saveText: { fontWeight: "800", fontSize: 15 },

    // modal
    modalSafe: { flex: 1 },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderBottomWidth: 1 },
    modalTitle: { fontSize: 16, fontWeight: "800" },
    manualAdd: { fontWeight: "700" },
    searchInputModal: { margin: 12, padding: 12, borderRadius: 10, borderWidth: 1 },

    modalItem: { padding: 14, borderBottomWidth: 1 },
    modalItemTitle: { fontSize: 15, fontWeight: "700" },
    modalItemSub: { fontSize: 13, marginTop: 6 },
  });

