// app/(tabs)/index.tsx
// PREMIUM DASHBOARD — Global Theme Toggle (Header) + SafeArea + Reanimated

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "expo-router";
import React, { useMemo } from "react";
import {
  Alert,
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { InvoiceService } from "../src/services/invoiceService";
import { PartyService } from "../src/services/partyService";
import { PaymentService } from "../src/services/paymentService";
import { useTheme } from "../theme/ThemeContext";
// ------------------------- Types -------------------------
type Invoice = {
  id: string;
  type?: "sale" | "purchase";
  date?: string;
  createdAt?: string;
  grandTotal?: number;
  balance?: number | null;
};

type Party = {
  id: string;
  type?: "customer" | "supplier";
  currentBalance?: number | null;
};

type Payment = {
  id: string;
  date?: string;
  createdAt?: string;
  amount?: number;
};

// ------------------------- Helpers -------------------------
const ACCENT = "#ff6b00";
const SUCCESS = "#24C78C";

const formatCurrency = (v?: number | null) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(v ?? 0);

const isToday = (iso?: string) => {
  if (!iso) return false;
  try {
    return format(new Date(iso), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  } catch {
    return false;
  }
};

// ------------------------- Themed Styles -------------------------
const createStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },

    // Header - fixed layout
    appHeader: {
      backgroundColor: theme.card,
      paddingTop: Platform.OS === "ios" ? 44 : 44,
      paddingBottom: 14,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 },
    appLogo: { height: 44, width: 44, borderRadius: 8, resizeMode: "contain" },
    headerText: { marginLeft: 12, flexShrink: 1 },
    headerTitle: { fontSize: 16, fontWeight: "800", color: theme.text, includeFontPadding: false },
    headerSubtitle: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },

    headerRight: { flexDirection: "row", alignItems: "center", gap: 16, paddingLeft: 12 },

    section: { paddingHorizontal: 18, paddingTop: 18 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.text, marginBottom: 12 },

    overviewRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
    kpiCard: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 14,
      padding: 16,
      ...Platform.select({
        ios: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
        android: { elevation: 4 },
      }),
    },
    kpiTitle: { fontSize: 13, color: theme.textSecondary },
    kpiValue: { fontSize: 22, fontWeight: "800", color: theme.text, marginTop: 6 },
    kpiSub: { fontSize: 12, color: theme.textSecondary, marginTop: 6 },

    overviewRowSmall: { flexDirection: "row", gap: 12, marginTop: 8 },
    smallStat: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 14,
      ...Platform.select({
        ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6 },
        android: { elevation: 2 },
      }),
    },
    smallStatLabel: { fontSize: 12, color: theme.textSecondary },
    smallStatValue: { fontSize: 17, fontWeight: "700", color: theme.text, marginTop: 6 },

    warningBanner: {
      backgroundColor: theme.warningBg,
      borderWidth: 1,
      borderColor: theme.warningBorder,
      borderRadius: 12,
      padding: 14,
      marginTop: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    warningText: { color: theme.warningText, fontWeight: "700", marginLeft: 10, fontSize: 14 },

    actionsRow: { flexDirection: "row", gap: 12, marginTop: 8 },
    actionBtn: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      ...Platform.select({
        ios: { shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 8 },
        android: { elevation: 3 },
      }),
    },
    actionText: { marginTop: 8, fontSize: 13.5, color: theme.text, fontWeight: "700" },

    spacer: { height: 40 },
  });

// ------------------------- Small Components -------------------------
const KPI = ({ title, value, sub, styles }: any) => (
  <Animated.View entering={FadeInUp.duration(350)} style={styles.kpiCard}>
    <Text style={styles.kpiTitle}>{title}</Text>
    <Text style={styles.kpiValue}>{value}</Text>
    {sub && <Text style={styles.kpiSub}>{sub}</Text>}
  </Animated.View>
);

const SmallStat = ({ label, value, styles }: any) => (
  <Animated.View entering={FadeInUp.duration(450)} style={styles.smallStat}>
    <Text style={styles.smallStatLabel}>{label}</Text>
    <Text style={styles.smallStatValue}>{value}</Text>
  </Animated.View>
);

