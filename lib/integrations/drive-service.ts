import type { DriveFileSummary } from "@/lib/integrations/types";

type GoogleDriveFile = {
  id: string;
  name?: string;
  mimeType?: string;
  webViewLink?: string;
  modifiedTime?: string;
  shared?: boolean;
  owners?: Array<{
    displayName?: string;
    emailAddress?: string;
  }>;
};

type GoogleDriveListResponse = {
  files?: GoogleDriveFile[];
};

type ListDriveFilesInput = {
  accessToken: string;
  query?: string;
  pageSize?: number;
};

type UploadDriveFileInput = {
  accessToken: string;
  name: string;
  mimeType: string;
  bytes: Uint8Array;
};

function mapDriveFile(file: GoogleDriveFile): DriveFileSummary {
  return {
    id: file.id,
    name: file.name ?? "(untitled)",
    mimeType: file.mimeType ?? "application/octet-stream",
    webViewLink: file.webViewLink ?? null,
    modifiedTime: file.modifiedTime ?? null,
    shared: Boolean(file.shared),
    owners:
      file.owners?.map((owner) => owner.displayName ?? owner.emailAddress ?? "Unknown owner") ?? []
  };
}

export async function listDriveFiles(input: ListDriveFilesInput): Promise<DriveFileSummary[]> {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set(
    "fields",
    "files(id,name,mimeType,webViewLink,modifiedTime,shared,owners(displayName,emailAddress))"
  );
  url.searchParams.set("orderBy", "modifiedTime desc");
  url.searchParams.set("pageSize", String(input.pageSize ?? 30));
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");
  url.searchParams.set("corpora", "user");

  if (input.query) {
    url.searchParams.set("q", input.query);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Google Drive list failed (${response.status}): ${payload}`);
  }

  const data = (await response.json()) as GoogleDriveListResponse;
  return (data.files ?? []).map(mapDriveFile);
}

export async function uploadDriveFile(input: UploadDriveFileInput): Promise<DriveFileSummary> {
  const metadata = {
    name: input.name
  };

  const boundary = `boundary_${Date.now()}`;
  const metadataPart = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${input.mimeType}`,
    "",
    ""
  ].join("\r\n");
  const closingBoundary = `\r\n--${boundary}--`;

  const metadataBytes = new TextEncoder().encode(metadataPart);
  const closingBytes = new TextEncoder().encode(closingBoundary);
  const payload = new Uint8Array(metadataBytes.length + input.bytes.length + closingBytes.length);
  payload.set(metadataBytes, 0);
  payload.set(input.bytes, metadataBytes.length);
  payload.set(closingBytes, metadataBytes.length + input.bytes.length);

  const uploadUrl =
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,modifiedTime,shared,owners(displayName,emailAddress)";

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body: payload
  });

  if (!response.ok) {
    const payloadText = await response.text();
    throw new Error(`Google Drive upload failed (${response.status}): ${payloadText}`);
  }

  const uploaded = (await response.json()) as GoogleDriveFile;
  return mapDriveFile(uploaded);
}
