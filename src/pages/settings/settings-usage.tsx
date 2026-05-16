/**
 * Thống kê AI — khớp app-chat-fe /settings/usage
 */
import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { aiService } from "../../service/ai.service";
import HeaderComponent from "../../components/headers/headers.component";

type GroupBy = "service" | "userId" | "day";

type ReportItem = {
  group: string;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  totalTokenInput: number;
  totalTokenOutput: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  uniqueUserCount: number;
};

const SERVICE_LABELS: Record<string, string> = {
  moderation: "Kiểm duyệt",
  "summary-document": "Tóm tắt tài liệu",
  translation: "Dịch thuật",
  "generate-quizz": "Tạo câu hỏi",
  "generate-flashcard": "Tạo flashcard",
  "speech-to-text": "Nhận dạng giọng nói",
  "suggest-replies": "Gợi ý trả lời",
};

const TIME_OPTIONS = [
  { key: "7", label: "7 ngày" },
  { key: "30", label: "30 ngày" },
  { key: "90", label: "3 tháng" },
  { key: "365", label: "1 năm" },
];

const GROUP_OPTIONS: { key: GroupBy; label: string }[] = [
  { key: "service", label: "Dịch vụ" },
  { key: "userId", label: "Người dùng" },
  { key: "day", label: "Ngày" },
];

function formatCost(usd: number) {
  if (usd < 0.001) return `~$${usd.toFixed(6)}`;
  return `$${usd.toFixed(4)}`;
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("vi-VN");
}

export default function SettingsUsagePage() {
  const navigation = useNavigation();
  const [report, setReport] = useState<ReportItem[]>([]);
  const [totalCalls, setTotalCalls] = useState(0);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>("service");
  const [timeRange, setTimeRange] = useState("7");

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <HeaderComponent
          title="Thống kê AI"
          leftIcon="arrow-left"
          onLeftPress={() => navigation.goBack()}
        />
      ),
    });
  }, [navigation]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - parseInt(timeRange, 10));
      const result = await aiService.getUsageReport({
        groupBy,
        from: from.toISOString(),
        to: now.toISOString(),
      });
      setReport(result.items || []);
      setTotalCalls(result.total || 0);
    } catch {
      setReport([]);
      setTotalCalls(0);
    } finally {
      setLoading(false);
    }
  }, [groupBy, timeRange]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const successTotal = report.reduce((s, r) => s + r.successCalls, 0);
  const errorTotal = report.reduce((s, r) => s + r.errorCalls, 0);
  const costTotal = report.reduce((s, r) => s + r.totalCostUsd, 0);

  const groupLabel = (item: ReportItem) => {
    if (groupBy === "service") {
      return SERVICE_LABELS[item.group] || item.group;
    }
    if (groupBy === "day") {
      return new Date(item.group).toLocaleDateString("vi-VN");
    }
    return item.group.length > 12
      ? `${item.group.slice(0, 12)}...`
      : item.group;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Thống kê sử dụng AI</Text>

      <Text style={styles.filterLabel}>Nhóm theo</Text>
      <View style={styles.chipRow}>
        {GROUP_OPTIONS.map((opt) => (
          <Chip
            key={opt.key}
            label={opt.label}
            active={groupBy === opt.key}
            onPress={() => setGroupBy(opt.key)}
          />
        ))}
      </View>

      <Text style={styles.filterLabel}>Khoảng thời gian</Text>
      <View style={styles.chipRow}>
        {TIME_OPTIONS.map((opt) => (
          <Chip
            key={opt.key}
            label={opt.label}
            active={timeRange === opt.key}
            onPress={() => setTimeRange(opt.key)}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.refreshBtn} onPress={fetchReport}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.refreshText}>Làm mới</Text>
        )}
      </TouchableOpacity>

      {!loading && (
        <View style={styles.statsRow}>
          <StatCard label="Tổng lượt" value={formatNumber(totalCalls)} />
          <StatCard label="Thành công" value={formatNumber(successTotal)} />
          <StatCard label="Thất bại" value={formatNumber(errorTotal)} />
          <StatCard label="Chi phí" value={formatCost(costTotal)} />
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#42A59F" />
      ) : report.length === 0 ? (
        <Text style={styles.empty}>
          Chưa có dữ liệu sử dụng AI trong khoảng thời gian này.
        </Text>
      ) : (
        report.map((item) => (
          <View key={item.group} style={styles.rowCard}>
            <Text style={styles.rowTitle}>{groupLabel(item)}</Text>
            <View style={styles.rowGrid}>
              <MiniStat label="Lượt gọi" value={formatNumber(item.totalCalls)} />
              <MiniStat label="OK" value={formatNumber(item.successCalls)} />
              <MiniStat label="Lỗi" value={formatNumber(item.errorCalls)} />
              <MiniStat label="Chi phí" value={formatCost(item.totalCostUsd)} />
              <MiniStat
                label="Độ trễ TB"
                value={`${item.avgLatencyMs.toFixed(0)}ms`}
              />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 16 },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
    marginTop: 8,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
  },
  chipActive: { backgroundColor: "#42A59F" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  chipTextActive: { color: "#fff" },
  refreshBtn: {
    backgroundColor: "#42A59F",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginVertical: 12,
  },
  refreshText: { color: "#fff", fontWeight: "600" },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  statValue: { fontSize: 20, fontWeight: "700", color: "#42A59F" },
  statLabel: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  loader: { marginTop: 24 },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 24 },
  rowCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  rowTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 10 },
  rowGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  miniStat: { width: "30%", minWidth: 90 },
  miniLabel: { fontSize: 11, color: "#9ca3af" },
  miniValue: { fontSize: 13, fontWeight: "600", color: "#374151", marginTop: 2 },
});
