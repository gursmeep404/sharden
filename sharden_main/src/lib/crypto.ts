

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}


export async function encryptFileBrowser(file: File) {
  // Generate 256-bit AES-GCM key
  const key = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // 96-bit IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Read file into memory
  const plaintext = await file.arrayBuffer();

  // Encrypt
  const ciphertextBuf = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );

  // Export key (raw bytes) to base64
  const rawKey = await window.crypto.subtle.exportKey("raw", key);
  const keyBase64 = bufToB64(rawKey);
  const ivBase64 = bufToB64(iv.buffer);

  // Ciphertext Blob
  const ciphertextBlob = new Blob([ciphertextBuf], {
    type: "application/octet-stream",
  });

  return {
    ciphertextBlob,
    keyBase64,
    ivBase64,
    mimeType: file.type || "application/octet-stream",
    originalSize: plaintext.byteLength,
  };
}

/**
 * Decrypt ciphertext Blob using AES-GCM in browser.
 * keyBase64 and ivBase64 must match what was used to encrypt.
 * Returns a Blob (mimeType optional).
 */
export async function decryptFileBrowser(
  cipherBlob: Blob,
  keyBase64: string,
  ivBase64: string,
  mimeType?: string
): Promise<Blob> {
  const rawKeyBuf = b64ToBuf(keyBase64);
  const key = await window.crypto.subtle.importKey(
    "raw",
    rawKeyBuf,
    { name: "AES-GCM" },
    true,
    ["decrypt"]
  );

  const ivBuf = b64ToBuf(ivBase64);
  const iv = new Uint8Array(ivBuf);

  const ciphertext = await cipherBlob.arrayBuffer();

  const plaintextBuf = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new Blob([plaintextBuf], {
    type: mimeType || "application/octet-stream",
  });
}
