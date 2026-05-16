import apiService from "./api.service";
import { Document, CreateDocumentDto } from "../types/document.type";

class DocumentService {
  private readonly baseUrl = "/documents";

  async getDocuments(roomId?: string): Promise<Document[]> {
    const params: any = {};
    if (roomId) params.roomId = roomId;

    const response = await apiService.get<{ metadata: Document[] }>(
      this.baseUrl,
      { params }
    );
    return response.data.metadata || [];
  }

  async getDocument(docId: string): Promise<Document> {
    const response = await apiService.get<{ metadata: Document }>(
      `${this.baseUrl}/${docId}`
    );
    return response.data.metadata;
  }

  async createDocument(data: CreateDocumentDto): Promise<Document> {
    const response = await apiService.post<{ metadata: Document }>(
      this.baseUrl,
      data
    );
    return response.data.metadata;
  }

  async updateDocumentContent(
    docId: string,
    data: { plainText?: string; yjsSnapshot?: any }
  ): Promise<Document> {
    const response = await apiService.patch<{ metadata: Document }>(
      `${this.baseUrl}/${docId}`,
      data
    );
    return response.data.metadata;
  }

  async deleteDocument(docId: string): Promise<void> {
    await apiService.delete(`${this.baseUrl}/${docId}`);
  }

  async shareDocument(
    docId: string,
    shareUserId: string,
    role: string = "editor"
  ): Promise<Document> {
    const response = await apiService.post<{ metadata: Document }>(
      `${this.baseUrl}/${docId}/share`,
      { shareUserId, role }
    );
    return response.data.metadata;
  }

  async unshareDocument(docId: string, shareUserId: string): Promise<Document> {
    const response = await apiService.post<{ metadata: Document }>(
      `${this.baseUrl}/${docId}/unshare`,
      { shareUserId }
    );
    return response.data.metadata;
  }

  async updateTitle(docId: string, title: string): Promise<Document> {
    const response = await apiService.patch<{ metadata: Document }>(
      `${this.baseUrl}/${docId}/title`,
      { title }
    );
    return response.data.metadata;
  }

  async updateVisibility(docId: string, visibility: string): Promise<Document> {
    const response = await apiService.patch<{ metadata: Document }>(
      `${this.baseUrl}/${docId}/visibility`,
      { visibility }
    );
    return response.data.metadata;
  }

  async duplicateDocument(docId: string): Promise<Document> {
    const response = await apiService.post<{ metadata: Document }>(
      `${this.baseUrl}/${docId}/duplicate`
    );
    return response.data.metadata;
  }
}

export default new DocumentService();
