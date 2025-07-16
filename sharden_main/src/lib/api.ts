export const API_BASE = process.env.NEXT_PUBLIC_SECURE_FILE_API ?? "";

export interface FileMeta {
  file_id: string;
  original_filename: string;
  encrypted_filename: string;
  expiry_time: number; 
  revoked: boolean;
  recipient: string;
}

export async function uploadFile(
  file: File,
  recipient: string,
  user: string,
  role: string
): Promise<FileMeta> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("recipient", recipient);

  const res = await fetch(`${API_BASE}/api/files`, {
    method: "POST",
    headers: {
      "X-User": user,
      "X-Role": role,
    },
    body: fd,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload failed (${res.status})`);
  }
  return res.json();
}
