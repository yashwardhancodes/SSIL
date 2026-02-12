import { useTheme } from "@/app/theme/ThemeContext";
import { IconSymbol } from "@/components/ui/icon-symbol";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfDay, format, isWithinInterval, startOfDay } from "date-fns";
import { File, Paths } from "expo-file-system"; // ← New API
import * as Print from "expo-print";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { Parser as Json2CsvParser } from "json2csv";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { InvoiceService } from "../services/invoiceService";
import { PartyService } from "../services/partyService";
import { PaymentService } from "../services/paymentService";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

export default function PaymentList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme } = useTheme();

  const [typeFilter, setTypeFilter] = React.useState<"All" | "IN" | "OUT">("All");
  const [modeFilter, setModeFilter] = React.useState<"All" | "CASH" | "UPI" | "BANK" | "CHEQUE">("All");
  const [sortFilter, setSortFilter] = React.useState<"LATEST" | "OLDEST" | "AMOUNT">("LATEST");
  const [refreshing, setRefreshing] = React.useState(false);

  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date());
  const [pick1, setPick1] = useState(false);
  const [pick2, setPick2] = useState(false);
  const [company, setCompany] = useState(false);
  const [companyId, setCompanyId] = useState<number | "All">("All");

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => PaymentService.getAll().then((r) => r.data),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => InvoiceService.getAll().then((r: any) => r.data),
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
    if (modeFilter !== "All") list = list.filter((p) => p.mode?.toUpperCase() === modeFilter);

    if (sortFilter === "LATEST")
      list.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
    else if (sortFilter === "OLDEST")
      list.sort((a, b) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());
    else if (sortFilter === "AMOUNT")
      list.sort((a, b) => b.amount - a.amount);

    return list;
  }, [payments, typeFilter, modeFilter, sortFilter]);

  const getLedgerData = (startId?: number | "All") => {
    const targetId = startId !== undefined ? startId : companyId;

    interface LedgerItem {
      date: Date;
      particulars: string;
      debit: number;
      credit: number;
      type: "PAYMENT" | "INVOICE";
    }

    const ledger: LedgerItem[] = [];

    //Payments
    const relevantPayments = payments.filter((p: any) => {
      const pDate = new Date(p.date || p.createdAt);
      const inRange = isWithinInterval(pDate, { start: startOfDay(start), end: endOfDay(end) });
      const partyMatch = targetId === "All" || p.partyId === targetId;
      return inRange && partyMatch;
    });

    relevantPayments.forEach((p: any) => {
      const isReceived = p.type === "in";
      ledger.push({
        date: new Date(p.date || p.createdAt),
        particulars: `${isReceived ? "By" : "To"} ${p.mode?.toUpperCase()} - ${p.note || "Payment"}`,
        debit: !isReceived ? p.amount : 0,
        credit: isReceived ? p.amount : 0,
        type: "PAYMENT",
      });
    });

    //  Invoices
    const relevantInvoices = invoices.filter((inv: any) => {
      const iDate = new Date(inv.date || inv.createdAt);
      const inRange = isWithinInterval(iDate, { start: startOfDay(start), end: endOfDay(end) });

      const invPartyId = inv.partyId || inv.party?.id;
      const partyMatch = targetId === "All" || invPartyId === targetId;
      return inRange && partyMatch;
    });

    relevantInvoices.forEach((inv: any) => {
      const isSale = (inv.type || "sale").toLowerCase() === "sale";
      ledger.push({
        date: new Date(inv.date || inv.createdAt),
        particulars: `${isSale ? "To" : "By"} Invoice No - ${inv.invoiceNumber}`,
        debit: isSale ? (inv.grandTotal || 0) : 0,
        credit: !isSale ? (inv.grandTotal || 0) : 0,
        type: "INVOICE",
      });
    });

    // Sort by Date
    ledger.sort((a, b) => a.date.getTime() - b.date.getTime());

    return ledger;
  };

  const askExport = (id: number | "All") => {
    Alert.alert("Export Ledger", "Choose format", [
      { text: "PDF (Recommended)", onPress: () => exportToPDF(id) },
      { text: "CSV (Excel)", onPress: () => exportToCSV(id) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const dateStuff = (event: any, selectedDate?: Date, type?: 'start' | 'end') => {
    if (type === 'start') {
      if (Platform.OS === 'android') setPick1(false);
      if (selectedDate) {
        setStart(selectedDate);
        if (Platform.OS === 'android') {
          setTimeout(() => setPick2(true), 100);
        } else {
          setPick1(false);
          setPick2(true);
        }
      } else {
        if (Platform.OS === 'ios') setPick1(false);
      }
    } else {
      if (Platform.OS === 'android') setPick2(false);
      if (selectedDate) {
        setEnd(selectedDate);
        if (Platform.OS === 'android') {
          setCompany(true);
        } else {
          setPick2(false);
          setCompany(true);
        }
      } else {
        if (Platform.OS === 'ios') setPick2(false);
      }
    }
  };

  const picked = (id: number | "All") => {
    setCompanyId(id);
    setCompany(false);
    setTimeout(() => askExport(id), 300);
  };

  // EXPORT CSV & SHARE IMMEDIATELY

  const exportToCSV = async (id: number | "All") => {
    try {
      const ledgerData = getLedgerData(id);
      if (ledgerData.length === 0) {
        Alert.alert("No Data", "No transactions found in the selected range.");
        return;
      }

      const fields = ["S.No", "Date", "Particulars", "Debit", "Credit"];
      const data = ledgerData.map((item, index) => ({
        "S.No": (index + 1).toString(),
        Date: format(item.date, "dd/MM/yyyy"),
        Particulars: item.particulars,
        Debit: item.debit > 0 ? item.debit.toFixed(2) : "",
        Credit: item.credit > 0 ? item.credit.toFixed(2) : "",
      }));

      // Add Total Row
      const totalDebit = ledgerData.reduce((sum, item) => sum + item.debit, 0);
      const totalCredit = ledgerData.reduce((sum, item) => sum + item.credit, 0);
      const balance = totalDebit - totalCredit;

      data.push({
        "S.No": "",
        Date: "",
        Particulars: "Total",
        Debit: totalDebit.toFixed(2),
        Credit: totalCredit.toFixed(2),
      });

      data.push({
        "S.No": "",
        Date: "",
        Particulars: "Balance",
        Debit: balance > 0 ? balance.toFixed(2) : "",
        Credit: balance < 0 ? Math.abs(balance).toFixed(2) : "",
      });

      const parser = new Json2CsvParser({ fields });
      const csvData = parser.parse(data);

      const exportPartyName = id === "All" ? "All Parties" : getPartyName(id as number);
      // Prepend Headers to match the image
      const headerString = `,,Name: ${exportPartyName}\n,,Period : ${format(start, "dd/MM/yyyy")} to ${format(end, "dd/MM/yyyy")}\n\n`;
      const finalCsv = headerString + csvData;

      const filename = `Ledger_${exportPartyName.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), "dd-MMM-yyyy_HHmm")}.csv`;


      const csvFile = new File(Paths.cache, filename);


      await csvFile.create();


      await csvFile.write(finalCsv);

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
  const exportToPDF = async (id: number | "All") => {
    try {
      const ledgerData = getLedgerData(id);
      if (ledgerData.length === 0) {
        Alert.alert("No Data", "No transactions found in the selected range.");
        return;
      }

      const totalDebit = ledgerData.reduce((sum, item) => sum + item.debit, 0);
      const totalCredit = ledgerData.reduce((sum, item) => sum + item.credit, 0);
      const balance = totalDebit - totalCredit;

      const rows = ledgerData
        .map(
          (item, index) => `
        <tr>
          <td style="padding: 12px 8px; text-align: center;">${index + 1}</td>
          <td style="padding: 12px 8px;">${format(item.date, "dd-MMM-yyyy")}</td>
          <td style="padding: 12px 8px;">${item.particulars}</td>
          <td style="padding: 12px 8px; text-align: right; color: #aa0000;">${item.debit > 0 ? formatCurrency(item.debit) : ""}</td>
          <td style="padding: 12px 8px; text-align: right; color: #00aa00;">${item.credit > 0 ? formatCurrency(item.credit) : ""}</td>
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
            .meta { color: #666; font-size: 14px; margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            th { background: ${theme.accent || "#0066ff"}; color: white; padding: 16px 8px; text-align: left; }
            td { border-bottom: 1px solid #eee; }
            .footer { margin-top: 40px; text-align: right; font-size: 18px; }
            .total-debit { color: #aa0000; font-weight: bold; }
            .total-credit { color: #00aa00; font-weight: bold; }
            .net { font-size: 22px; margin-top: 10px; color: #333; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Ledger Report</h1>
            <div class="meta" style="font-size: 18px; color: #333; font-weight: bold; margin-bottom: 8px;">${id === "All" ? "All Parties" : getPartyName(id as number)}</div>
             <div class="meta">Period: ${format(start, "dd MMM yyyy")} to ${format(end, "dd MMM yyyy")}</div>
            <div class="meta">Generated on ${format(new Date(), "dd MMMM yyyy 'at' hh:mm a")}</div>
          </div>
          <table>
            <thead><tr>
              <th style="width: 50px;">S.No</th>
              <th style="width: 120px;">Date</th>
              <th>Particulars</th>
              <th style="text-align: right;">Debit</th>
              <th style="text-align: right;">Credit</th>
            </tr></thead>
            <tbody>
              ${rows}
             <tr style="background-color: #f9f9f9; font-weight: bold;">
                <td colspan="3" style="padding: 12px 8px; text-align: right;">Total</td>
                <td style="padding: 12px 8px; text-align: right; color: #aa0000;">${formatCurrency(totalDebit)}</td>
                <td style="padding: 12px 8px; text-align: right; color: #00aa00;">${formatCurrency(totalCredit)}</td>
             </tr>
            </tbody>
          </table>
          <div class="footer">
            <div>Total Debit: <span class="total-debit">${formatCurrency(totalDebit)}</span></div>
            <div>Total Credit: <span class="total-credit">${formatCurrency(totalCredit)}</span></div>
            <div class="net">
              Closing Balance: <strong>${formatCurrency(Math.abs(balance))} ${balance >= 0 ? "(Receivable)" : "(Payable)"}</strong>
            </div>
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
        Alert.alert("Delete Payment", "This will reverse All balances. Continue?", [
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
        <TouchableOpacity style={styles.filterBtn} onPress={() => setTypeFilter(prev => prev === "All" ? "IN" : prev === "IN" ? "OUT" : "All")}>
          <Text style={styles.filterText}>{typeFilter === "All" ? "All" : typeFilter === "IN" ? "Received" : "Paid"}</Text>
          <IconSymbol name="chevron.down" size={16} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterBtn} onPress={() => setModeFilter(prev => prev === "All" ? "CASH" : prev === "CASH" ? "UPI" : prev === "UPI" ? "BANK" : prev === "BANK" ? "CHEQUE" : "All")}>
          <Text style={styles.filterText}>{modeFilter === "All" ? "Mode" : modeFilter}</Text>
          <IconSymbol name="chevron.down" size={16} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterBtn} onPress={() => setSortFilter(prev => prev === "LATEST" ? "OLDEST" : prev === "OLDEST" ? "AMOUNT" : "LATEST")}>
          <Text style={styles.filterText}>{sortFilter === "LATEST" ? "Latest" : sortFilter === "OLDEST" ? "Oldest" : "Amount"}</Text>
          <IconSymbol name="chevron.down" size={16} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: (theme.accent || "#0066ff") + "20" }]}
          onPress={() => setPick1(true)}
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
      <Modal
        visible={Platform.OS === 'ios' && (pick1 || pick2)}
        transparent={true}
        animationType="fade"
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setPick1(false); setPick2(false); }}
        >
          <View style={styles.pickerContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={styles.pickerTitle}>{pick1 ? "Select Start Date" : "Select End Date"}</Text>
              <TouchableOpacity onPress={() => { setPick1(false); setPick2(false); }}>
                <Text style={{ color: theme.accent || 'blue', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
            {pick1 && (
              <DateTimePicker
                value={start}
                mode="date"
                display="inline"
                onChange={(e, d) => dateStuff(e, d, 'start')}
                style={{ height: 300 }}
              />
            )}
            {pick2 && (
              <DateTimePicker
                value={end}
                mode="date"
                display="inline"
                onChange={(e, d) => dateStuff(e, d, 'end')}
                style={{ height: 300 }}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>


      {Platform.OS === 'android' && pick1 && (
        <DateTimePicker
          value={start}
          mode="date"
          display="default"
          onChange={(e, d) => dateStuff(e, d, 'start')}
        />
      )}
      {Platform.OS === 'android' && pick2 && (
        <DateTimePicker
          value={end}
          mode="date"
          display="default"
          onChange={(e, d) => dateStuff(e, d, 'end')}
        />
      )}

      {/* slect company*/}
      <Modal
        visible={company}
        transparent={true}
        animationType="fade"
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCompany(false)}
        >
          <View style={[styles.pickerContainer, { maxHeight: '80%' }]}>
            <Text style={styles.pickerTitle}>Select Party for Export</Text>

            <FlatList
              data={[{ id: "All", name: "All Parties" }, ...parties]}
              keyExtractor={(item) => (item.id === "All" ? "All" : item.id.toString())}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border || '#ff0000ff' }}
                  onPress={() => picked(item.id as number | "All")}
                >
                  <Text style={{ fontSize: 16, color: theme.text, fontWeight: companyId === item.id ? 'bold' : 'normal' }}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity onPress={() => setCompany(false)} style={{ marginTop: 16, alignSelf: 'center', padding: 10 }}>
              <Text style={{ color: theme.danger || 'red', fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  pickerContainer: { backgroundColor: 'white', padding: 20, borderRadius: 12, width: '90%' },
  pickerTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
});