import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { resolveSiteAdminAccess } from "@/lib/site-admin/access";

const maxAttachmentSizeBytes = 30 * 1024 * 1024;
const maxBodyImageSizeBytes = 10 * 1024 * 1024;
const attachmentExtensions = new Set(["pdf", "hwp", "hwpx", "doc", "docx", "xls", "xlsx", "ppt", "pptx"]);
const imageExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const attachmentContentTypes = [
  "application/pdf",
  "application/haansofthwp",
  "application/haansoft-hwp",
  "application/x-hwp",
  "application/vnd.hancom.hwp",
  "application/vnd.hancom.hwpx",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/octet-stream"
];
const imageContentTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const access = await resolveSiteAdminAccess();
        if (!access) {
          throw new Error("로그인이 필요한 업로드입니다.");
        }

        const uploadPolicy = resolveUploadPolicy(pathname);

        return {
          allowedContentTypes: uploadPolicy.allowedContentTypes,
          maximumSizeInBytes: uploadPolicy.maximumSizeInBytes,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            tenantId: access.tenant.tenantId,
            userId: access.appUserId
          })
        };
      },
      onUploadCompleted: async () => {
        // The post form stores the returned Blob URL after the browser upload completes.
      }
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "첨부파일 업로드에 실패했습니다." },
      { status: 400 }
    );
  }
}

function resolveUploadPolicy(pathname: string) {
  const extension = pathname.split(".").pop()?.toLowerCase();

  if (pathname.startsWith("site-attachments/") && extension && attachmentExtensions.has(extension)) {
    return {
      allowedContentTypes: attachmentContentTypes,
      maximumSizeInBytes: maxAttachmentSizeBytes
    };
  }

  if (pathname.startsWith("site-body-images/") && extension && imageExtensions.has(extension)) {
    return {
      allowedContentTypes: imageContentTypes,
      maximumSizeInBytes: maxBodyImageSizeBytes
    };
  }

  throw new Error("허용되지 않는 업로드 경로 또는 파일 형식입니다.");
}
