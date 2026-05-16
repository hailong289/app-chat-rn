import apiService from "./api.service";

export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

class LinkPreviewService {
  private static instance: LinkPreviewService;

  private constructor() {}

  static getInstance(): LinkPreviewService {
    if (!LinkPreviewService.instance) {
      LinkPreviewService.instance = new LinkPreviewService();
    }
    return LinkPreviewService.instance;
  }

  async fetchPreview(url: string): Promise<LinkPreviewData> {
    try {
      const response = await apiService.get<{
        success: boolean;
        data: LinkPreviewData;
      }>(`/gateway/preview-link?url=${encodeURIComponent(url)}`);

      if ((response.data as any).success && (response.data as any).data) {
        return (response.data as any).data;
      }

      return response.data as unknown as LinkPreviewData;
    } catch (error: unknown) {
      throw error;
    }
  }

  getYouTubeId(url: string): { id: string | null; start?: number } {
    try {
      const u = new URL(url);

      if (u.hostname.includes("youtu.be")) {
        const id = u.pathname.slice(1);
        const t = u.searchParams.get("t") || u.searchParams.get("start");
        return {
          id: id || null,
          start: t ? Number.parseInt(t) || undefined : undefined,
        };
      }

      if (u.hostname.includes("youtube.com")) {
        const id = u.searchParams.get("v");
        const t = u.searchParams.get("t") || u.searchParams.get("start");
        return {
          id: id || null,
          start: t ? Number.parseInt(t) || undefined : undefined,
        };
      }

      return { id: null };
    } catch {
      return { id: null };
    }
  }

  isFacebookVideo(url: string): boolean {
    try {
      const u = new URL(url);
      if (
        !u.hostname.includes("facebook.com") &&
        !u.hostname.includes("fb.watch")
      )
        return false;

      return (
        /\/(watch|reel|reels|videos)\//.test(u.pathname) ||
        u.hostname === "fb.watch"
      );
    } catch {
      return false;
    }
  }

  getFacebookEmbedUrl(url: string, width = 560): string {
    const href = encodeURIComponent(url);
    return `https://www.facebook.com/plugins/video.php?href=${href}&show_text=false&width=${width}&height=${Math.round((width * 9) / 16)}&allowfullscreen=true`;
  }
}

export default LinkPreviewService.getInstance();