// Header with global toggle
function Header({ theme, styles, toggleTheme, isDark }: any) {
  return (
    <View style={styles.appHeader}>
      <View style={styles.headerLeft}>
        <Image source={require("../../assets/images/logo1.png")} style={styles.appLogo} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            SSIL INFRA SOLUTIONS LLP
          </Text>
          <Text style={styles.headerSubtitle}>GST Billing & Accounting</Text>
        </View>
      </View>

      <View style={styles.headerRight}>
        <TouchableOpacity onPress={toggleTheme} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <IconSymbol name={isDark ? "sun.max.fill" : "moon.fill"} size={26} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <IconSymbol name="person.crop.circle.fill" size={30} color={theme.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ------------------------- Main Screen -------------------------
export default function DashboardScreen() {
  // get global theme from ThemeContext
  const { theme, isDark, toggleTheme } = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  // Queries
  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: () => InvoiceService.getAll().then((r: any) => r.data),
  });

  const { data: parties = [] } = useQuery<Party[]>({
    queryKey: ["parties"],
    queryFn: () => PartyService.getAll().then((r: any) => r.data),
  });

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: () => PaymentService.getAll().then((r: any) => r.data),
  });

  // Calculations
  const totalSales = invoices.filter((i) => i.type === "sale").reduce((s, i) => s + (i.grandTotal ?? 0), 0);
  const totalPurchases = invoices.filter((i) => i.type === "purchase").reduce((s, i) => s + (i.grandTotal ?? 0), 0);
  const totalReceivable = parties.filter((p) => p.type === "customer").reduce((s, p) => s + Math.max(0, p.currentBalance ?? 0), 0);
  const totalPayable = parties.filter((p) => p.type === "supplier").reduce((s, p) => s + Math.abs(p.currentBalance ?? 0), 0);
  const todayPayments = payments.filter((p) => isToday(p.date ?? p.createdAt)).reduce((s, p) => s + (p.amount ?? 0), 0);

  const overdueInvoices = invoices.filter((i) => {
    const date = i.date ?? i.createdAt;
    if (!date || i.type !== "sale" || !(i.balance ?? 0)) return false;
    return new Date(date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  });

  const overdueTotal = overdueInvoices.reduce((s, i) => s + (i.balance ?? 0), 0);

  const pressOverdue = () => {
    Alert.alert(
      "Overdue Invoices",
      `${overdueInvoices.length} invoice${overdueInvoices.length > 1 ? "s" : ""} overdue\nTotal: ${formatCurrency(overdueTotal)}`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />


      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Overview</Text>

        <View style={styles.overviewRow}>
          <KPI title="Total Sales" value={formatCurrency(totalSales)} sub="All time" styles={styles} />
          <KPI title="Purchases" value={formatCurrency(totalPurchases)} sub="All time" styles={styles} />
        </View>

        <View style={styles.overviewRowSmall}>
          <SmallStat label="Receivable" value={formatCurrency(totalReceivable)} styles={styles} />
          <SmallStat label="Payable" value={formatCurrency(totalPayable)} styles={styles} />
          <SmallStat label="Today's Collection" value={formatCurrency(todayPayments)} styles={styles} />
        </View>

        {overdueInvoices.length > 0 && (
          <TouchableOpacity onPress={pressOverdue} style={styles.warningBanner}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <IconSymbol name="exclamationmark.triangle.fill" size={20} color={theme.warningText} />
              <Text style={styles.warningText}>
                {overdueInvoices.length} Overdue • {formatCurrency(overdueTotal)}
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color={theme.warningText} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionsRow}>
          <Link href="/src/screens/CreateInvoice" asChild>
            <TouchableOpacity style={styles.actionBtn}>
              <IconSymbol name="plus.circle.fill" size={28} color={ACCENT} />
              <Text style={styles.actionText}>New Invoice</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/payments/create" asChild>
            <TouchableOpacity style={styles.actionBtn}>
              <IconSymbol name="wallet.pass.fill" size={28} color={SUCCESS} />
              <Text style={styles.actionText}>Record Payment</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/parties" asChild>
            <TouchableOpacity style={styles.actionBtn}>
              <IconSymbol name="person.2.fill" size={26} color="#FFB020" />
              <Text style={styles.actionText}>Manage Parties</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      <View style={styles.spacer} />
    </SafeAreaView>
  );
}
