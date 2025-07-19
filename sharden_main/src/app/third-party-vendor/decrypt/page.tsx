"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  DragEvent,
} from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  ShieldCheck,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------
 * Types aligned with Flask metadata
 * ------------------------------------------------------------------ */
type FileMeta = {
  file_id: string;
  original_filename: string;
  encrypted_filename: string;
  expiry_time: number; // unix secs
  revoked: boolean;
  sender_email?: string;
  recipient_email?: string;
};

/* ------------------------------------------------------------------
 * Config
 * ------------------------------------------------------------------ */
const API_BASE =
  process.env.NEXT_PUBLIC_SECURE_API_BASE ?? "http://127.0.0.1:5000";

/* ------------------------------------------------------------------
 * Small UI bits
 * ------------------------------------------------------------------ */
function StatusBadge({
  revoked,
  expiry_time,
}: {
  revoked: boolean;
  expiry_time: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const msLeft = expiry_time * 1000 - now;
  const expired = msLeft <= 0;
  if (revoked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-700/40 px-2 py-0.5 text-xs text-yellow-300">
        <Ban size={12} />
        Revoked
      </span>
    );
  }
  if (expired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-700/40 px-2 py-0.5 text-xs text-red-300">
        <AlertTriangle size={12} />
        Expired
      </span>
    );
  }
  const secs = Math.floor(msLeft / 1000);
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  let label: string;
  if (days > 0) label = `${days}d ${hrs % 24}h`;
  else if (hrs > 0) label = `${hrs}h ${mins % 60}m`;
  else if (mins > 0) label = `${mins}m ${secs % 60}s`;
  else label = `${secs}s`;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-700/40 px-2 py-0.5 text-xs text-green-300">
      <Clock size={12} />
      {label}
    </span>
  );
}

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "error" | "success";
  onClose: () => void;
}) {
  const color =
    type === "error"
      ? "bg-red-600 border-red-400"
      : "bg-green-600 border-green-400";
  const Icon = type === "error" ? AlertTriangle : CheckCircle2;
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`fixed top-6 right-6 z-50 flex items-center gap-2 rounded border px-4 py-2 shadow-lg ${color} text-white`}
    >
      <Icon size={18} />
      <span>{message}</span>
    </div>
  );
}

/* ------------------------------------------------------------------
 * API helpers
 * ------------------------------------------------------------------ */
async function apiListFilesForRecipient(
  recipientEmail: string
): Promise<FileMeta[]> {
  const url = new URL(`${API_BASE}/api/files`);
  url.searchParams.set("recipient", recipientEmail);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`List failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function apiDownloadFile(file_id: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/files/${file_id}/download`);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Download failed: ${res.status} ${txt}`);
  }
  return await res.blob();
}

/* ------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------ */
export default function ThirdPartyVendorPage() {
  const { data: rawSession, status } = useSession();
  const session = rawSession as any; // relax typing for hackathon speed
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedFileId = searchParams?.get("file_id") || null;

  const [files, setFiles] = useState<FileMeta[]>([]);
  const [toast, setToast] = useState<{
    msg: string;
    type: "error" | "success";
  } | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Auth gate
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/"); // go sign-in
      return;
    }
    if (session.user.role !== "third_party_vendor") {
      router.push("/unauthorized");
      return;
    }
  }, [session, status, router]);

  // Load vendor files
  const load = useCallback(async () => {
    const email = session?.user?.email;
    if (!email) return;
    try {
      const list = await apiListFilesForRecipient(email);
      setFiles(list);
      // highlight if link points to a specific file (and you own it)
      if (linkedFileId && list.some((f) => f.file_id === linkedFileId)) {
        setHighlightId(linkedFileId);
        // auto-scroll after paint
        setTimeout(() => {
          const el = document.getElementById(`file-row-${linkedFileId}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
      }
    } catch (err: any) {
      setToast({ msg: err.message || "Failed to load files", type: "error" });
    }
  }, [session?.user?.email, linkedFileId]);

  useEffect(() => {
    if (session?.user?.role === "third_party_vendor") {
      load();
    }
  }, [session, load]);

  // Download
  async function handleDownload(f: FileMeta) {
    if (f.revoked) {
      setToast({ msg: "File revoked by sender", type: "error" });
      return;
    }
    const expired = f.expiry_time * 1000 < Date.now();
    if (expired) {
      setToast({ msg: "File expired", type: "error" });
      return;
    }
    setDownloadingId(f.file_id);
    try {
      const blob = await apiDownloadFile(f.file_id);
      // Server decrypts before sending (MVP). For E2E, decrypt blob here later.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.original_filename ?? "download.bin";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setToast({ msg: "File downloaded", type: "success" });
    } catch (err: any) {
      setToast({ msg: err.message || "Download failed", type: "error" });
    } finally {
      setDownloadingId(null);
    }
  }

  /* UI states */
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <Loader2 className="mr-2 animate-spin" /> Loading session...
      </div>
    );
  }
  if (!session || session.user.role !== "third_party_vendor") {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Checking permissions...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background text-white">
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <header className="bg-[hsl(220,30%,8%)] shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-[hsl(45,93%,47%)]">
              <span className="bg-gradient-to-r from-[hsl(210,100%,50%)] to-[hsl(45,93%,47%)] bg-clip-text text-transparent">
                SHARDEN
              </span>{" "}
              Vendor Files
            </h1>
            <p className="text-sm text-gray-300">
              Logged in as {session.user.name ?? "Vendor"} ({session.user.email}
              )
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => signOut()}
              className="rounded bg-red-600 px-4 py-2 text-sm hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[hsl(45,93%,47%)]">
            <ShieldCheck size={18} />
            Files Sent To You
          </h2>
          <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-800/40 shadow">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-300">
                <tr>
                  <th className="px-4 py-2 font-medium">File</th>
                  <th className="px-4 py-2 font-medium">From</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-slate-400"
                    >
                      No files yet.
                    </td>
                  </tr>
                ) : (
                  files.map((f) => {
                    const rowHighlight =
                      highlightId === f.file_id
                        ? "bg-blue-900/40 animate-pulse"
                        : "";
                    return (
                      <tr
                        id={`file-row-${f.file_id}`}
                        key={f.file_id}
                        className={`border-t border-slate-700 last:border-b-0 ${rowHighlight}`}
                      >
                        <td className="px-4 py-2">
                          {f.original_filename || "(unknown)"}
                        </td>
                        <td className="px-4 py-2">{f.sender_email || "-"}</td>
                        <td className="px-4 py-2">
                          <StatusBadge
                            revoked={f.revoked}
                            expiry_time={f.expiry_time}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <button
                            disabled={
                              downloadingId === f.file_id ||
                              f.revoked ||
                              f.expiry_time * 1000 < Date.now()
                            }
                            onClick={() => handleDownload(f)}
                            className="rounded bg-green-600 px-2 py-1 text-xs hover:bg-green-500 disabled:opacity-40"
                          >
                            <span className="inline-flex items-center gap-1">
                              {downloadingId === f.file_id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Download size={14} />
                              )}
                              Download
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Files are decrypted on the server at download time (MVP). End‑to‑end
            client decryption coming soon.
          </p>
        </section>
      </main>
    </div>
  );
}
