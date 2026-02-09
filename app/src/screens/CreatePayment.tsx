import { IconSymbol } from "@/components/ui/icon-symbol";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// Services
import { InvoiceService } from "../services/invoiceService";
import { PartyService } from "../services/partyService";
import { PaymentService } from "../services/paymentService";

// ⭐ Global Theme
import { useTheme } from "@/app/theme/ThemeContext";

export default function CreatePayment({ paymentId }: { paymentId?: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, isDark } = useTheme();

  const [type, setType] = useState<"in" | "out">("in");
  const [partyId, setPartyId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("cash");
  const [note, setNote] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const [showPartyModal, setShowPartyModal] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  // -----------------------------------------------------
  // REFRESH HANDLING
  // -----------------------------------------------------
  const onRefresh = async () => {
    setRefreshing(true);

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["parties"] }),
      queryClient.invalidateQueries({ queryKey: ["invoices"] }),
      queryClient.invalidateQueries({ queryKey: ["unpaid-invoices"] }),
      paymentId
        ? queryClient.invalidateQueries({ queryKey: ["payment", paymentId] })
        : null,
    ]);

    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      onRefresh();
    }, [])
  );

  // -----------------------------------------------------
  // QUERIES
  // -----------------------------------------------------
  const { data: parties = [] } = useQuery({
    queryKey: ["parties"],
    queryFn: () => PartyService.getAll().then((r) => r.data),
  });

  const { data: unpaidInvoices = [] } = useQuery({
    queryKey: ["unpaid-invoices", partyId],
    queryFn: () =>
      InvoiceService.getAll().then((r) =>
        r.data.filter(
          (inv: any) => inv.partyId === partyId && inv.balance > 0
        )
      ),
    enabled: !!partyId,
  });

  const { data: existingPayment } = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: () => PaymentService.getById(paymentId!).then((r) => r.data),
    enabled: !!paymentId,
  });

  useEffect(() => {
    if (existingPayment) {
      setType(existingPayment.type);
      setPartyId(existingPayment.partyId);
      setAmount(existingPayment.amount.toString());
      setMode(existingPayment.mode || "cash");
      setNote(existingPayment.note || "");
      setSelectedInvoice(existingPayment.invoice || null);
    }
  }, [existingPayment]);

  // -----------------------------------------------------
  // VALIDATION
  // -----------------------------------------------------
  const validateAmount = (value: string) => {
    if (selectedInvoice) {
      const due = Number(selectedInvoice.balance);
      const entered = Number(value);

      if (entered > due) {
        Alert.alert(
          "Invalid Amount",
          `Amount cannot exceed invoice due (₹${due.toFixed(2)})`
        );
        return;
      }
    }
    setAmount(value);
  };

  const selectedParty = parties.find((p: any) => p.id === partyId);

  // -----------------------------------------------------
  // SUBMIT
  // -----------------------------------------------------
  const mutation = useMutation({
    mutationFn: paymentId
      ? (data: any) => PaymentService.update(paymentId, data)
      : (data: any) => PaymentService.create(data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });

      Alert.alert(
        "Success",
        paymentId ? "Payment updated!" : "Payment recorded!"
      );

      router.back();
    },
  });

  const submit = () => {
    if (!partyId || !amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please select a party and enter valid amount");
      return;
    }

    mutation.mutate({
      type,
      partyId,
      amount: parseFloat(amount),
      mode,
      note,
      invoiceId: selectedInvoice?.id || null,
    });
  };

  useEffect(() => {
    if (type === "out") {
      setSelectedInvoice(null);
    }
  }, [type]);

  // -----------------------------------------------------
  // RENDER UI
  // -----------------------------------------------------
  return (
  <KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === "ios" ? "padding" : undefined}
