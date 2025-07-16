"use client";
import { useState } from "react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Please select a file!");

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("recipient", "Printer001");

    try {
      const res = await fetch("http://127.0.0.1:5000/api/files", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      console.log("API Response:", data);
      setResult(data);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Upload File</h1>
      <form onSubmit={handleUpload}>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </button>
      </form>

      {result && (
        <div
          style={{
            border: "1px solid #ccc",
            padding: "10px",
            marginTop: "10px",
          }}
        >
          <h3>Upload Successful</h3>
          <p>
            <b>Encrypted File ID:</b> {result.file_id}
          </p>
          <p>
            <b>Original Name:</b> {result.original_filename}
          </p>
          <p>
            <b>Expires At:</b>{" "}
            {new Date(result.expiry_time * 1000).toLocaleString()}
          </p>
          <a
            href={`http://127.0.0.1:5000/api/files/${result.file_id}/download`}
            download
          >
            Download & Decrypt
          </a>
          <button
            style={{
              backgroundColor: "red",
              color: "white",
              marginLeft: "10px",
            }}
            onClick={async () => {
              await fetch(
                `http://127.0.0.1:5000/api/files/${result.file_id}/revoke`,
                {
                  method: "POST",
                }
              );
              alert("Access Revoked!");
            }}
          >
            Revoke Access
          </button>
        </div>
      )}
    </div>
  );
}
