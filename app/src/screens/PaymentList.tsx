import { useTheme } from "@/app/theme/ThemeContext";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { File, Paths } from "expo-file-system"; // ← New API
import * as Print from "expo-print";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { Parser as Json2CsvParser } from "json2csv";
import React, { useMemo } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { PartyService } from "../services/partyService";
import { PaymentService } from "../services/paymentService";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

export default function PaymentList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme } = useTheme();

  const [typeFilter, setTypeFilter] = React.useState<"ALL" | "IN" | "OUT">("ALL");
  const [modeFilter, setModeFilter] = React.useState<"ALL" | "CASH" | "UPI" | "BANK" | "CHEQUE">("ALL");
  const [sortFilter, setSortFilter] = React.useState<"LATEST" | "OLDEST" | "AMOUNT">("LATEST");
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => PaymentService.getAll().then((r) => r.data),
  });

  const { data: parties = [] } = useQuery({
    queryKey: ["parties"],
    queryFn: () => PartyService.getAll().then((r) => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => PaymentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["payments"] });
    await queryClient.invalidateQueries({ queryKey: ["parties"] });
    setRefreshing(false);
  };

  const getPartyName = (partyId: number) =>
    parties.find((p: any) => p.id === partyId)?.name || "Unknown Party";

  const filteredPayments = useMemo(() => {
    let list = [...payments];
    if (typeFilter === "IN") list = list.filter((p) => p.type === "in");
    if (typeFilter === "OUT") list = list.filter((p) => p.type === "out");
    if (modeFilter !== "ALL") list = list.filter((p) => p.mode?.toUpperCase() === modeFilter);

    if (sortFilter === "LATEST")
      list.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
    else if (sortFilter === "OLDEST")
      list.sort((a, b) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());
    else if (sortFilter === "AMOUNT")
      list.sort((a, b) => b.amount - a.amount);

    return list;
  }, [payments, typeFilter, modeFilter, sortFilter]);

  // EXPORT CSV & SHARE IMMEDIATELY
  