>
  <ScrollView
    style={styles.container}
    contentContainerStyle={{
      flexGrow: 1,
      padding: 16,
      paddingBottom: 140,
    }}
    keyboardShouldPersistTaps="handled"
    refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    }
  >
      {/* TYPE SWITCH */}
      <View style={styles.toggleRow}>
        {(["in", "out"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.toggleBtn, type === t && styles.toggleActive]}
            onPress={() => setType(t)}
          >
            <Text
              style={[
                styles.toggleText,
                type === t && styles.toggleTextActive,
              ]}
            >
              {t === "in" ? "RECEIVED" : "PAID"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* PARTY */}
      <Text style={styles.label}>Party</Text>

      <TouchableOpacity
        style={styles.selector}
        onPress={() => setShowPartyModal(true)}
      >
        <Text
          style={selectedParty ? styles.selectorText : styles.placeholder}
        >
          {selectedParty?.name || "Select party..."}
        </Text>
        <IconSymbol name="chevron.down" size={20} color={theme.textSecondary} />
      </TouchableOpacity>

      {selectedParty && (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryMain}>
            Balance: ₹{Number(selectedParty.currentBalance ?? 0).toFixed(2)}
          </Text>
          <Text style={styles.summarySub}>
            Unpaid Invoices: {unpaidInvoices.length}
          </Text>
          <Text style={styles.summarySub}>
            Total Due: ₹
            {unpaidInvoices
              .reduce((sum: number, inv: any) => sum + (inv.balance ?? 0), 0)
              .toFixed(2)}
          </Text>
        </View>
      )}

      {/* AMOUNT */}
      <Text style={styles.label}>Amount (₹)</Text>

      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={validateAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor={theme.textSecondary}
      />

      {/* INVOICE LINK */}
      {type === "in" && (
        <>
          <Text style={styles.label}>Link to Invoice (Optional)</Text>

          <TouchableOpacity
            style={[
              styles.selector,
              unpaidInvoices.length === 0 && { opacity: 0.5 },
            ]}
            disabled={unpaidInvoices.length === 0}
            onPress={() => setShowInvoiceModal(true)}
          >
            <Text
              style={
                selectedInvoice ? styles.selectorText : styles.placeholder
              }
            >
              {selectedInvoice
                ? `${selectedInvoice.invoiceNumber} – Due ₹${Number(
                    selectedInvoice.balance ?? 0
                  ).toFixed(2)}`
                : "Select invoice..."}
            </Text>
            <IconSymbol name="chevron.down" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </>
      )}

      {/* MODE */}
      <Text style={styles.label}>Payment Mode</Text>

      <View style={styles.toggleRow}>
        {["cash", "bank", "upi"].map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeBtn, mode === m && styles.toggleActive]}
            onPress={() => setMode(m)}
          >
            <Text
              style={[
                styles.modeText,
                mode === m && styles.toggleTextActive,
              ]}
            >
              {m.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* NOTE */}
      <Text style={styles.label}>Note (Optional)</Text>

      <TextInput
        style={[styles.input, { height: 90 }]}
        value={note}
        onChangeText={setNote}
        multiline
        placeholder="e.g. Payment for Invoice 019"
        placeholderTextColor={theme.textSecondary}
      />

      {/* ACTIONS */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={submit}
          disabled={mutation.isPending}
        >
          <Text style={styles.saveText}>
            {mutation.isPending ? "Saving..." : "Save Payment"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* PARTY MODAL */}
      <Modal visible={showPartyModal} animationType="slide">
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowPartyModal(false)}>
            <IconSymbol name="chevron.left" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Party</Text>
          <View style={{ width: 40 }} />
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search party..."
          value={partySearch}
          onChangeText={setPartySearch}
          placeholderTextColor={theme.textSecondary}
        />

        <FlatList
          data={parties.filter((p: any) =>
            p.name.toLowerCase().includes(partySearch.toLowerCase())
          )}
          keyExtractor={(i) => i.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                setPartyId(item.id);
                setSelectedInvoice(null);
                setShowPartyModal(false);
                setPartySearch("");
              }}
            >
              <Text style={styles.modalItemText}>{item.name}</Text>
              <Text style={styles.modalSubText}>
                {item.type} • Balance: ₹{(item.currentBalance ?? 0).toFixed(2)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </Modal>

      {/* INVOICE MODAL */}
      <Modal visible={showInvoiceModal} animationType="slide">
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowInvoiceModal(false)}>
            <IconSymbol name="chevron.left" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Invoice</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={unpaidInvoices}
          keyExtractor={(i) => i.id.toString()}
          ListEmptyComponent={
            <Text style={styles.empty}>No unpaid invoices</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                setSelectedInvoice(item);
                setShowInvoiceModal(false);
              }}
            >
              <Text style={styles.modalItemText}>
                {item.invoiceNumber} • ₹{Number(item.grandTotal).toFixed(2)}
              </Text>
              <Text style={styles.modalSubText}>
                Due: ₹{(item.balance ?? 0).toFixed(2)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </Modal>
    </ScrollView>
    </KeyboardAvoidingView>

  );
}

// -----------------------------------------------------
// STYLES — THEMED FOR PREMIUM LOOK
// -----------------------------------------------------
const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
      padding: 16,
    },

    // Labels
    label: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
      marginTop: 18,
      marginBottom: 6,
    },

    // Toggle Buttons (Type + Mode)
    toggleRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 12,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
    },
    toggleActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    toggleText: {
      fontWeight: "700",
      fontSize: 15,
      color: theme.text,
    },
    toggleTextActive: {
      color: "#fff",
    },

    // Input
    input: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      borderRadius: 12,
      fontSize: 16,
      color: theme.text,
    },

    // Selectors
    selector: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    selectorText: { fontSize: 16, color: theme.text, fontWeight: "600" },
    placeholder: { fontSize: 16, color: theme.textSecondary },

    // Summary Box
    summaryBox: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginTop: 10,
      ...theme.shadow,
    },
    summaryMain: { fontSize: 16, fontWeight: "700", color: theme.text },
    summarySub: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },

    // Buttons
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 30,
      gap: 16,
    },
    cancelBtn: {
      paddingVertical: 14,
      paddingHorizontal: 24,
    },
    cancelText: {
      color: theme.textSecondary,
      fontWeight: "700",
      fontSize: 15,
    },
    saveBtn: {
      backgroundColor: theme.accent,
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 12,
    },
    saveText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 16,
    },
    scroll: {
    flexGrow: 1
}
,

    // Modal
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderColor: theme.border,
    },
    modalTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
    },

    searchInput: {
      margin: 16,
      padding: 14,
      borderRadius: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.text,
      fontSize: 16,
    },

    modalItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderColor: theme.border,
    },
    modalItemText: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
    },
    modalSubText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 4,
    },

    empty: {
      textAlign: "center",
      marginTop: 40,
      color: theme.textSecondary,
      fontSize: 16,
    },

    // Mode small button
    modeBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
    },
    modeText: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.text,
    },
  });
