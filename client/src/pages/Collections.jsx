import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import VaultGate from "./VaultGate";
import axiosInstance from '../api/axiosInstance';

const Collections = () => {
  const [vaultToken, setVaultToken] = useState(null);
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(false);
  const [openCategory, setOpenCategory] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  useEffect(() => {
    if (vaultToken) fetchCollections();
  }, [vaultToken]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/vault/categories', {
        headers: { 'x-vault-session': vaultToken },
      });
      if (res.data.success) setGrouped(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (cat) => {
    setOpenCategory(prev => prev === cat ? null : cat);
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      <Navbar />
      {!vaultToken && <VaultGate onVerified={(token) => setVaultToken(token)} />}
      <div className={!vaultToken ? "blur-sm pointer-events-none select-none" : ""}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📁 Collections</h2>

          {loading ? <p>Loading...</p> : Object.keys(grouped).length === 0 ? (
            <p className="text-gray-500 text-sm">No passwords found.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {Object.entries(grouped).map(([category, passwords]) => (
                <div key={category} className="border border-gray-200 rounded-xl overflow-hidden">

                  <div onClick={() => toggleCategory(category)}
                    className="flex items-center justify-between px-5 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100">
                    <span className="font-semibold text-gray-700">{category}</span>
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        {passwords.length}
                      </span>
                      <span className="text-gray-400 text-sm">{openCategory === category ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {openCategory === category && (
                    <table className="w-full text-sm border-t border-gray-200">
                      <thead>
                        <tr className="bg-white text-left text-gray-500 text-xs">
                          <th className="px-4 py-2 border-b">#</th>
                          <th className="px-4 py-2 border-b">App</th>
                          <th className="px-4 py-2 border-b">Username</th>
                          <th className="px-4 py-2 border-b">Password</th>
                          <th className="px-4 py-2 border-b">Tags</th>
                          <th className="px-4 py-2 border-b">Favorite</th>
                        </tr>
                      </thead>
                      <tbody>
                        {passwords.map((p, i) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 border-b text-gray-400">{i + 1}</td>
                            <td className="px-4 py-2 border-b font-medium">{p.app_name}</td>
                            <td className="px-4 py-2 border-b text-gray-500">{p.username || '—'}</td>
                            <td className="px-4 py-2 border-b">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">
                                  {visiblePasswords[p.id] ? p.decrypted_password : '••••••••'}
                                </span>
                                <button onClick={() => togglePasswordVisibility(p.id)} className="text-sm">
                                  {visiblePasswords[p.id] ? '🙈' : '👁️'}
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-2 border-b">
                              {p.tags?.length > 0
                                ? p.tags.map(t => <span key={t} className="mr-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full">#{t}</span>)
                                : '—'}
                            </td>
                            <td className="px-4 py-2 border-b text-center">{p.is_favorite ? '⭐' : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Collections;