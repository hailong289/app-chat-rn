import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
} from "react-native";
import linkPreviewService, { LinkPreviewData } from "../../service/link-preview.service";

interface LinkPreviewProps {
  url: string;
  isMine?: boolean;
}

export default function LinkPreview({ url, isMine }: LinkPreviewProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [isFacebook, setIsFacebook] = useState(false);

  useEffect(() => {
    // Check for YouTube
    const yt = linkPreviewService.getYouTubeId(url);
    if (yt.id) {
      setYoutubeId(yt.id);
      setPreview({
        url,
        title: "YouTube Video",
        siteName: "YouTube",
        image: `https://img.youtube.com/vi/${yt.id}/hqdefault.jpg`,
      });
      return;
    }

    // Check for Facebook
    if (linkPreviewService.isFacebookVideo(url)) {
      setIsFacebook(true);
      setPreview({
        url,
        title: "Facebook Video",
        siteName: "Facebook",
      });
      return;
    }

    // Fetch preview
    let cancelled = false;
    setLoading(true);
    setError(false);

    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const data = await linkPreviewService.fetchPreview(url);
        if (!cancelled) {
          setPreview(data);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url]);

  const handleOpen = () => {
    Linking.openURL(url).catch(() => {});
  };

  if (loading) {
    return (
      <View className={`rounded-xl overflow-hidden mb-2 max-w-[85%] ${isMine ? "self-end" : "self-start"}`}>
        <View className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl">
          <ActivityIndicator size="small" color="#9CA3AF" />
        </View>
      </View>
    );
  }

  if (error && !preview) {
    return (
      <TouchableOpacity
        className={`rounded-xl overflow-hidden mb-2 max-w-[85%] ${isMine ? "self-end" : "self-start"}`}
        onPress={handleOpen}
      >
        <View className="bg-gray-100 dark:bg-gray-800 p-3 rounded-xl">
          <Text className="text-primary-500 text-sm underline" numberOfLines={2}>
            {url}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (!preview) return null;

  return (
    <TouchableOpacity
      className={`rounded-xl overflow-hidden mb-2 max-w-[85%] ${isMine ? "bg-white/20 self-end" : "bg-gray-100 dark:bg-gray-800 self-start"}`}
      onPress={handleOpen}
      activeOpacity={0.8}
    >
      {/* YouTube embed */}
      {youtubeId ? (
        <View>
          <View className="relative">
            <Image
              source={{ uri: preview.image }}
              className="w-full aspect-video"
              resizeMode="cover"
            />
            <View className="absolute inset-0 items-center justify-center">
              <View className="w-12 h-12 bg-red-600 rounded-full items-center justify-center">
                <Text className="text-white text-lg">▶</Text>
              </View>
            </View>
          </View>
          <View className="p-3">
            <Text className="text-xs text-red-500 font-medium mb-1">YouTube</Text>
            <Text className="text-sm text-gray-900 dark:text-white font-medium" numberOfLines={2}>
              {preview.title}
            </Text>
          </View>
        </View>
      ) : isFacebook ? (
        /* Facebook video */
        <View className="p-3">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 bg-blue-600 rounded-full items-center justify-center mr-2">
              <Text className="text-white text-xs font-bold">f</Text>
            </View>
            <Text className="text-sm font-medium text-gray-900 dark:text-white">
              Facebook Video
            </Text>
          </View>
          <Text className="text-xs text-primary-500">Xem trên Facebook →</Text>
        </View>
      ) : (
        /* Regular link preview */
        <View>
          {preview.image ? (
            <Image
              source={{ uri: preview.image }}
              className="w-full aspect-[2/1]"
              resizeMode="cover"
            />
          ) : null}
          <View className="p-3">
            {preview.siteName ? (
              <View className="flex-row items-center mb-1">
                {preview.favicon ? (
                  <Image source={{ uri: preview.favicon }} className="w-4 h-4 mr-1 rounded" />
                ) : null}
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {preview.siteName}
                </Text>
              </View>
            ) : null}
            {preview.title ? (
              <Text className="text-sm font-medium text-gray-900 dark:text-white" numberOfLines={2}>
                {preview.title}
              </Text>
            ) : null}
            {preview.description ? (
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1" numberOfLines={2}>
                {preview.description}
              </Text>
            ) : null}
            <Text className="text-xs text-primary-500 mt-1" numberOfLines={1}>
              {url}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}
