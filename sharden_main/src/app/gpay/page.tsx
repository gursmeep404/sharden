"use client";
import { useState } from "react";

export default function GPayPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [balance, setBalance] = useState<string | null>(null);

  const checkBalance = async () => {
    try {
      const res = await fetch("http://localhost:3000/get_balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, accountNumber }),
      });
      const data = await res.json();
      setBalance(data.balance);
    } catch (err) {
      console.error("Error fetching balance:", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">
          GPay Balance Checker
        </h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="text"
          placeholder="Account Number"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={checkBalance}
          className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition"
        >
          Check Balance
        </button>
        {balance && (
          <div className="mt-4 text-center text-green-600 font-semibold text-lg">
            Balance: ₹{balance}
          </div>
        )}
      </div>
    </div>
  );
}
