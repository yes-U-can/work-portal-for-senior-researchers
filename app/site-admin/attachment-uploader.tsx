"use client";

import { upload } from "@vercel/blob/client";
import { useState, useTransition } from "react";

type AttachmentItem = {
  title: string;
  url: string;
};

const maxFiles = 5;
const maxSizeBytes = 30 * 1024 * 1024;
const allowedExtensions = new Set(["pdf", "hwp", "hwpx", "doc", "docx", "xls", "xlsx", "ppt", "pptx"]);

export function AttachmentUploader() {
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="upload-box">
      <label className="form-label">
        내 컴퓨터에서 첨부파일 업로드. 최대 5개, 파일당 30MB
        <input
          className="file-input"
          type="file"
          multiple
          accept=".pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            event.currentTarget.value = "";

            startTransition(async () => {
              await uploadFiles(files);
            });
          }}
        />
      </label>

      <textarea name="uploadedAttachments" value={serializeAttachments(attachments)} readOnly hidden />

      {message ? <p className={message.startsWith("완료") ? "success-text" : "error-text"}>{message}</p> : null}
      {isPending ? <p className="hint">첨부파일을 업로드하고 있습니다. 완료 문구가 보인 뒤 저장해주세요.</p> : null}

      {attachments.length > 0 ? (
        <ul className="upload-list">
          {attachments.map((attachment) => (
            <li key={attachment.url}>
              <a href={attachment.url} target="_blank" rel="noreferrer">
                {attachment.title}
              </a>
              <button
                className="button-secondary"
                type="button"
                onClick={() => setAttachments((current) => current.filter((item) => item.url !== attachment.url))}
              >
                제거
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  async function uploadFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }

    if (attachments.length + files.length > maxFiles) {
      setMessage("첨부파일은 게시글당 최대 5개까지만 등록할 수 있습니다.");
      return;
    }

    const invalidFile = files.find((file) => !isAllowedFile(file));
    if (invalidFile) {
      setMessage(`${invalidFile.name} 파일 형식은 첨부할 수 없습니다.`);
      return;
    }

    const oversizedFile = files.find((file) => file.size > maxSizeBytes);
    if (oversizedFile) {
      setMessage(`${oversizedFile.name} 파일이 30MB를 넘습니다.`);
      return;
    }

    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const blob = await upload(`site-attachments/${sanitizeFileName(file.name)}`, file, {
            access: "public",
            handleUploadUrl: "/api/site-admin/blob-upload"
          });

          return {
            title: file.name,
            url: blob.url
          };
        })
      );

      setAttachments((current) => [...current, ...uploaded]);
      setMessage(`완료: 첨부파일 ${uploaded.length}개를 업로드했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "첨부파일 업로드에 실패했습니다.");
    }
  }
}

function serializeAttachments(attachments: AttachmentItem[]) {
  return attachments.map((attachment) => `${attachment.title} | ${attachment.url}`).join("\n");
}

function isAllowedFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return Boolean(extension && allowedExtensions.has(extension));
}

function sanitizeFileName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "file";
  const baseName = fileName.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "-").slice(0, 60);
  return `${baseName || "attachment"}.${extension}`;
}
