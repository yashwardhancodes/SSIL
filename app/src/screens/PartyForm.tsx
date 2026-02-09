// app/src/screens/PartyForm.tsx
import { useTheme } from "@/app/theme/ThemeContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { PartyService } from "../services/partyService";

export default function PartyForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const partyId = id ? Number(id) : undefined;
  const queryClient = useQueryClient();

  // ⭐ Global Theme
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [name, setName] = useState("");
  const [type, setType] = useState<"customer" | "supplier">("customer");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");

  const { data: party, isLoading: loadingParty } = useQuery({
    queryKey: ["party", partyId],
    queryFn: () => PartyService.getById(partyId!).then((r) => r.data),
    enabled: !!partyId,
  });

  useEffect(() => {
    if (party) {
      setName(party.name);
      setType(party.type);
      setContact(party.contact || "");
      setAddress(party.address || "");
      setGstin(party.gstin || "");
      setOpeningBalance(party.openingBalance?.toString() || "0");
    }
  }, [party]);

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (partyId) return PartyService.update(partyId, data).then((r) => r.data);
      return PartyService.create(data).then((r) => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      router.back();
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to save party"),
  });

  const submit = () => {
    if (!name.trim()) return Alert.alert("Required", "Party name is required");

    mutation.mutate({
      name: name.trim(),
      type,
      contact: contact.trim() || null,
      address: address.trim() || null,
      gstin: gstin.trim() || null,
      openingBalance: parseFloat(openingBalance) || 0,
      ...(partyId && { currentBalance: party?.currentBalance }),
    });
  };

  if (loadingParty) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView style={styles.formWrapper} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{partyId ? "Edit Party" : "Add New Party"}</Text>

        {/* Name */}
        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter party name"
          placeholderTextColor={theme.textSecondary}
          value={name}
          onChangeText={setName}
        />

        {/* Type */}
        <Text style={styles.label}>Type *</Text>
        <View style={styles.typeRow}>
          {(["customer", "supplier"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, type === t && styles.typeBtnActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact */}
        <Text style={styles.label}>Contact</Text>
        <TextInput
          style={styles.input}
          placeholder="Phone, email…"
          placeholderTextColor={theme.textSecondary}
          value={contact}
          onChangeText={setContact}
        />

        {/* Address */}
        <Text style={styles.label}>Address</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Full address"
          placeholderTextColor={theme.textSecondary}
          value={address}
          onChangeText={setAddress}
          multiline
        />

        {/* GSTIN */}
        <Text style={styles.label}>GSTIN</Text>
        <TextInput
          style={styles.input}
          placeholder="29ABCDE1234F1Z5"
          placeholderTextColor={theme.textSecondary}
          value={gstin}
          onChangeText={setGstin}
          autoCapitalize="characters"
        />

        {/* Opening Balance */}
        <Text style={styles.label}>Opening Balance (₹)</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor={theme.textSecondary}
          keyboardType="numeric"
          value={openingBalance}
          onChangeText={(v) => setOpeningBalance(v.replace(/[^0-9.]/g, ""))}
        />

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.saveBtn]}
            onPress={submit}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveText}>{partyId ? "Update" : "Create"}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────────
// THEME-AWARE PREMIUM STYLES
// ──────────────────────────────────────────────────────────────
const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    formWrapper: {
      paddingTop: 10,
    },
    center: {
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.text,
      marginHorizontal: 16,
      marginBottom: 20,
    },
    label: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.text,
      marginHorizontal: 16,
      marginBottom: 6,
    },
    input: {
      marginHorizontal: 16,
      padding: 14,
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      fontSize: 16,
      color: theme.text,
      marginBottom: 16,
    },
    multiline: {
      height: 90,
      textAlignVertical: "top",
    },
    typeRow: {
      flexDirection: "row",
      gap: 12,
      marginHorizontal: 16,
      marginBottom: 16,
    },
    typeBtn: {
      flex: 1,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      alignItems: "center",
    },
    typeBtnActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    typeText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.textSecondary,
    },
    typeTextActive: {
      color: "#fff",
      fontWeight: "700",
    },

    buttonRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginHorizontal: 16,
      gap: 12,
    },
    actionBtn: {
      paddingVertical: 14,
      paddingHorizontal: 22,
      borderRadius: 10,
    },
    cancelBtn: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cancelText: { color: theme.textSecondary, fontWeight: "600" },
    saveBtn: { backgroundColor: theme.accent },
    saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  });

