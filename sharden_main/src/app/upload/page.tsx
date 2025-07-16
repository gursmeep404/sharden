"use client";
import { useState } from "react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("recipient", "Printer001");

    const res = await fetch("http://127.0.0.1:5000/api/files", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setResult(data);
  };

  return (
    <div>
      <h1>Upload File</h1>
      <form onSubmit={handleUpload}>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button type="submit">Upload</button>
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
            <b>Encrypted File:</b> {result.filename}
          </p>
          <p>
            <b>Expires At:</b> {result.expiry_str}
          </p>
          <a
            href={`http://127.0.0.1:5000/api/files/${result.filename}`}
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
                `http://127.0.0.1:5000/api/files/${result.filename}/revoke`,
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