const exportToCSV = async () => {
  try {
    const fields = ["Date", "Party", "Type", "Amount", "Mode", "Invoice", "Note"];
    const data = filteredPayments.map((p) => ({
      Date: format(new Date(p.date || p.createdAt), "dd-MM-yyyy"),
      Party: getPartyName(p.partyId),
      Type: p.type === "in" ? "Received" : "Paid",
      Amount: formatCurrency(p.amount),
      Mode: p.mode?.toUpperCase() || "-",
      Invoice: p.invoice ? p.invoice.invoiceNumber : "-",
      Note: p.note || "-",
    }));

    const parser = new Json2CsvParser({ fields });
    const csv = parser.parse(data);

    const filename = `Ledger_${format(new Date(), "dd-MMM-yyyy_HHmm")}.csv`;
    
    // NEW API: Create File in cache directory
    const csvFile = new File(Paths.cache, filename);
    
    // Create file if it doesn't exist
    await csvFile.create();
    
    // Write the CSV string (replaces writeAsStringAsync)
    await csvFile.write(csv);

    // Get the file URI for sharing
    const fileUri = csvFile.uri;

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Share Ledger CSV",
        UTI: "public.comma-separated-values-text",
      });
    } else {
      Alert.alert("Success", `CSV saved to cache:\n${fileUri}`);
    }
  } catch (err: any) {
    console.error("CSV Export Error:", err);
    Alert.alert("Export Failed", err.message || "Unknown error occurred");
  }
};

  // EXPORT PDF & SHARE IMMEDIATELY
  const exportToPDF = async () => {
    try {
      const totalIn = payments.filter((p: any) => p.type === "in").reduce((a: number, b: any) => a + b.amount, 0);
      const totalOut = payments.filter((p: any) => p.type === "out").reduce((a: number, b: any) => a + b.amount, 0);

      const rows = filteredPayments
        .map(
          (p) => `
        <tr>
          <td style="padding: 12px 8px; text-align: left;">${format(new Date(p.date || p.createdAt), "dd MMM yyyy")}</td>
          <td style="padding: 12px 8px;">${getPartyName(p.partyId)}</td>
          <td style="padding: 12px 8px; text-align: center;">${p.type === "in" ? "RECEIVED" : "PAID"}</td>
          <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: ${p.type === "in" ? "#00aa00" : "#aa0000"};">
            ${p.type === "in" ? "+" : "-"} ${formatCurrency(p.amount)}
          </td>
          <td style="padding: 12px 8px; text-align: center;">${p.mode?.toUpperCase() || "-"}</td>
          <td style="padding: 12px 8px; text-align: center;">${p.invoice ? p.invoice.invoiceNumber : "-"}</td>
        </tr>`
        )
        .join("");

      const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; color: #333; margin: 0; }
            .header { text-align: center; margin-bottom: 30px; }
            h1 { margin: 0; color: #1a1a1a; font-size: 24px; }
            .meta { color: #666; font-size: 14px; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            th { background: ${theme.accent || "#0066ff"}; color: white; padding: 16px 8px; text-align: left; }
            td { border-bottom: 1px solid #eee; }
            .footer { margin-top: 40px; text-align: right; font-size: 18px; }
            .total-in { color: #00aa00; font-weight: bold; }
            .total-out { color: #aa0000; font-weight: bold; }
            .net { font-size: 22px; margin-top: 10px; color: #333; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Ledger Report</h1>
            <div class="meta">Generated on ${format(new Date(), "dd MMMM yyyy 'at' hh:mm a")}</div>
            <div class="meta">Filter: ${typeFilter === "ALL" ? "All" : typeFilter === "IN" ? "Received" : "Paid"} | Mode: ${modeFilter} | Sort: ${sortFilter === "LATEST" ? "Latest First" : sortFilter === "OLDEST" ? "Oldest First" : "By Amount"}</div>
          </div>
          <table>
            <thead><tr>
              <th>Date</th><th>Party</th><th>Type</th><th>Amount</th><th>Mode</th><th>Invoice</th>
            </tr></thead>
            <tbody>${rows || "<tr><td colspan='6' style='text-align:center; padding:60px; color:#999;'>No payments found</td></tr>"}</tbody>
          </table>
          <div class="footer">
            <div>Total Received: <span class="total-in">+ ${formatCurrency(totalIn)}</span></div>
            <div>Total Paid: <span class="total-out">- ${formatCurrency(totalOut)}</span></div>
            <div class="net">Net Balance: <strong>${formatCurrency(totalIn - totalOut)}</strong></div>
          </div>
        </body>
      </html>`;

      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share Ledger PDF",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF Ready", "File saved temporarily:\n" + uri);
      }
    } catch (err: any) {
      Alert.alert("Error", "Failed to generate PDF: " + err.message);
    }
  };

  const renderRightActions = (id: number) => (
    <TouchableOpacity
      style={[styles.swipeDelete, { backgroundColor: theme.danger || "#ff4444" }]}
      onPress={() =>
        Alert.alert("Delete Payment", "This will reverse all balances. Continue?", [
          { text: "Cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteMut.mutate(id) },
        ])
      }
    >
      <Text style={styles.swipeDeleteText}>Delete</Text>
    </TouchableOpacity>
  );

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setTypeFilter(prev => prev === "ALL" ? "IN" : prev === "IN" ? "OUT" : "ALL")}>
          <Text style={styles.filterText}>{typeFilter === "ALL" ? "All" : typeFilter === "IN" ? "Received" : "Paid"}</Text>
          <IconSymbol name="chevron.down" size={16} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterBtn} onPress={() => setModeFilter(prev => prev === "ALL" ? "CASH" : prev === "CASH" ? "UPI" : prev === "UPI" ? "BANK" : prev === "BANK" ? "CHEQUE" : "ALL")}>
          <Text style={styles.filterText}>{modeFilter === "ALL" ? "Mode" : modeFilter}</Text>
          <IconSymbol name="chevron.down" size={16} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterBtn} onPress={() => setSortFilter(prev => prev === "LATEST" ? "OLDEST" : prev === "OLDEST" ? "AMOUNT" : "LATEST")}>
          <Text style={styles.filterText}>{sortFilter === "LATEST" ? "Latest" : sortFilter === "OLDEST" ? "Oldest" : "Amount"}</Text>
          <IconSymbol name="chevron.down" size={16} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: (theme.accent || "#0066ff") + "20" }]}
          onPress={() =>
            Alert.alert("Export Ledger", "Choose format", [
              { text: "PDF (Recommended)", onPress: exportToPDF },
              { text: "CSV (Excel)", onPress: exportToCSV },
              { text: "Cancel", style: "cancel" },
            ])
          }
        >
          <IconSymbol name="arrow.down.circle.fill" size={18} color={theme.accent || "#0066ff"} />
          <Text style={[styles.filterText, { color: theme.accent || "#0066ff" }]}>Export</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={() => router.push("/(tabs)/payments/create")}>
        <Text style={styles.addButtonText}>+ Record Payment</Text>
      </TouchableOpacity>

      <FlatList
        data={filteredPayments}
        keyExtractor={(i) => i.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No payments found</Text>}
        renderItem={({ item }) => {
          const isIn = item.type === "in";
          return (
            <Swipeable renderRightActions={() => renderRightActions(item.id)}>
              <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/payments/edit?id=${item.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.party}>{getPartyName(item.partyId)}</Text>
                  <Text style={[styles.amount, isIn ? styles.in : styles.out]}>
                    {isIn ? "+ " : "- "} {formatCurrency(item.amount)}
                  </Text>
                  <Text style={styles.mode}>{item.mode?.toUpperCase() || "-"}</Text>
                  {item.invoice && <Text style={styles.invoiceLink}>Invoice {item.invoice.invoiceNumber}</Text>}
                  <Text style={styles.date}>{format(new Date(item.date || item.createdAt), "dd MMM yyyy")}</Text>
                  {item.note && <Text style={styles.note}>{item.note}</Text>}
                </View>
                <View style={styles.right}>
                  <Text style={[styles.status, isIn ? styles.in : styles.out]}>
                    {isIn ? "RECEIVED" : "PAID"}
                  </Text>
                  <IconSymbol name="chevron.right" size={22} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>
            </Swipeable>
          );
        }}
      />
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  filterBar: { flexDirection: "row", gap: 10, padding: 12, marginHorizontal: 12, flexWrap: "wrap" },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.card, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.border },
  filterText: { color: theme.text, fontWeight: "600" },
  addButton: { marginHorizontal: 16, marginTop: 4, padding: 16, backgroundColor: theme.accent || "##f27a26", borderRadius: 12, marginBottom: 12 },
  addButtonText: { color: "#fff", textAlign: "center", fontWeight: "700", fontSize: 16 },
  card: { backgroundColor: theme.card, marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: theme.border, flexDirection: "row", justifyContent: "space-between", elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  party: { fontSize: 16, fontWeight: "700", color: theme.text },
  amount: { fontSize: 18, fontWeight: "800", marginVertical: 6 },
  in: { color: theme.success || "#00aa00" },
  out: { color: theme.danger || "#aa0000" },
  mode: { color: theme.accent || "#0066ff", fontWeight: "600" },
  invoiceLink: { color: theme.accent || "#0066ff", fontSize: 13, marginTop: 4 },
  date: { color: theme.textSecondary || "#888", fontSize: 12, marginTop: 4 },
  note: { color: theme.textSecondary || "#888", fontSize: 13, marginTop: 6 },
  right: { alignItems: "flex-end", justifyContent: "center" },
  status: { fontWeight: "700", fontSize: 13 },
  swipeDelete: { justifyContent: "center", alignItems: "center", width: 80, borderRadius: 12, marginVertical: 8, marginRight: 16 },
  swipeDeleteText: { color: "#fff", fontWeight: "700" },
  empty: { padding: 40, textAlign: "center", color: theme.textSecondary || "#888", fontSize: 16 },
});