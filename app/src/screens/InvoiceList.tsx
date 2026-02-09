// app/src/screens/InvoiceList.tsx
// PREMIUM InvoiceList — Drop-down Filter Bar (STYLE B) + Global Theme

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Asset } from "expo-asset";
import * as Print from "expo-print";
import { Link, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import Animated, { FadeInUp } from "react-native-reanimated";

import { useTheme } from "@/app/theme/ThemeContext";
import { InvoiceService } from "../services/invoiceService";

const formatCurrency = (v?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(v ?? 0);

export default function InvoiceList() {
  const { theme, isDark } = useTheme();
  const styles = makeStyles(theme);

  const router = useRouter();
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const [exportingId, setExportingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");

  // Dropdown filters
  const [typeFilter, setType] = useState<"All" | "Sale" | "Purchase">("All");
  const [statusFilter, setStatus] = useState<"All" | "Paid" | "Due">("All");
  const [dateFilter, setDateFilter] = useState<"All" | "Today" | "This Month">("All");
  const [sortBy, setSortBy] = useState<
    "DateDesc" | "DateAsc" | "AmountDesc" | "AmountAsc"
  >("DateDesc");

  const [activeDropdown, setActiveDropdown] = useState<
    "type" | "status" | "date" | "sort" | null
  >(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => InvoiceService.getAll().then((r: any) => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => InvoiceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: () => Alert.alert("Error", "Could not delete invoice"),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["invoices"] });
    setRefreshing(false);
  };

  // ----------------------- FILTER LOGIC -----------------------
  const matchesDateFilter = useCallback(
    (inv: any) => {
      if (dateFilter === "All") return true;
      const d = new Date(inv.date ?? inv.createdAt);
      const now = new Date();

      if (dateFilter === "Today")
        return format(d, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");

      if (dateFilter === "This Month")
        return format(d, "yyyy-MM") === format(now, "yyyy-MM");

      return true;
    },
    [dateFilter]
  );

  const matchesStatus = useCallback(
    (inv: any) => {
      const bal = Number(inv.balance ?? 0);
      if (statusFilter === "Paid") return bal === 0;
      if (statusFilter === "Due") return bal > 0;
      return true;
    },
    [statusFilter]
  );

  const filteredInvoices = useMemo(() => {
    let list = invoices.slice();

    if (typeFilter !== "All")
      list = list.filter((i: { type: string; }) => i.type === typeFilter.toLowerCase());

    list = list.filter(matchesDateFilter);
    list = list.filter(matchesStatus);

    // search
    const t = search.trim().toLowerCase();
    if (t)
      list = list.filter((i: { invoiceNumber: any; party: { name: any; }; siteName: any; }) => {
        const num = (i.invoiceNumber ?? "").toString().toLowerCase();
        const party = (i.party?.name ?? "").toLowerCase();
        const site = (i.siteName ?? "").toLowerCase();
        return num.includes(t) || party.includes(t) || site.includes(t);
      });

    // sorting
    list.sort((a: { grandTotal: any; date: any; createdAt: any; }, b: { grandTotal: any; date: any; createdAt: any; }) => {
      const aAmt = Number(a.grandTotal ?? 0);
      const bAmt = Number(b.grandTotal ?? 0);
      const aDate = new Date(a.date ?? a.createdAt).getTime();
      const bDate = new Date(b.date ?? b.createdAt).getTime();

      switch (sortBy) {
        case "AmountAsc":
          return aAmt - bAmt;
        case "AmountDesc":
          return bAmt - aAmt;
        case "DateAsc":
          return aDate - bDate;
        default:
        case "DateDesc":
          return bDate - aDate;
      }
    });

    return list;
  }, [invoices, search, typeFilter, statusFilter, dateFilter, sortBy]);

  // ----------------------- PDF EXPORT -----------------------
// ----------------------- PDF EXPORT (FULLY DYNAMIC) -----------------------
const exportPDF = async (invoice: any) => {
  setExportingId(invoice.id);

  try {
    const letterheadUri = Asset.fromModule(
      require("../../../assets/images/letterhead.png")
    ).uri;

    const invoiceDate = invoice.date
      ? format(new Date(invoice.date), "dd MMM yyyy").toUpperCase()
      : "NA";

    const safeGet = (val: any, fallback = "NA") =>
      val !== null && val !== undefined && val !== "" ? val : fallback;

    const invoiceNumber = safeGet(invoice.invoiceNumber, "SCXX");
    const siteName = safeGet(invoice.siteName, "NA");
    const particularTitle = safeGet(invoice.particular, "SERVICE CHARGES");

    // Party details (from invoice.party)
    const partyName = safeGet(invoice.party?.name, "M/s [Party Name]");
    const partyGST = safeGet(invoice.party?.gstin, "NA");
    const partyAddress = safeGet(invoice.party?.address, "NA");

    // Amounts & taxes – USE BACKEND VALUES ONLY
    const subTotal = Number(invoice.subTotal ?? 0);
    const cgstRate = Number(invoice.cgstRate ?? 0);
    const sgstRate = Number(invoice.sgstRate ?? 0);
    const igstRate = Number(invoice.igstRate ?? 0);
    const cgstAmount = Number(invoice.cgstAmount ?? 0);
    const sgstAmount = Number(invoice.sgstAmount ?? 0);
    const igstAmount = Number(invoice.igstAmount ?? 0);
    const discount = Number(invoice.discount ?? 0);
    const roundOff = Number(invoice.roundOff ?? 0);
    const grandTotal = Number(invoice.grandTotal ?? 0) || subTotal;
    const amountInWords = safeGet(
      invoice.amountInWords,
      ""
    ); // "One Hundred Forty One Thousand..." etc.

    const formatAmount = (n: number) =>
      n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    const formatQty = (q: number) =>
      q.toLocaleString("en-IN", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      });

    // Dynamic rows for ITEMS table
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const itemsRowsHtml =
      items.length > 0
        ? items
            .map((item: any, idx: number) => {
              const serial = idx + 1;
              const desc =
                item.particular ||
                item.description ||
                item.item?.name ||
                "Service Item";
              const hsn =
                item.hsnSac || item.item?.hsnSac || item.hsnCode || "-";
              const qty = Number(item.quantity ?? 0);
              const unit = item.unit || item.item?.unit || "-";
              const rate = Number(item.rate ?? 0);
              const amount = Number(item.amount ?? item.total ?? 0);

              return `
                <tr>
                  <td class="text-center">${serial}</td>
                  <td>${desc}</td>
                  <td class="text-center">${hsn}</td>
                  <td class="text-center">${formatQty(qty)}</td>
                  <td class="text-center">${unit}</td>
                  <td class="text-right">₹ ${formatAmount(rate)}</td>
                  <td class="text-right">₹ ${formatAmount(amount)}</td>
                </tr>
              `;
            })
            .join("")
        : `
          <tr>
            <td class="text-center">1</td>
            <td>No items</td>
            <td class="text-center">-</td>
            <td class="text-center">0.000</td>
            <td class="text-center">-</td>
            <td class="text-right">₹ 0.00</td>
            <td class="text-right">₹ 0.00</td>
          </tr>
        `;

    // Dynamic TAX + TOTAL rows
    const taxRowsHtml = `
      ${
        discount
          ? `
        <tr>
          <td>Discount</td>
          <td class="text-right">-</td>
          <td class="text-right">₹ ${formatAmount(discount)}</td>
        </tr>
      `
          : ""
      }
      <tr>
        <td>Sub Total</td>
        <td></td>
        <td class="text-right bold">₹ ${formatAmount(subTotal)}</td>
      </tr>
      ${
        cgstAmount
          ? `
        <tr>
          <td>Output CGST ${cgstRate}%</td>
          <td class="text-right">+</td>
          <td class="text-right">₹ ${formatAmount(cgstAmount)}</td>
        </tr>
      `
          : ""
      }
      ${
        sgstAmount
          ? `
        <tr>
          <td>Output SGST ${sgstRate}%</td>
          <td class="text-right">+</td>
          <td class="text-right">₹ ${formatAmount(sgstAmount)}</td>
        </tr>
      `
          : ""
      }
      ${
        igstAmount
          ? `
        <tr>
          <td>Output IGST ${igstRate}%</td>
          <td class="text-right">+</td>
          <td class="text-right">₹ ${formatAmount(igstAmount)}</td>
        </tr>
      `
          : ""
      }
      <tr>
        <td>Round Off</td>
        <td class="text-right">${roundOff >= 0 ? "+" : "-"}</td>
        <td class="text-right bold">₹ ${formatAmount(Math.abs(roundOff))}</td>
      </tr>
      <tr style="background:#fff2f2;">
        <td colspan="2" style="color:red; font-weight:bold;">Net Amount</td>
        <td class="text-right" style="color:red; font-weight:bold;">₹ ${formatAmount(
          grandTotal
        )}</td>
      </tr>
    `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 15mm;
            font-family: Arial, sans-serif;
            font-size: 11.5px;
            color: #000;
            height: 297mm;
            position: relative;
            box-sizing: border-box;
          }
          .container {
            width: 100%;
            height: 100%;
            position: relative;
          }
          table { width: 100%; border-collapse: collapse; }
          td, th { border: 1px solid #000; padding: 6px; vertical-align: top; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .title-row { border: 2px solid black; padding: 10px 8px; position: relative; margin-bottom: 8px; }
          .title { font-size: 18px; font-weight: bold; text-align: center; }
          .invoice-info { position: absolute; right: 12px; top: 8px; font-size: 11px; text-align: right; }
          .letterhead img { width: 100%; height: auto; display: block; margin-bottom: 8px; }
          .site-name { background: #f0f0f0; padding: 10px; text-align: center; font-weight: bold; font-size: 12.5px; border: 1px solid black; margin-bottom: 8px; }
          .particular-title { background: #333; color: white; padding: 8px; text-align: center; font-weight: bold; font-size: 13px; margin-bottom: 8px; }
          .bottom-box { display: table; width: 100%; border: 1px solid black; margin-top: 20px; font-size: 11.5px; }
          .bottom-row { display: table-row; }
          .col { display: table-cell; padding: 12px; vertical-align: top; }
          .col-left { width: 33%; border-right: 1px solid black; }
          .col-mid { width: 34%; border-right: 1px solid black; background: #f9f9f9; }
          .col-right { width: 33%; }

          .amount-words {
            margin-top: 10px;
            font-size: 11px;
            font-style: italic;
          }

          /* FOOTER FIXED AT BOTTOM */
          .footer-container {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            padding: 0 15mm;
            box-sizing: border-box;
          }
          .footer-line {
            height: 4px;
            background: #ff6200;
            margin-bottom: 6px;
          }
          .footer-text {
            text-align: center;
            font-size: 9px;
            color: #333;
            line-height: 1.4;
          }
          .page-no {
            text-align: center;
            font-size: 9px;
            color: #666;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">

          <!-- Letterhead -->
          <div class="letterhead">
            <img src="${letterheadUri}" alt="SSIL Infra Solutions LLP" />
          </div>

          <!-- Title + Invoice No + Date -->
          <div class="title-row">
            <div class="title">TAX INVOICE</div>
            <div class="invoice-info">
              <strong>Invoice No. :</strong> ${invoiceNumber}<br>
              <strong>Date :</strong> ${invoiceDate}<br>
              <strong>Type :</strong> ${(invoice.type || "").toString().toUpperCase()}
            </div>
          </div>

          <!-- Company & Buyer Details -->
          <table>
            <tr>
              <td width="50%">
                <strong>M/s. SSIL INFRA SOLUTIONS LLP</strong><br>
                <strong>GST No. 27AEOFS7925J1Z9</strong><br><br>
                GUT NO 477 POHEGOAN ROAD, SURVEY NO 680-1 POHEGOAN ROAD,<br>
                A/P DORHALE, (SHIRDI) TAL-RAHATA<br>
                Phone no.: 9156005005 Email: ssil.infra@gmail.com
              </td>
              <td width="50%">
                <strong>BUYER (Bill to) :</strong><br>
                <strong>NAME :</strong> ${partyName}<br>
                <strong>GST No. :</strong> ${partyGST}<br><br>
                <strong>ADDRESS :</strong> ${partyAddress}<br>
                <strong>State Name : MAHARASHTRA Code : 27</strong>
              </td>
            </tr>
          </table>

          <!-- Site Name -->
          <div class="site-name">
            Name of Site : ${siteName}
          </div>

          <!-- Particular Title -->
          <div class="particular-title">
            ${particularTitle}
          </div>

          <!-- Items Table -->
          <table>
            <thead style="background:#f0f0f0;">
              <tr>
                <th>S.No</th>
                <th>Particular</th>
                <th>HSN/SAC CODE</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml}
            </tbody>
          </table>

          <!-- Amount in words -->
          ${
            amountInWords
              ? `<div class="amount-words"><strong>Amount in words:</strong> ${amountInWords}</div>`
              : ""
          }

          <!-- Bottom 3-Column Box -->
          <div class="bottom-box">
            <div class="bottom-row">
              <div class="col col-left">
                Authorised Signatory for<br>
                <strong>SSIL INFRA SOLUTIONS LLP</strong>
              </div>
              <div class="col col-mid">
                <strong>Company's Bank Details :</strong><br>
                <strong>SSIL INFRA SOLUTIONS LLP</strong><br>
                Bank Name     : AXIS BANK<br>
                Account No.   : 921020053997609<br>
                IFSC No.      : UTIB0000663<br>
                Branch        : Shirdi
              </div>
              <div class="col col-right">
                <table width="100%" style="border:none;">
                  ${taxRowsHtml}
                </table>
              </div>
            </div>
          </div>

        </div>

        <!-- FIXED FOOTER AT BOTTOM -->
        <div class="footer-container">
          <div class="footer-line"></div>
          <div class="footer-text">
            SURVEY NO.680/1, GUT NO.477, POHEGAON ROAD, RAHATA, AHMEDNAGAR DORHALE, 423109<br>
            GST - 27AEOFS7925J1Z9 || Contact: 9156005005 || Email: ssil.infra@gmail.com
          </div>
          <div class="page-no">Page 1 of 1</div>
        </div>

      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });

    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Invoice ${invoiceNumber}`,
    });
  } catch (error) {
    console.error("PDF Error:", error);
    Alert.alert("Error", "Failed to generate PDF");
  } finally {
    setExportingId(null);
  }
};


  // Drop-down option list renderer
  const renderDropdown = (key: string, options: string[], setter: Function) => {
    if (activeDropdown !== key) return null;

    return (
      <Modal transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setActiveDropdown(null)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.dropdownSheet}>
          {options.map((opt) => {
            const active =
              opt ===
              (key === "type"
                ? typeFilter
                : key === "status"
                ? statusFilter
                : key === "date"
                ? dateFilter
                : sortBy);

            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.dropdownItem,
                  active && { backgroundColor: theme.accent },
                ]}
                onPress={() => {
                  setter(opt);
                  setActiveDropdown(null);
                }}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    active && { color: "#fff", fontWeight: "700" },
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    );
  };

  // ----------------------- RENDER -----------------------
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          placeholder="Search invoice, party or site..."
          placeholderTextColor={theme.textSecondary}
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Bar — Drop-down Style B */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() =>
            setActiveDropdown(activeDropdown === "type" ? null : "type")
          }
        >
          <Text style={styles.filterBtnText}>Type: {typeFilter}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() =>
            setActiveDropdown(activeDropdown === "status" ? null : "status")
          }
        >
          <Text style={styles.filterBtnText}>Status: {statusFilter}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() =>
            setActiveDropdown(activeDropdown === "date" ? null : "date")
          }
        >
          <Text style={styles.filterBtnText}>Date: {dateFilter}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() =>
            setActiveDropdown(activeDropdown === "sort" ? null : "sort")
          }
        >
          <Text style={styles.filterBtnText}>
            Sort:{" "}
            {{
              DateDesc: "Date ↓",
              DateAsc: "Date ↑",
              AmountDesc: "Amt ↓",
              AmountAsc: "Amt ↑",
            }[sortBy]}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Dropdown Sheets */}
      {renderDropdown("type", ["All", "Sale", "Purchase"], setType)}
      {renderDropdown("status", ["All", "Paid", "Due"], setStatus)}
      {renderDropdown("date", ["All", "Today", "This Month"], setDateFilter)}
      {renderDropdown(
        "sort",
        ["DateDesc", "DateAsc", "AmountDesc", "AmountAsc"],
        setSortBy
      )}

      {/* Add Button */}
      <View style={styles.addRow}>
        <Link href="/src/screens/CreateInvoice" asChild>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.accent }]}>
            <Text style={styles.addButtonText}>+ New Invoice</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* List */}
      {isLoading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredInvoices}
          keyExtractor={(i) => i.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>No invoices found</Text>}
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={() => (
                <TouchableOpacity
                  style={styles.swipeDelete}
                  onPress={() =>
                    Alert.alert("Delete?", "This cannot be undone.", [
                      { text: "Cancel" },
                      { text: "Delete", onPress: () => deleteMut.mutate(item.id), style: "destructive" },
                    ])
                  }
                >
                  <Text style={styles.swipeDeleteText}>Delete</Text>
                </TouchableOpacity>
              )}
            >
              <Animated.View entering={FadeInUp.duration(200)}>
                <View style={styles.card}>
                  <View style={styles.left}>
                    <Text style={styles.invoiceNo}>{item.invoiceNumber}</Text>
                    <Text style={styles.party}>{item.party?.name}</Text>
                    <Text style={styles.total}>{formatCurrency(item.grandTotal)}</Text>
                    <Text style={styles.date}>
                      {format(new Date(item.date ?? item.createdAt), "dd MMM yyyy")}
                    </Text>

                    {(item.balance ?? 0) === 0 ? (
                      <Text style={styles.statusPaid}>PAID</Text>
                    ) : (
                      <Text style={styles.statusDue}>
                        DUE {formatCurrency(item.balance)}
                      </Text>
                    )}
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity
                      onPress={() => router.push(`/src/screens/CreateInvoice?id=${item.id}`)}
                    >
                      <Text style={styles.edit}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => exportPDF(item)}>
                      <Text style={styles.export}>PDF</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            </Swipeable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ----------------------- STYLES -----------------------
const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },

    searchRow: { padding: 16 },
    searchInput: {
      backgroundColor: theme.card,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.text,
    },

    filterBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingTop: 4,
      paddingBottom: 6,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderColor: theme.border,
    },

    filterBtn: {
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    filterBtnText: {
      color: theme.text,
      fontWeight: "600",
      fontSize: 13,
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
    },

    dropdownSheet: {
      position: "absolute",
      top: 100,
      right: 10,
      width: 180,
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 6,
    },
    dropdownItem: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderColor: theme.border,
    },
    dropdownText: {
      color: theme.text,
      fontSize: 14,
    },

    addRow: { padding: 16 },
    addButton: {
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
    },
    addButtonText: { color: theme.text, fontWeight: "700" },

    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 14,
      marginHorizontal: 16,
      marginVertical: 8,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: "row",
      justifyContent: "space-between",
    },

    left: { flex: 1 },
    invoiceNo: { fontSize: 16, fontWeight: "700", color: theme.text },
    party: { color: theme.textSecondary, marginTop: 2 },
    total: { color: theme.accent, fontWeight: "700", marginTop: 6 },
    date: { color: theme.textSecondary, marginTop: 4, fontSize: 12 },
    statusPaid: { color: "#28a745", fontWeight: "700", marginTop: 8 },
    statusDue: { color: "#d33", fontWeight: "700", marginTop: 8 },

    actions: { alignItems: "flex-end", justifyContent: "space-between" },
    edit: { color: theme.accent, marginBottom: 12, fontWeight: "700" },
    export: { color: "#24C78C", fontWeight: "700" },

    swipeDelete: {
      backgroundColor: "#d33",
      justifyContent: "center",
      alignItems: "center",
      width: 80,
      marginVertical: 6,
      borderRadius: 10,
    },
    swipeDeleteText: { color: "#fff", fontWeight: "700" },

    empty: { textAlign: "center", padding: 40, color: theme.textSecondary },
  });
