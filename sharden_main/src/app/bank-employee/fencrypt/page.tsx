"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  FormEvent,
  DragEvent,
} from "react";
import { encryptFileBrowser } from "@/lib/crypto";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  Ban,
  Link as LinkIcon,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Loader2,
} from "lucide-react";

type FileMeta = {
  file_id: string;
  original_filename: string;
  encrypted_filename: string;
  expiry_time: number; // unix seconds
  revoked: boolean;
  sender_email?: string;
  recipient_email?: string;
};

type Vendor = {
  email: string;
  name?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_SECURE_API_BASE ?? "http://127.0.0.1:5000";

const VENDOR_LIST_ENDPOINT =
  process.env.NEXT_PUBLIC_VENDOR_API ?? "/api/vendors";

const VENDOR_PORTAL_BASE =
  process.env.NEXT_PUBLIC_VENDOR_PORTAL_BASE ??
  "http://localhost:3000/third-party-vendor";

const KEY_STORAGE = "sharden_file_keys_v1";

function loadStoredKeys(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY_STORAGE);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveStoredKeys(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_STORAGE, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

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

async function apiListFilesForSender(senderEmail: string): Promise<FileMeta[]> {
  const url = new URL(`${API_BASE}/api/files`);
  url.searchParams.set("sender", senderEmail);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`List failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function apiRevokeFile(file_id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/files/${file_id}/revoke`, {
    method: "POST",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Revoke failed: ${res.status} ${txt}`);
  }
}

async function apiListVendors(): Promise<Vendor[]> {
  try {
    const res = await fetch(VENDOR_LIST_ENDPOINT, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("bad vendor payload");
    return data as Vendor[];
  } catch {
    return [
      { email: "vendor1@example.com", name: "Vendor One" },
      { email: "vendor2@example.com", name: "Vendor Two" },
    ];
  }
}

export default function FencryptPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileKeys, setFileKeys] = useState<Record<string, string>>(() =>
    loadStoredKeys()
  );
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  const [toast, setToast] = useState<{
    msg: string;
    type: "error" | "success";
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "bank_employee") {
      router.push("/unauthorized");
    }
  }, [session, status, router]);

  const rememberKey = useCallback((file_id: string, key: string) => {
    setFileKeys((prev) => {
      const next = { ...prev, [file_id]: key };
      saveStoredKeys(next);
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    if (!session?.user?.email) return;
    try {
      const [vendorList, fileList] = await Promise.all([
        apiListVendors(),
        apiListFilesForSender(session.user.email),
      ]);
      setVendors(vendorList);
      setFiles(fileList);
    } catch (err: any) {
      setToast({ msg: err.message || "Failed to load data", type: "error" });
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (session?.user?.role === "bank_employee") {
      load();
    }
  }, [session, load]);

  async function doUpload(file: File) {
    if (!session?.user?.email) {
      setToast({ msg: "Missing sender email in session", type: "error" });
      return;
    }
    if (!selectedVendor) {
      setToast({ msg: "Select a vendor first", type: "error" });
      return;
    }
    setUploading(true);
    try {
      const { ciphertextBlob, keyBase64, ivBase64, mimeType } =
        await encryptFileBrowser(file);

      const fd = new FormData();
      fd.append(
        "file",
        new File([ciphertextBlob], file.name + ".enc", {
          type: "application/octet-stream",
        })
      );
      fd.append("sender_email", session.user.email);
      fd.append("recipient_email", selectedVendor);
      fd.append("original_name", file.name);
      fd.append("mime_type", mimeType);
      fd.append("iv_b64", ivBase64);
      fd.append("e2e", "1");

      const res = await fetch(`${API_BASE}/api/files`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Upload failed: ${res.status} ${txt}`);
      }
      const newFile = (await res.json()) as FileMeta;

      const vendorLink = `${VENDOR_PORTAL_BASE}/decrypt?file_id=${encodeURIComponent(
        newFile.file_id
      )}#k=${encodeURIComponent(keyBase64)}`;

      setFiles((prev) => [newFile, ...prev]);
      rememberKey(newFile.file_id, keyBase64);
      setToast({ msg: "File sent securely! Link copied.", type: "success" });

      try {
        await navigator.clipboard.writeText(vendorLink);
      } catch {
        /* ignore */
      }

      setSelectedFileName("");
      void load();
    } catch (err: any) {
      setToast({ msg: err.message || "Upload failed", type: "error" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function copyLink(file_id: string, keyBase64?: string, includeKey = true) {
    const link =
      includeKey && keyBase64
        ? `${VENDOR_PORTAL_BASE}/decrypt?file_id=${file_id}#k=${encodeURIComponent(
            keyBase64
          )}`
        : `${VENDOR_PORTAL_BASE}/decrypt?file_id=${file_id}`;
    navigator.clipboard
      .writeText(link)
      .then(() =>
        setToast({
          msg: includeKey
            ? "Vendor link (with key) copied."
            : "Vendor link copied.",
          type: "success",
        })
      )
      .catch(() => setToast({ msg: "Failed to copy link", type: "error" }));
  }

  function copyKeyOnly(file_id: string) {
    const key = fileKeys[file_id];
    if (!key) {
      setToast({ msg: "No key cached for that file.", type: "error" });
      return;
    }
    navigator.clipboard
      .writeText(key)
      .then(() => setToast({ msg: "Decryption key copied.", type: "success" }))
      .catch(() => setToast({ msg: "Failed to copy key.", type: "error" }));
  }

  async function handleRevoke(file_id: string) {
    const sure = window.confirm(
      "Are you sure you want to revoke access to this file? The recipient will no longer be able to download it."
    );
    if (!sure) return;
    try {
      await apiRevokeFile(file_id);
      setToast({ msg: "File access revoked", type: "success" });
      await load();
    } catch (err: any) {
      setToast({ msg: err.message || "Revoke failed", type: "error" });
    }
  }

  function onFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (file) void doUpload(file);
    else setToast({ msg: "Please choose a file", type: "error" });
  }
  function onFileChange() {
    const file = fileInputRef.current?.files?.[0];
    setSelectedFileName(file ? file.name : "");
  }
  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }
  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      void doUpload(file);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <Loader2 className="mr-2 animate-spin" /> Loading session...
      </div>
    );
  }

  if (!session || session.user.role !== "bank_employee") {
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
              Secure Send
            </h1>
            <p className="text-sm text-gray-300">
              Logged in as {session.user.name ?? "Bank Employee"} (
              {session.user.email})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/bank-employee"
              className="rounded bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
            >
              Dashboard
            </a>
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
        {/* Step 1: Select Vendor */}
        <section className="mb-10 rounded-lg border border-slate-700 bg-slate-800/50 p-6 shadow">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Users size={18} />
            Select Recipient (Vendor)
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-blue-500 sm:w-72"
            >
              <option value="">-- Select vendor --</option>
              {vendors.map((v) => (
                <option key={v.email} value={v.email}>
                  {v.name ? `${v.name} (${v.email})` : v.email}
                </option>
              ))}
            </select>
            <span className="text-sm text-slate-400">or</span>
            <input
              type="email"
              placeholder="vendor@domain.com"
              value={
                vendors.find((v) => v.email === selectedVendor)
                  ? ""
                  : selectedVendor
              }
              onChange={(e) => setSelectedVendor(e.target.value.trim())}
              className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-blue-500 sm:w-72"
            />
          </div>
        </section>

        {/* Step 2: Upload & Encrypt */}
        <section className="mb-14 rounded-lg border border-blue-700/40 bg-blue-900/20 p-6 shadow relative">
          {uploading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-blue-950/60 backdrop-blur-sm">
              <Loader2 className="mr-2 animate-spin" />
              <span>Encrypting & Sending...</span>
            </div>
          )}
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-blue-300">
            <UploadCloud size={18} />
            Upload & Encrypt
          </h2>

          <form onSubmit={onFormSubmit}>
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`flex h-40 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition ${
                dragActive
                  ? "border-blue-400 bg-blue-400/10"
                  : "border-blue-600/50 bg-blue-800/10 hover:border-blue-400"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center">
                <UploadCloud size={32} className="mx-auto mb-2 text-blue-300" />
                <p className="text-sm text-blue-200">
                  {dragActive
                    ? "Drop file to upload"
                    : selectedFileName
                    ? `Selected: ${selectedFileName}`
                    : "Click or drag file to upload"}
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              className="hidden"
              disabled={uploading}
              onChange={onFileChange}
            />
            <button
              type="submit"
              disabled={uploading}
              className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              Send Securely
            </button>
          </form>
        </section>

        {/* Sent Files */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[hsl(45,93%,47%)]">
            <ShieldCheck size={18} />
            Files You’ve Sent
          </h2>
          <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-800/40 shadow">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-300">
                <tr>
                  <th className="px-4 py-2 font-medium">File</th>
                  <th className="px-4 py-2 font-medium">Recipient</th>
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
                  files.map((f) => (
                    <tr
                      key={f.file_id}
                      className="border-t border-slate-700 last:border-b-0"
                    >
                      <td className="px-4 py-2">
                        {f.original_filename || "(unknown)"}
                      </td>
                      <td className="px-4 py-2">{f.recipient_email || "-"}</td>
                      <td className="px-4 py-2">
                        <StatusBadge
                          revoked={f.revoked}
                          expiry_time={f.expiry_time}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() =>
                              copyLink(f.file_id, fileKeys[f.file_id], true)
                            }
                            className="rounded bg-slate-600 px-2 py-1 text-xs hover:bg-slate-500"
                          >
                            <span className="inline-flex items-center gap-1">
                              <LinkIcon size={14} /> Link+Key
                            </span>
                          </button>
                          <button
                            onClick={() =>
                              copyLink(f.file_id, fileKeys[f.file_id], false)
                            }
                            className="rounded bg-slate-600 px-2 py-1 text-xs hover:bg-slate-500"
                          >
                            <span className="inline-flex items-center gap-1">
                              <LinkIcon size={14} /> Link Only
                            </span>
                          </button>
                          <button
                            onClick={() => copyKeyOnly(f.file_id)}
                            className="rounded bg-slate-600 px-2 py-1 text-xs hover:bg-slate-500"
                          >
                            <span className="inline-flex items-center gap-1">
                              🔑 Key
                            </span>
                          </button>
                          {!f.revoked && (
                            <button
                              onClick={() => handleRevoke(f.file_id)}
                              className="rounded bg-yellow-600 px-2 py-1 text-xs text-black hover:bg-yellow-500"
                            >
                              <span className="inline-flex items-center gap-1">
                                <Ban size={14} /> Revoke
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Expired or revoked files cannot be downloaded by the vendor.
          </p>
        </section>
      </main>
    </div>
  );
}
