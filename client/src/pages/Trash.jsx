import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import VaultGate from "./VaultGate";
import axiosInstance from '../api/axiosInstance';

const DeleteVault = () => {
  const [vaultToken, setVaultToken] = useState(null);
  const [passwords, setPasswords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // jo delete hoga uska obj
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (vaultToken) fetchPasswords();
  }, [vaultToken]);

  const fetchPasswords = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/vault/view-password', {
        headers: { 'x-vault-session': vaultToken },
        params: { category: 'All' },
      });
      if (res.data.success) setPasswords(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await axiosInstance.delete(`/vault/delete-password/${deleteTarget.id}`, {
        headers: { 'x-vault-session': vaultToken },
      });
      if (res.data.success) {
        setPasswords(prev => prev.filter(p => p.id !== deleteTarget.id));
        setDeleteTarget(null);
        setSuccessMsg("Password deleted successfully.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <Navbar />
      {!vaultToken && <VaultGate onVerified={(token) => setVaultToken(token)} />}
      <div className={!vaultToken ? "blur-sm pointer-events-none select-none" : ""}>

        {/* Success message */}
        {successMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-2 rounded-lg shadow-lg z-50">
            ✅ {successMsg}
          </div>
        )}

        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Manage & Delete Passwords</h2>

          {loading ? <p>Loading...</p> : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="px-4 py-2 border">#</th>
                  <th className="px-4 py-2 border">App</th>
                  <th className="px-4 py-2 border">Username</th>
                  <th className="px-4 py-2 border">Category</th>
                  <th className="px-4 py-2 border">Action</th>
                </tr>
              </thead>
              <tbody>
                {passwords.map((p, i) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">{i + 1}</td>
                    <td className="px-4 py-2 border">{p.app_name}</td>
                    <td className="px-4 py-2 border">{p.username || '—'}</td>
                    <td className="px-4 py-2 border">{p.category}</td>
                    <td className="px-4 py-2 border">
                      <button onClick={() => setDeleteTarget(p)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-xs">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Confirmation Popup */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl text-center">
              <div className="text-4xl mb-3">🗑️</div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">Delete Password?</h3>
              <p className="text-sm text-gray-500 mb-5">
                Are you sure you want to delete <span className="font-semibold text-gray-700">"{deleteTarget.app_name}"</span>?
                It will be moved to trash and permanently deleted after 30 days.
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeleteTarget(null)}
                  className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm">
                  No, Keep It
                </button>
                <button onClick={handleDelete}
                  className="px-5 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm font-medium">
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeleteVault;