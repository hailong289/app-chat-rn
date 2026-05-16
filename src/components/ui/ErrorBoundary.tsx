import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackName?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState((prev) => ({
      errorInfo,
      errorCount: prev.errorCount + 1,
    }));
    console.error(
      `[ErrorBoundary${this.props.fallbackName ? ` - ${this.props.fallbackName}` : ""}]`,
      error.message,
      errorInfo.componentStack?.slice(0, 300),
    );
    // Auto-reset after 5s if not too many crashes
    if (this.state.errorCount < 3) {
      this.resetTimer = setTimeout(() => this.handleReset(), 5000);
    }
  }

  componentWillUnmount() {
    if (this.resetTimer) clearTimeout(this.resetTimer);
  }

  handleReset = () => {
    if (this.resetTimer) clearTimeout(this.resetTimer);
    this.props.onReset?.();
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-white dark:bg-gray-900 items-center justify-center p-6">
          <Text className="text-5xl mb-4">⚠️</Text>
          <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Có lỗi xảy ra
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
            {this.props.fallbackName
              ? `Màn hình: ${this.props.fallbackName}`
              : "Vui lòng thử lại"}
          </Text>
          {this.state.error && this.state.errorCount >= 3 && (
            <ScrollView
              className="max-h-32 w-full bg-gray-100 dark:bg-gray-800 rounded-xl p-3 mb-4"
              horizontal
            >
              <Text className="text-xs text-red-500 font-mono">
                {this.state.error.message}
              </Text>
            </ScrollView>
          )}
          <TouchableOpacity
            className="px-8 py-3 bg-primary-500 rounded-xl"
            onPress={this.handleReset}
          >
            <Text className="text-white font-semibold text-base">Thử lại</Text>
          </TouchableOpacity>
          {this.state.errorCount >= 3 && (
            <Text className="text-xs text-gray-400 mt-3 text-center">
              Ứng dụng đã gặp lỗi nhiều lần.{"\n"}Vui lòng khởi động lại ứng dụng.
            </Text>
          )}
        </View>
      );
    }
    return this.props.children;
  }
}
