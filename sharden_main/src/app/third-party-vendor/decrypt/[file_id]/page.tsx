"use client";

import { useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";


export default function VendorDecryptFileIdPage() {
  const router = useRouter();
  const params = useParams(); // { file_id: "..." }
  const searchParams = useSearchParams();

  useEffect(() => {
    const file_id = params?.file_id?.toString() || "";
    if (!file_id) {
      router.replace("/third-party-vendor/decrypt");
      return;
    }
    // Preserve any existing query params; inject file_id
    const sp = new URLSearchParams(searchParams?.toString() || "");
    sp.set("file_id", file_id);
    // Preserve hash (#k=..., &iv=...) Router can't directly; fall back to window if client.
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    router.replace(`/third-party-vendor/decrypt?${sp.toString()}${hash}`);
  }, [router, params, searchParams]);

  return null; 
}
