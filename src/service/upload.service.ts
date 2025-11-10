import { UploadSingleResp, UploadApiResponse } from "../types/upload.type.ts";
import apiService from "./api.service";

export type UploadMultipleItem = UploadSingleResp & { index?: number };
export type UploadMultipleResp =
  | { files: UploadMultipleItem[] } // trường hợp backend trả dạng mảng object
  | { urls: string[] } // hoặc chỉ trả mảng url
  | any; // fallback nếu schema khác

export default class UploadService {
  /**
   * Transform API response về format chuẩn
   * Xử lý MongoDB Long type và normalize fields
   */
  private static transformUploadResponse(
    apiResp: UploadApiResponse
  ): UploadSingleResp {
    const metadata = apiResp.metadata;

    // Convert MongoDB Long type về number
    let size: number | undefined;
    if (metadata.size) {
      if (typeof metadata.size === "number") {
        size = metadata.size;
      } else if (typeof metadata.size === "object" && "low" in metadata.size) {
        // MongoDB Long type: { low: number, high: number, unsigned: boolean }
        size = metadata.size.low;
      }
    }

    return {
      _id: metadata._id,
      url: metadata.url,
      kind: metadata.kind,
      name: metadata.name,
      size,
      mimeType: metadata.mimeType,
      status: metadata.status,
    };
  }
  // === BASIC APIs (cùng style với RoomService) ===

  static uploadSingle(file: File | Blob, folder = "avatar") {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);

    // ApiService đã tự set Content-Type + Authorization
    return apiService.post<UploadSingleResp>("/filesystem/upload-single", form);
  }

  static uploadMultiple(files: Array<File | Blob>, folder = "message") {
    const form = new FormData();
    for (const f of files) {
      form.append("files", f); // tên field: "files" khớp cURL của bạn
    }
    form.append("folder", folder);

    return apiService.post<UploadMultipleResp>(
      "/filesystem/upload-multiple",
      form
    );
  }

  // === ADVANCED (cần progress / cancel) ===
  // dùng thẳng axios instance để truyền onUploadProgress + signal

  static async uploadSingleWithProgress(
    file: File | Blob,
    options?: {
      roomId?: string;
      id?: string;
      onProgress?: (pct: number) => void;
      signal?: AbortSignal; // dùng AbortController để hủy
      endpoint?: string; // override nếu cần
    }
  ) {
    const form = new FormData();
    form.append("file", file);
    form.append("roomId", options?.roomId ?? "avatar");
    form.append("id", options?.id ?? "");

    console.log("📤 Uploading file:", {
      fileName: file instanceof File ? file.name : "blob",
      fileSize: file.size,
      roomId: options?.roomId,
      fileId: options?.id, // ← ID gửi lên server
    });

    const response = await apiService.axios.post<UploadApiResponse>(
      options?.endpoint ?? "/filesystem/upload-single-user",
      form,
      {
        signal: options?.signal,
        onUploadProgress: (e) => {
          if (e.total && options?.onProgress) {
            const pct = Math.round((e.loaded / e.total) * 100);
            options.onProgress(pct);
          }
        },
      }
    );

    console.log("📥 Raw API response:", response.data);
    console.log("🔍 Check ID consistency:", {
      sentId: options?.id,
      receivedId: response.data.metadata._id,
      match: options?.id === response.data.metadata._id,
    });

    // Transform response về format chuẩn
    const transformed = this.transformUploadResponse(response.data);
    console.log("🔄 Transformed:", transformed);

    return {
      ...response,
      data: transformed,
    };
  }

  /**
   * Upload nhiều file tuần tự (dễ hiển thị progress theo từng file).
   * onItemDone được gọi sau mỗi file.
   */
  static async uploadMultipleSequential(
    files: Array<File | Blob>,
    options?: {
      roomId?: string;
      id?: string | string[]; // Hỗ trợ ID riêng cho từng file hoặc ID chung
      onProgress?: (currentIndex: number, pct: number) => void;
      onItemDone?: (index: number, result: UploadSingleResp) => void;
      signal?: AbortSignal;
    }
  ) {
    const out: UploadSingleResp[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      // Lấy ID cho file hiện tại
      const fileId = Array.isArray(options?.id)
        ? options.id[i] ?? ""
        : options?.id ?? "";

      const { data } = await this.uploadSingleWithProgress(f, {
        roomId: options?.roomId ?? "avatar",
        id: fileId,
        signal: options?.signal,
        onProgress: (pct) => options?.onProgress?.(i, pct),
      });
      options?.onItemDone?.(i, data);
      out.push(data);
    }
    return out;
  }

  /**
   * Upload nhiều file song song (nhanh hơn, nhưng khó hiển thị progress tổng).
   * Có onEachProgress cho từng index.
   */
  static async uploadMultipleParallel(
    files: Array<File | Blob>,
    options?: {
      roomId?: string;
      id?: string | string[]; // Hỗ trợ ID riêng cho từng file hoặc ID chung
      onEachProgress?: (index: number, pct: number) => void;
      signal?: AbortSignal;
    }
  ) {
    const tasks = files.map((f, idx) => {
      // Lấy ID cho file hiện tại
      const fileId = Array.isArray(options?.id)
        ? options.id[idx] ?? ""
        : options?.id ?? "";

      return this.uploadSingleWithProgress(f, {
        roomId: options?.roomId ?? "avatar",
        id: fileId,
        signal: options?.signal,
        onProgress: (pct) => options?.onEachProgress?.(idx, pct),
      }).then((res) => res.data);
    });
    return Promise.all(tasks);
  }
}
