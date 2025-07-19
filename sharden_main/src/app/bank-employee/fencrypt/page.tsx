"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";

type FileMeta = {
  file_id: string;
  original_filename: string;
  encrypted_filename: string;
  expiry_time: number;
  revoked: boolean;
  recipient?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_SECURE_API_BASE ?? "http://127.0.0.1:5000";

export default function FencryptPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth gate
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "bank_employee") {
      router.push("/unauthorized");
    }
  }, [session, status, router]);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/files`, { cache: "no-store" });
      if (!res.ok) throw new Error(`List failed (${res.status})`);
      const data = await res.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load files");
    }
  }, []);

  useEffect(() => {
    if (session?.user?.role === "bank_employee") {
      loadFiles();
    }
  }, [session, loadFiles]);

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setUploading(true);

    const formEl = e.currentTarget;
    const fileInput = formEl.elements.namedItem(
      "file"
    ) as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) {
      setError("Please choose a file.");
      setUploading(false);
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    // backend expects a 'recipient' field; we'll pass current user email
    if (session?.user?.email) {
      fd.append("recipient", session.user.email);
    }

    try {
      const res = await fetch(`${API_BASE}/api/files`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Upload failed: ${res.status} ${txt}`);
      }
      await loadFiles();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      formEl.reset();
    }
  }

  async function handleDownload(file_id: string, filename: string) {
    try {
      const res = await fetch(`${API_BASE}/api/files/${file_id}/download`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Download failed: ${res.status} ${txt}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Download failed");
    }
  }

  async function handleRevoke(file_id: string) {
    try {
      const res = await fetch(`${API_BASE}/api/files/${file_id}/revoke`, {
        method: "POST",
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Revoke failed: ${res.status} ${txt}`);
      }
      await loadFiles();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Revoke failed");
    }
  }

  if (status === "loading") return <div>Loading....</div>;
  if (!session || session.user.role !== "bank_employee")
    return <div>Checking permissions...</div>;

  return (
    <div className="min-h-screen bg-gradient-background text-white p-8">
      {/* Header */}
      <div className="bg-[hsl(220,30%,8%)] shadow mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-[hsl(45,93%,47%)]">
                <span className="bg-gradient-to-r from-[hsl(210,100%,50%)] to-[hsl(45,93%,47%)] bg-clip-text text-transparent">
                  SHARDEN
                </span>{" "}
                - File Encryption
              </h1>
              <p className="text-sm text-gray-300">
                Welcome, {session.user.name} ({session.user.email})
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/bank-employee"
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Dashboard
              </a>
              <button
                onClick={() => signOut()}
                className="bg-red-600 text-white px-10 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload */}
      <div className="max-w-xl mb-10">
        <form onSubmit={handleUpload} className="space-y-4">
          <input
            type="file"
            name="file"
            className="block w-full text-white"
            disabled={uploading}
          />
          <button
            type="submit"
            disabled={uploading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload & Encrypt"}
          </button>
        </form>
        {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
      </div>

      {/* Files Table */}
      <div className="max-w-4xl">
        <h2 className="text-xl font-semibold mb-4">Encrypted Files</h2>
        {files.length === 0 ? (
          <p className="text-gray-400">No files yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-[hsl(220,30%,12%)]">
                <tr>
                  <th className="px-4 py-2">Filename</th>
                  <th className="px-4 py-2">Expires</th>
                  <th className="px-4 py-2">Revoked?</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => {
                  const expiresIn = f.expiry_time
                    ? f.expiry_time * 1000 - Date.now()
                    : null;
                  const expired = expiresIn !== null && expiresIn <= 0;
                  return (
                    <tr key={f.file_id} className="border-b border-gray-700">
                      <td className="px-4 py-2">
                        {f.original_filename || "(unknown)"}
                      </td>
                      <td className="px-4 py-2">
                        {expired
                          ? "Expired"
                          : new Date(f.expiry_time * 1000).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">{f.revoked ? "Yes" : "No"}</td>
                      <td className="px-4 py-2 space-x-2">
                        <button
                          disabled={f.revoked || expired}
                          onClick={() =>
                            handleDownload(
                              f.file_id,
                              f.original_filename ?? "download.bin"
                            )
                          }
                          className="bg-green-600 px-2 py-1 rounded disabled:opacity-40"
                        >
                          Download
                        </button>
                        {!f.revoked && (
                          <button
                            onClick={() => handleRevoke(f.file_id)}
                            className="bg-yellow-600 px-2 py-1 rounded"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
