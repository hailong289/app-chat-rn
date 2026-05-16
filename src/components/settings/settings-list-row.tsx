import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import FontAwesome from "@react-native-vector-icons/fontawesome";

interface SettingsListRowProps {
  title: string;
  subtitle: string;
  onPress: () => void;
}

export default function SettingsListRow({
  title,
  subtitle,
  onPress,
}: SettingsListRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <FontAwesome name="chevron-right" size={14} color="#9ca3af" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  textWrap: { flex: 1, marginRight: 12 },
  title: { fontSize: 16, fontWeight: "600", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6b7280", marginTop: 4, lineHeight: 18 },
});
