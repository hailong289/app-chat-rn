import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DatePicker from 'react-native-date-picker';

export function formatQuizDateTime(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function parseQuizDateTime(isoStr?: string | null): Date | null {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Mặc định: thời điểm hiện tại. */
export function getDefaultQuizStartTime(): Date {
  return new Date();
}

/** Mặc định: 1 giờ sau thời gian bắt đầu (hoặc hiện tại + 1h). */
export function getDefaultQuizEndTime(start?: Date | null): Date {
  const base = start ?? new Date();
  return new Date(base.getTime() + 60 * 60 * 1000);
}

type PickerStep = 'idle' | 'date' | 'time';

interface QuizDateTimeFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  compact?: boolean;
}

function mergeDatePart(datePart: Date, timeSource: Date): Date {
  const merged = new Date(datePart);
  merged.setHours(
    timeSource.getHours(),
    timeSource.getMinutes(),
    0,
    0,
  );
  return merged;
}

export default function QuizDateTimeField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  placeholder = 'Chọn ngày giờ',
  compact = false,
}: QuizDateTimeFieldProps) {
  const [step, setStep] = useState<PickerStep>('idle');
  const [draft, setDraft] = useState<Date>(() => value ?? minimumDate ?? new Date());

  const openPicker = useCallback(() => {
    setDraft(value ?? minimumDate ?? new Date());
    setStep('date');
  }, [value, minimumDate]);

  const closePicker = useCallback(() => {
    setStep('idle');
  }, []);

  const handleDateConfirm = useCallback(
    (pickedDate: Date) => {
      const timeSource = value ?? draft;
      setDraft(mergeDatePart(pickedDate, timeSource));
      setStep('time');
    },
    [value, draft],
  );

  const handleTimeConfirm = useCallback(
    (pickedTime: Date) => {
      const base = draft;
      const result = new Date(base);
      result.setHours(pickedTime.getHours(), pickedTime.getMinutes(), 0, 0);

      if (minimumDate && result < minimumDate) {
        result.setTime(minimumDate.getTime());
      }
      if (maximumDate && result > maximumDate) {
        result.setTime(maximumDate.getTime());
      }

      closePicker();
      onChange(result);
    },
    [draft, minimumDate, maximumDate, closePicker, onChange],
  );

  return (
    <View style={compact ? styles.compactWrap : styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.field}
        onPress={openPicker}
        activeOpacity={0.7}
      >
        <Text
          style={value ? styles.valueText : styles.placeholder}
          numberOfLines={compact ? 2 : 1}
        >
          {value ? formatQuizDateTime(value) : placeholder}
        </Text>
      </TouchableOpacity>
      {value && (
        <TouchableOpacity
          onPress={() => onChange(null)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.clearText}>Xóa</Text>
        </TouchableOpacity>
      )}

      {/* Bước 1: chọn ngày */}
      <DatePicker
        modal
        mode="date"
        open={step === 'date'}
        date={draft}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onConfirm={handleDateConfirm}
        onCancel={closePicker}
        locale="vi"
        title={`${label} — Chọn ngày`}
        confirmText="Tiếp"
        cancelText="Hủy"
      />

      {/* Bước 2: chọn giờ phút */}
      <DatePicker
        modal
        mode="time"
        open={step === 'time'}
        date={draft}
        onConfirm={handleTimeConfirm}
        onCancel={() => setStep('date')}
        locale="vi"
        title={`${label} — Chọn giờ`}
        confirmText="Xác nhận"
        cancelText="Quay lại"
        minuteInterval={1}
        is24hourSource="locale"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  compactWrap: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  field: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    minHeight: 44,
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 14,
    color: '#111827',
  },
  placeholder: {
    fontSize: 14,
    color: '#9ca3af',
  },
  clearText: {
    fontSize: 12,
    color: '#42A59F',
    marginTop: 4,
    fontWeight: '500',
  },
});
