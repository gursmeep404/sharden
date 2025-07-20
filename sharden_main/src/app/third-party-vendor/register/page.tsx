"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VendorRegister() {
  const router = useRouter();
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorPassword, setVendorPassword] = useState("");
  const [vendorDocs, setVendorDocs] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleRegister = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("http://localhost:3000/reqverification/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_name: vendorName,
          vendor_email: vendorEmail,
          vendor_password: vendorPassword,
          vendor_documentation: vendorDocs,
        }),
      });

      if (response.ok) {
        setMessage("Vendor registration request submitted successfully!");
        setVendorName("");
        setVendorEmail("");
        setVendorPassword("");
        setVendorDocs("");
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || "Failed to register vendor.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error connecting to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-background flex flex-col">
      {/* Header */}
      <div className="bg-[hsl(220,30%,8%)] shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[hsl(210,100%,50%)] to-[hsl(45,93%,47%)] bg-clip-text text-transparent">
              SHARDEN - Vendor Registration
            </h1>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/third-party-vendor")}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push("/")}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Centered Form */}
      <div className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div
          className="p-8 rounded-2xl shadow-xl max-w-lg w-full 
          bg-gradient-to-br from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.1)] 
          backdrop-blur-md border border-[rgba(255,255,255,0.2)]"
        >
          <h2 className="text-2xl font-bold mb-6 text-center text-white">
            Register Vendor
          </h2>

          <input
            type="text"
            placeholder="Vendor Name"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            className="w-full p-3 mb-4 rounded-lg bg-[rgba(255,255,255,0.15)] 
                       text-white placeholder-gray-300 
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="email"
            placeholder="Vendor Email"
            value={vendorEmail}
            onChange={(e) => setVendorEmail(e.target.value)}
            className="w-full p-3 mb-4 rounded-lg bg-[rgba(255,255,255,0.15)] 
                       text-white placeholder-gray-300 
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="password"
            placeholder="Vendor Password"
            value={vendorPassword}
            onChange={(e) => setVendorPassword(e.target.value)}
            className="w-full p-3 mb-4 rounded-lg bg-[rgba(255,255,255,0.15)] 
                       text-white placeholder-gray-300 
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="text"
            placeholder="Vendor Documentation URL"
            value={vendorDocs}
            onChange={(e) => setVendorDocs(e.target.value)}
            className="w-full p-3 mb-4 rounded-lg bg-[rgba(255,255,255,0.15)] 
                       text-white placeholder-gray-300 
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <button
            onClick={handleRegister}
            disabled={loading}
            className={`w-full p-3 rounded-lg text-white font-semibold 
                        ${
                          loading
                            ? "bg-gray-500"
                            : "bg-green-600 hover:bg-green-700"
                        } transition`}
          >
            {loading ? "Registering..." : "Register"}
          </button>

          {message && (
            <div className="mt-4 text-center font-medium text-gray-200">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
