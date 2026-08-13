import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import VaultGate from "./VaultGate";
import axiosInstance from '../api/axiosInstance';

const CATEGORIES = [
  'All', 'Social Media', 'Email', 'Development', 'Cloud', 'Hosting',
  'Banking', 'Finance', 'Shopping', 'Education', 'Work', 'Entertainment',
  'Gaming', 'Streaming', 'Travel', 'Healthcare', 'Government', 'Utilities',
  'Crypto', 'Business', 'Personal', 'Family', 'WiFi', 'Software License',
  'Servers', 'IoT', 'Others'
];
const Vault = () => {
  const [vaultToken, setVaultToken] = useState(null);
  const [allPasswords, setAllPasswords] = useState([]); // ← sab store karo
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vaultToken) {
      fetchPasswords(); // ← sirf ek baar, All fetch karo
    }
  }, [vaultToken]);

  const fetchPasswords = async () => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const res = await axiosInstance.get('/vault/view-password', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-vault-session': vaultToken,
        },
        params: { category: 'All' }, // ← hamesha All fetch karo
      });

      if (res.data.success) {
        setAllPasswords(res.data.data); // ← sab store
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ← Frontend pe filter
  const filteredPasswords = selectedCategory === 'All'
    ? allPasswords
    : allPasswords.filter(p => p.category === selectedCategory);

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat); // ← sirf state change, no API call
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      <Navbar />
      {!vaultToken && <VaultGate onVerified={(token) => setVaultToken(token)} />}

      <div className={!vaultToken ? "blur-sm pointer-events-none select-none" : ""}>
        <div style={{ padding: '20px' }}>
          <h2>My Vault</h2>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid #ccc',
                  background: selectedCategory === cat ? '#4f46e5' : '#f3f4f6',
                  color: selectedCategory === cat ? '#fff' : '#000',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : filteredPasswords.length === 0 ? (
            <p>No passwords found for "{selectedCategory}".</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filteredPasswords.map(item => (
                <div key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', background: '#fff' }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>{item.app_name}</h3>
                    <span style={{ fontSize: '11px', background: '#e0e7ff', padding: '2px 8px', borderRadius: '10px' }}>
                      {item.category}
                    </span>
                  </div>

                  <p style={{ margin: '8px 0 4px', color: '#6b7280', fontSize: '13px' }}>
                    👤 {item.username || '—'}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                      {visiblePasswords[item.id] ? item.decrypted_password : '••••••••'}
                    </span>
                    <button
                      onClick={() => togglePasswordVisibility(item.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                    >
                      {visiblePasswords[item.id] ? '🙈' : '👁️'}
                    </button>
                  </div>

                  {item.tags && item.tags.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {item.tags.map(tag => (
                        <span key={tag} style={{ fontSize: '11px', background: '#f3f4f6', padding: '2px 6px', borderRadius: '8px' }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.notes && (
                    <p style={{ marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>📝 {item.notes}</p>
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

export default Vault;