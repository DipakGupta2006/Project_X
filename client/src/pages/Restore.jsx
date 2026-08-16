import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import VaultGate from "./VaultGate";
import axiosInstance from '../api/axiosInstance';

const Restore = () => {
  const [vaultToken, setVaultToken] = useState(null);
  const [passwords, setPasswords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (vaultToken) fetchDeletedPasswords();
  }, [vaultToken]);

  const fetchDeletedPasswords = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/vault/recycle-bin-passwords', {
        headers: { 'x-vault-session': vaultToken },
      });
      if (res.data.success) setPasswords(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id) => {
    try {
      const res = await axiosInstance.put(`/vault/recycle-bin/${id}`, {}, {
        headers: { 'x-vault-session': vaultToken },
      });
      if (res.data.success) {
        setPasswords(prev => prev.filter(p => p.id !== id));
        setSuccessMsg("Password restored successfully.");
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

        {successMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-2 rounded-lg shadow-lg z-50">
            ✅ {successMsg}
          </div>
        )}

        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🗑️ Trash — Deleted Passwords</h2>

          {loading ? <p>Loading...</p> : passwords.length === 0 ? (
            <p className="text-gray-500 text-sm">No deleted passwords found.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="px-4 py-2 border">#</th>
                  <th className="px-4 py-2 border">App</th>
                  <th className="px-4 py-2 border">Username</th>
                  <th className="px-4 py-2 border">Category</th>
                  <th className="px-4 py-2 border">Tags</th>
                  <th className="px-4 py-2 border">Favorite</th>
                  <th className="px-4 py-2 border">Days Left</th>
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
                      {p.tags?.length > 0
                        ? p.tags.map(t => <span key={t} className="mr-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full">#{t}</span>)
                        : '—'}
                    </td>
                    <td className="px-4 py-2 border text-center">{p.is_favorite ? '⭐' : '—'}</td>
                    <td className="px-4 py-2 border">
                      <span className={`text-xs font-semibold ${p.days_left <= 5 ? 'text-red-500' : 'text-gray-600'}`}>
                        {p.days_left} day{p.days_left !== 1 ? 's' : ''} left
                      </span>
                    </td>
                    <td className="px-4 py-2 border">
                      <button onClick={() => handleRestore(p.id)}
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-xs">
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Restore;