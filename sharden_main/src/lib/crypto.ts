export async function encryptFile(file: File) {
  const key = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = await file.arrayBuffer();
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );

  // Export key to send to vendor
  const rawKey = await window.crypto.subtle.exportKey("raw", key);
  const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(rawKey)));

  return {
    ciphertext: new Blob([ciphertext]),
    keyBase64,
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptFile(
  cipherBlob: Blob,
  keyBase64: string,
  ivBase64: string
) {
  const rawKey = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  const key = await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    true,
    ["decrypt"]
  );

  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  const ciphertext = await cipherBlob.arrayBuffer();

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new Blob([decrypted]);
}
