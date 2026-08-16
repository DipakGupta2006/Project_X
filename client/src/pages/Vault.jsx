import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import VaultGate from "./VaultGate";
import axiosInstance from '../api/axiosInstance';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  'Social Media', 'Email', 'Development', 'Cloud', 'Hosting',
  'Banking', 'Finance', 'Shopping', 'Education', 'Work',
  'Entertainment', 'Gaming', 'Streaming', 'Travel', 'Healthcare',
  'Government', 'Utilities', 'Crypto', 'Business', 'Personal',
  'Family', 'WiFi', 'Software License', 'Servers', 'IoT', 'Others'
];

const TAGS_OPTIONS = [
  'Personal', 'Office', 'College', 'Important', 'Favorite',
  'Shared', 'Daily Use', 'Temporary', 'Backup', '2FA Enabled',
  'Strong Password', 'Needs Update', 'Testing', 'Internship', 'Others'
];

const Vault = () => {
  const navigate = useNavigate();
  const [vaultToken, setVaultToken] = useState(null);
  const [allPasswords, setAllPasswords] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Edit modal state
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

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
      if (res.data.success) setAllPasswords(res.data.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPasswords = selectedCategory === 'All'
    ? allPasswords
    : allPasswords.filter(p => p.category === selectedCategory);

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openEditModal = (item) => {
    setEditTarget(item);
    setEditForm({
      app_name: item.app_name,
      username: item.username || '',
      password: '',
      category: item.category,
      tags: item.tags || [],
      notes: item.notes || '',
      is_favorite: item.is_favorite || 0,
    });
  };

  const handleTagToggle = (tag) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleUpdate = async () => {
    setEditLoading(true);
    try {
      const res = await axiosInstance.put(`/vault/update-password/${editTarget.id}`, editForm, {
        headers: { 'x-vault-session': vaultToken },
      });
      if (res.data.success) {
        setAllPasswords(prev => prev.map(p =>
          p.id === editTarget.id
            ? { ...p, ...editForm, decrypted_password: editForm.password || p.decrypted_password }
            : p
        ));
        setEditTarget(null);
        setSuccessMsg("Password updated successfully.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteRedirect = (item) => {
    navigate('/trash');
  };

  return (
    <div>
      <Navbar />
      {!vaultToken && <VaultGate onVerified={(token) => setVaultToken(token)} />}

      {/* Success message */}
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-2 rounded-lg shadow-lg z-50">
          ✅ {successMsg}
        </div>
      )}

      <div className={!vaultToken ? "blur-sm pointer-events-none select-none" : ""}>
        <div className="p-5">
          <h2 className="text-xl font-bold text-gray-800 mb-4">My Vault</h2>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap mb-5">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs border transition-all
                  ${selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                {cat}
              </button>
            ))}
          </div>

          {loading ? <p>Loading...</p>
            : filteredPasswords.length === 0 ? <p className="text-gray-500 text-sm">No passwords found for "{selectedCategory}".</p>
              : (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                  {filteredPasswords.map(item => (
                    <div key={item.id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-semibold text-gray-800">{item.app_name}</h3>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{item.category}</span>
                      </div>

                      <p className="text-sm text-gray-500 mb-2">👤 {item.username || '—'}</p>

                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm">
                          {visiblePasswords[item.id] ? item.decrypted_password : '••••••••'}
                        </span>
                        <button onClick={() => togglePasswordVisibility(item.id)}
                          className="text-base border-none bg-transparent cursor-pointer">
                          {visiblePasswords[item.id] ? '🙈' : '👁️'}
                        </button>
                      </div>

                      {item.tags?.length > 0 && (
                        <div className="flex gap-1 flex-wrap mb-2">
                          {item.tags.map(tag => (
                            <span key={tag} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">#{tag}</span>
                          ))}
                        </div>
                      )}

                      {item.notes && <p className="text-xs text-gray-400 mb-3">📝 {item.notes}</p>}

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => openEditModal(item)}
                          className="flex-1 bg-blue-500 text-white text-xs py-1.5 rounded-lg hover:bg-blue-600">
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleDeleteRedirect(item)}
                          className="flex-1 bg-red-500 text-white text-xs py-1.5 rounded-lg hover:bg-red-600">
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
        </div>
      </div>

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">✏️ Edit Password</h3>

            <div className="flex flex-col gap-3">
              <input value={editForm.app_name}
                onChange={e => setEditForm(p => ({ ...p, app_name: e.target.value }))}
                placeholder="App / Website name"
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />

              <input value={editForm.username}
                onChange={e => setEditForm(p => ({ ...p, username: e.target.value }))}
                placeholder="Username / Email"
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />

              <input type="password" value={editForm.password}
                onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                placeholder="New password (leave blank to keep same)"
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />

              <select value={editForm.category}
                onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {CATEGORIES.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Tags */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {TAGS_OPTIONS.map(tag => (
                    <button key={tag} onClick={() => handleTagToggle(tag)}
                      className={`text-xs px-2 py-1 rounded-full border transition-all
                        ${editForm.tags.includes(tag) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              <textarea value={editForm.notes}
                onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Notes (optional)"
                rows={2}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />

              {/* Favorite */}
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={editForm.is_favorite === 1}
                  onChange={e => setEditForm(p => ({ ...p, is_favorite: e.target.checked ? 1 : 0 }))} />
                ⭐ Mark as Favorite
              </label>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditTarget(null)}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleUpdate} disabled={editLoading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vault;