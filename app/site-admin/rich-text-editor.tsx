"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useRef, useState, useTransition } from "react";

type RichTextEditorProps = {
  name: string;
  initialValue?: string;
};

const imageMaxSizeBytes = 10 * 1024 * 1024;
const imageExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

export function RichTextEditor({ name, initialValue = "" }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const internalSyncRef = useRef(false);
  const [html, setHtml] = useState(initialValue);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const editor = editorRef.current;
    const hiddenInput = hiddenInputRef.current;
    if (!editor || !hiddenInput) {
      return;
    }

    editor.innerHTML = initialValue;
    hiddenInput.value = initialValue;

    const handleHiddenInput = () => {
      if (internalSyncRef.current) {
        internalSyncRef.current = false;
        return;
      }

      editor.innerHTML = hiddenInput.value;
      setHtml(hiddenInput.value);
    };

    hiddenInput.addEventListener("input", handleHiddenInput);
    return () => hiddenInput.removeEventListener("input", handleHiddenInput);
  }, [initialValue]);

  return (
    <div className="rich-editor">
      <input ref={hiddenInputRef} type="hidden" name={name} value={html} readOnly />
      <div className="rich-toolbar" aria-label="본문 서식 도구">
        <button type="button" onClick={() => runCommand("bold")}>
          굵게
        </button>
        <button type="button" onClick={() => runCommand("italic")}>
          기울임
        </button>
        <button type="button" onClick={() => runCommand("underline")}>
          밑줄
        </button>
        <button type="button" onClick={() => runCommand("insertUnorderedList")}>
          글머리
        </button>
        <button type="button" onClick={() => runCommand("insertOrderedList")}>
          번호목록
        </button>
        <button type="button" onClick={insertLink}>
          링크
        </button>
        <label>
          폰트
          <select defaultValue="" onChange={(event) => applyClass(event.currentTarget.value)}>
            <option value="" disabled>
              선택
            </option>
            <option value="rt-font-sans">Noto Sans</option>
            <option value="rt-font-serif">Noto Serif</option>
          </select>
        </label>
        <label>
          크기
          <select defaultValue="" onChange={(event) => applyClass(event.currentTarget.value)}>
            <option value="" disabled>
              선택
            </option>
            <option value="rt-size-sm">작게</option>
            <option value="rt-size-base">기본</option>
            <option value="rt-size-lg">크게</option>
            <option value="rt-size-xl">아주 크게</option>
          </select>
        </label>
        <label>
          줄간격
          <select defaultValue="" onChange={(event) => applyClass(event.currentTarget.value)}>
            <option value="" disabled>
              선택
            </option>
            <option value="rt-leading-tight">좁게</option>
            <option value="rt-leading-normal">보통</option>
            <option value="rt-leading-loose">넓게</option>
          </select>
        </label>
        <label>
          자간
          <select defaultValue="" onChange={(event) => applyClass(event.currentTarget.value)}>
            <option value="" disabled>
              선택
            </option>
            <option value="rt-tracking-tight">좁게</option>
            <option value="rt-tracking-normal">보통</option>
            <option value="rt-tracking-wide">넓게</option>
          </select>
        </label>
        <label className="rich-file-button">
          이미지
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";

              if (file) {
                startTransition(async () => {
                  await uploadImage(file);
                });
              }
            }}
          />
        </label>
      </div>

      <div
        ref={editorRef}
        className="rich-editor-surface notice-rich-text"
        contentEditable
        role="textbox"
        aria-label="본문"
        aria-multiline="true"
        onInput={syncEditor}
        onBlur={syncEditor}
        suppressContentEditableWarning
      />
      <p className="hint">
        본문 이미지는 10MB 이하의 JPG, PNG, WebP, GIF를 사용할 수 있습니다. 탭 키는 브라우저 접근성을 위해 다음
        입력칸으로 이동합니다.
      </p>
      {message ? <p className={message.startsWith("완료") ? "success-text" : "error-text"}>{message}</p> : null}
      {isPending ? <p className="hint">이미지를 업로드하고 있습니다.</p> : null}
    </div>
  );

  function runCommand(command: string) {
    editorRef.current?.focus();
    document.execCommand(command);
    normalizeEditor();
    syncEditor();
  }

  function applyClass(className: string) {
    if (!className) {
      return;
    }

    editorRef.current?.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setMessage("서식을 적용할 텍스트를 먼저 선택해주세요.");
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) {
      return;
    }

    const span = document.createElement("span");
    span.className = className;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    selection.removeAllRanges();
    syncEditor();
  }

  function insertLink() {
    const url = window.prompt("연결할 URL을 입력해주세요.");
    if (!url) {
      return;
    }

    editorRef.current?.focus();
    document.execCommand("createLink", false, url);
    normalizeEditor();
    syncEditor();
  }

  async function uploadImage(file: File) {
    if (!isAllowedImage(file)) {
      setMessage("본문 이미지는 JPG, PNG, WebP, GIF만 사용할 수 있습니다.");
      return;
    }

    if (file.size > imageMaxSizeBytes) {
      setMessage("본문 이미지는 10MB 이하만 사용할 수 있습니다.");
      return;
    }

    try {
      const blob = await upload(`site-body-images/${sanitizeFileName(file.name)}`, file, {
        access: "public",
        handleUploadUrl: "/api/site-admin/blob-upload"
      });

      editorRef.current?.focus();
      document.execCommand("insertImage", false, blob.url);
      normalizeEditor();
      syncEditor();
      setMessage("완료: 본문 이미지를 삽입했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "본문 이미지 업로드에 실패했습니다.");
    }
  }

  function normalizeEditor() {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    editor.querySelectorAll("a").forEach((anchor) => {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noreferrer");
    });

    editor.querySelectorAll("img").forEach((image) => {
      if (!image.alt) {
        image.alt = "";
      }
    });
  }

  function syncEditor() {
    const value = editorRef.current?.innerHTML ?? "";
    setHtml(value);

    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = value;
      internalSyncRef.current = true;
      hiddenInputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
}

function isAllowedImage(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return Boolean(extension && imageExtensions.has(extension));
}

function sanitizeFileName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "image";
  const baseName = fileName.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "-").slice(0, 60);
  return `${baseName || "image"}.${extension}`;
}
