/**
 * BlockNoteEditor — WebView nhúng /docs/[id]?token=... từ app-chat-fe.
 */
import React, { useMemo } from "react";
import useAuthStore from "../../store/useAuth";
import { getDocumentEditorWebUrl } from "../../libs/web-app-url";
import DocsWebView from "./docs-webview";

export interface BlockNoteEditorProps {
  docId: string;
  onEditorReady?: () => void;
  onLoadEnd?: () => void;
  onChange?: () => void;
  onTitleChange?: (title: string) => void;
  onError?: (message: string) => void;
}

export default function BlockNoteEditor({
  docId,
  onEditorReady,
  onLoadEnd,
  onError,
}: BlockNoteEditorProps) {
  const accessToken = useAuthStore((s) => s.tokens?.accessToken) ?? "";

  const editorUrl = useMemo(
    () => getDocumentEditorWebUrl(docId, accessToken),
    [docId, accessToken],
  );

  return (
    <DocsWebView
      uri={editorUrl}
      onLoadEnd={() => {
        onLoadEnd?.();
        onEditorReady?.();
      }}
      onError={onError}
    />
  );
}
