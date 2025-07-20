"use client";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/dashboard");
        const data = await res.json();
        setFiles(data.files || []);
      } catch (err) {
        console.error("Error fetching dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center text-white">
        Loading Dashboard...
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Header */}
      <div className="bg-[hsl(220,30%,8%)] shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-[hsl(45,93%,47%)]">
              File Transfer Dashboard
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-3xl font-bold text-white mb-6">
            All Secure File Transfers
          </h2>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full border border-gray-300 text-gray-900">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Filename</th>
                  <th className="px-4 py-2 text-left">Sender</th>
                  <th className="px-4 py-2 text-left">Recipient</th>
                  <th className="px-4 py-2 text-left">Expiry</th>
                  <th className="px-4 py-2 text-left">Revoked</th>
                  <th className="px-4 py-2 text-left">Logs</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">{file.filename}</td>
                    <td className="px-4 py-2">{file.sender_email}</td>
                    <td className="px-4 py-2">{file.recipient_email}</td>
                    <td className="px-4 py-2">
                      {file.expiry_time
                        ? new Date(file.expiry_time).toLocaleString()
                        : "N/A"}
                    </td>
                    <td className="px-4 py-2">{file.revoked ? "Yes" : "No"}</td>
                    <td className="px-4 py-2">
                      {file.logs.length > 0 ? file.logs[0].action : "No Logs"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
