"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  FormEvent,
  DragEvent,
} from "react";
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
  expiry_time: number;
  revoked: boolean;
  recipient?: string;
};

type Vendor = {
  email: string;
  name?: string;
};


const API_BASE =
  process.env.NEXT_PUBLIC_SECURE_API_BASE ?? "http://127.0.0.1:5000";


const VENDOR_LIST_ENDPOINT = "/api/vendors"; 


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

  // show countdown
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


async function apiListFiles(): Promise<FileMeta[]> {
  const res = await fetch(`${API_BASE}/api/files`, { cache: "no-store" });
  if (!res.ok) throw new Error(`List failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function apiUploadFile(
  file: File,
  senderEmail: string,
  recipientEmail: string
): Promise<FileMeta> {
  const fd = new FormData();
  fd.append("file", file);
  // The existing Flask code expects "recipient". We'll overload that param:
  // Format: "<recipientEmail>::<senderEmail>" so we don't lose sender.
  // We'll update Flask later to parse into both.
  fd.append("recipient", `${recipientEmail}::${senderEmail}`);

  const res = await fetch(`${API_BASE}/api/files`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Upload failed: ${res.status} ${txt}`);
  }
  return await res.json();
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

// Optional vendor fetch (safe fallback)
async function apiListVendors(): Promise<Vendor[]> {
  try {
    const res = await fetch(VENDOR_LIST_ENDPOINT, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("bad vendor payload");
    return data as Vendor[];
  } catch {
    // fallback demo vendors
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
  const [dragActive, setDragActive] = useState(false);

  const [toast, setToast] = useState<{
    msg: string;
    type: "error" | "success";
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  
  // auth gate
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "bank_employee") {
      router.push("/unauthorized");
    }
  }, [session, status, router]);

  
  const load = useCallback(async () => {
    try {
      const [vendorList, fileList] = await Promise.all([
        apiListVendors(),
        apiListFiles(),
      ]);
      setVendors(vendorList);
      setFiles(fileList);
    } catch (err: any) {
      setToast({ msg: err.message || "Failed to load data", type: "error" });
    }
  }, []);

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
      await apiUploadFile(file, session.user.email, selectedVendor);
      setToast({ msg: "File sent securely!", type: "success" });
      await load();
    } catch (err: any) {
      setToast({ msg: err.message || "Upload failed", type: "error" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (file) void doUpload(file);
    else setToast({ msg: "Please choose a file", type: "error" });
  }

  // Drag & drop
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
    if (file) void doUpload(file);
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

 
  function copyLink(file_id: string) {
    const link = `${API_BASE}/api/files/${file_id}/download`;
    navigator.clipboard
      .writeText(link)
      .then(() =>
        setToast({ msg: "Download link copied to clipboard", type: "success" })
      )
      .catch(() => setToast({ msg: "Failed to copy link", type: "error" }));
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
      {/* Toast */}
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
          <p className="mb-4 text-sm text-slate-300">
            Choose the vendor that should receive the encrypted file. You can
            also type an email manually if it’s not listed yet.
          </p>
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
        <section className="mb-14 rounded-lg border border-blue-700/40 bg-blue-900/20 p-6 shadow">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-blue-300">
            <UploadCloud size={18} />
            Upload & Encrypt
          </h2>
          <p className="mb-4 text-sm text-blue-200">
            Drag a file here or click to browse. The file will be encrypted
            before storage. Only the selected vendor will be able to download it
            (until revoked or expired).
          </p>

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
            />
            <button
              type="submit"
              disabled={uploading}
              className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? "Encrypting & Sending..." : "Send Secure File"}
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
                  files.map((f) => {
                    // NOTE: Until Flask is updated, metadata.recipient may contain "recipientEmail::senderEmail".
                    // We'll parse it:
                    let recipient = f.recipient ?? "";
                    let sender = "";
                    if (recipient.includes("::")) {
                      const [r, s] = recipient.split("::");
                      recipient = r;
                      sender = s;
                    }

                    // Filter (optional): show only those you sent
                    // If sender metadata available and not you, hide
                    if (
                      sender &&
                      session.user.email &&
                      sender !== session.user.email
                    ) {
                      return null;
                    }

                    return (
                      <tr
                        key={f.file_id}
                        className="border-t border-slate-700 last:border-b-0"
                      >
                        <td className="px-4 py-2">
                          {f.original_filename || "(unknown)"}
                        </td>
                        <td className="px-4 py-2">{recipient || "-"}</td>
                        <td className="px-4 py-2">
                          <StatusBadge
                            revoked={f.revoked}
                            expiry_time={f.expiry_time}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyLink(f.file_id)}
                              className="rounded bg-slate-600 px-2 py-1 text-xs hover:bg-slate-500"
                            >
                              <span className="inline-flex items-center gap-1">
                                <LinkIcon size={14} />
                                Copy Link
                              </span>
                            </button>
                            {!f.revoked && (
                              <button
                                onClick={() => handleRevoke(f.file_id)}
                                className="rounded bg-yellow-600 px-2 py-1 text-xs text-black hover:bg-yellow-500"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <Ban size={14} />
                                  Revoke
                                </span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
