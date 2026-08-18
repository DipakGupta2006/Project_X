import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import axiosInstance from '../api/axiosInstance';

const Lab = () => {
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    special: true,
    avoidSimilar: false,
    excludeAmbiguous: false,
    includeSpaces: false,
    easyToRead: false,
  });
  const [passwordType, setPasswordType] = useState('Random');
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [copiedHistoryId, setCopiedHistoryId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [multiPasswords, setMultiPasswords] = useState([]);
  const [copiedMultiId, setCopiedMultiId] = useState(null);
  const [pwnedResult, setPwnedResult] = useState(null);
  const [pwnedLoading, setPwnedLoading] = useState(false);
  const [autoRegenerate, setAutoRegenerate] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (autoRegenerate) generatePasswords();
  }, [options, length, passwordType, quantity, autoRegenerate]);

  const fetchHistory = async () => {
    try {
      const res = await axiosInstance.get('/vault/password-history');
      if (res.data.success) setHistory(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleOption = (key) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const clearAll = () => {
    setOptions({
      uppercase: false, lowercase: false, numbers: false,
      special: false, avoidSimilar: false, excludeAmbiguous: false,
      includeSpaces: false, easyToRead: false,
    });
  };

  const generateSingle = useCallback(() => {
    let chars = '';
    let result = '';

    if (passwordType === 'PIN') {
      return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
    }

    if (passwordType === 'Passphrase') {
      const words = ['apple', 'tiger', 'cloud', 'river', 'storm', 'flame', 'ocean', 'forest', 'mountain', 'eagle', 'brick', 'silver', 'noble', 'brave', 'swift'];
      return Array.from({ length: 4 }, () => words[Math.floor(Math.random() * words.length)]).join('-');
    }

    if (passwordType === 'Memorable') {
      const consonants = 'bcdfghjklmnprstvwxyz';
      const vowels = 'aeiou';
      for (let i = 0; i < length; i++) {
        result += i % 2 === 0
          ? consonants[Math.floor(Math.random() * consonants.length)]
          : vowels[Math.floor(Math.random() * vowels.length)];
      }
      if (options.uppercase) result = result.charAt(0).toUpperCase() + result.slice(1);
      return result;
    }

    if (options.uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (options.lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (options.numbers) chars += '0123456789';
    if (options.special) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    if (options.includeSpaces) chars += ' ';

    if (options.avoidSimilar) {
      ['O', '0', 'I', 'l', '1'].forEach(c => { chars = chars.split(c).join(''); });
    }
    if (options.excludeAmbiguous) {
      ['{', '}', '[', ']', '(', ')', '/', '\\', "'", '"', '`', '~', ',', ';', ':', '.', '<', '>'].forEach(c => {
        chars = chars.split(c).join('');
      });
    }

    if (!chars) return 'Select at least one option!';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }, [options, length, passwordType]);

  const generatePasswords = useCallback(() => {
    setPwnedResult(null);
    if (quantity === 1) {
      const pwd = generateSingle();
      setPassword(pwd);
      setMultiPasswords([]);
    } else {
      const pwds = Array.from({ length: quantity }, () => generateSingle());
      setMultiPasswords(pwds);
      setPassword(pwds[0]);
    }
  }, [generateSingle, quantity]);

  const getStrength = (pwd = password) => {
    if (!pwd || pwd.length < 4) return { label: 'Weak', color: 'text-red-500', barColor: 'bg-red-400', score: 1, percent: 10 };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (pwd.length >= 16) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    if (pwd.length >= 20) score++;

    const percent = Math.round((score / 8) * 100);
    if (score <= 2) return { label: 'Weak', color: 'text-red-500', barColor: 'bg-red-400', score, percent };
    if (score <= 4) return { label: 'Medium', color: 'text-yellow-500', barColor: 'bg-yellow-400', score, percent };
    if (score <= 6) return { label: 'Strong', color: 'text-green-500', barColor: 'bg-green-400', score, percent };
    return { label: 'Very Strong', color: 'text-emerald-600', barColor: 'bg-emerald-500', score, percent };
  };

  const getEntropy = (pwd = password) => {
    if (!pwd) return 0;
    let charsetSize = 0;
    if (/[a-z]/.test(pwd)) charsetSize += 26;
    if (/[A-Z]/.test(pwd)) charsetSize += 26;
    if (/[0-9]/.test(pwd)) charsetSize += 10;
    if (/[^a-zA-Z0-9]/.test(pwd)) charsetSize += 32;
    if (charsetSize === 0) return 0;
    return Math.round(pwd.length * Math.log2(charsetSize));
  };

  const checkPwned = async () => {
    if (!password) return;
    setPwnedLoading(true);
    setPwnedResult(null);
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

      const prefix = hashHex.slice(0, 5);
      const suffix = hashHex.slice(5);

      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      const text = await response.text();
      const lines = text.split('\n');
      const found = lines.find(line => line.startsWith(suffix));

      if (found) {
        const count = found.split(':')[1].trim();
        setPwnedResult({ pwned: true, count });
      } else {
        setPwnedResult({ pwned: false });
      }
    } catch (err) {
      setPwnedResult({ error: true });
    } finally {
      setPwnedLoading(false);
    }
  };

  const copyToClipboard = async (pwd, historyId = null, multiIndex = null) => {
    await navigator.clipboard.writeText(pwd);

    if (historyId) {
      setCopiedHistoryId(historyId);
      setTimeout(() => setCopiedHistoryId(null), 2000);
    } else if (multiIndex !== null) {
      setCopiedMultiId(multiIndex);
      setTimeout(() => setCopiedMultiId(null), 2000);
      try {
        await axiosInstance.post('/vault/generate-password', { password: pwd });
        fetchHistory();
      } catch (err) { console.error(err); }
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      try {
        await axiosInstance.post('/vault/generate-password', { password: pwd });
        fetchHistory();
      } catch (err) { console.error(err); }
    }
  };

  const exportHistory = () => {
    const csv = ['Password,Created At', ...history.map(h => `"${h.password}","${new Date(h.created_at).toLocaleString()}"`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'password_history.csv';
    a.click();
  };

  const getHistoryAge = (createdAt) => {
    const days = Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24));
    if (days <= 7) return 'text-green-500';
    if (days <= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const strength = getStrength();
  const entropy = getEntropy();

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <Navbar />
      <div className="p-6 flex gap-6 flex-col lg:flex-row">

        {/* LEFT — Generator */}
        <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">🧪 Password Lab</h2>
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input type="checkbox" checked={autoRegenerate} onChange={e => setAutoRegenerate(e.target.checked)}
                className="accent-indigo-600" />
              Auto-regenerate
            </label>
          </div>

          {/* Single Password Display */}
          {quantity === 1 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between mb-3">
              <span className="font-mono text-sm break-all text-gray-800">{password || '—'}</span>
              <button onClick={() => copyToClipboard(password)}
                className="ml-3 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 whitespace-nowrap">
                {copied ? '✅ Copied!' : '📋 Copy'}
              </button>
            </div>
          )}

          {/* Multi Password Display */}
          {quantity > 1 && multiPasswords.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {multiPasswords.map((pwd, i) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 flex items-center justify-between">
                  <span className="font-mono text-xs break-all text-gray-800">{pwd}</span>
                  <button onClick={() => copyToClipboard(pwd, null, i)}
                    className="ml-3 text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 whitespace-nowrap">
                    {copiedMultiId === i ? '✅' : '📋'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Strength + Entropy */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-semibold ${strength.color}`}>{strength.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Entropy: <span className="font-bold text-gray-600">{entropy} bits</span></span>
                <span className={`text-sm font-bold ${strength.color}`}>{strength.percent}%</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all duration-500 ${strength.barColor}`}
                style={{ width: `${strength.percent}%` }} />
            </div>
          </div>

          {/* HIBP Check */}
          <div className="mb-4 flex items-center gap-3">
            <button onClick={checkPwned} disabled={pwnedLoading}
              className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-gray-900 disabled:opacity-50">
              {pwnedLoading ? 'Checking...' : '🔍 Check if Breached'}
            </button>
            {pwnedResult && (
              pwnedResult.error ? <span className="text-xs text-gray-400">Check failed.</span>
              : pwnedResult.pwned
                ? <span className="text-xs text-red-500 font-semibold">⚠️ Breached {pwnedResult.count}x — Change it!</span>
                : <span className="text-xs text-green-600 font-semibold">✅ Not found in breaches</span>
            )}
          </div>

          {/* Length */}
          <div className="mb-4">
            <label className="text-sm text-gray-600 font-medium">Length: <span className="font-bold text-gray-800">{length}</span></label>
            <input type="range" min={4} max={64} value={length}
              onChange={e => setLength(Number(e.target.value))}
              className="w-full mt-1 accent-indigo-600" />
          </div>

          {/* Quantity */}
          <div className="mb-4">
            <label className="text-sm text-gray-600 font-medium">Quantity: <span className="font-bold text-gray-800">{quantity}</span></label>
            <input type="range" min={1} max={10} value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="w-full mt-1 accent-indigo-600" />
          </div>

          {/* Password Type */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-600 mb-2">Password Type</p>
            <div className="flex gap-2 flex-wrap">
              {['Random', 'Memorable', 'PIN', 'Passphrase'].map(type => (
                <button key={type} onClick={() => setPasswordType(type)}
                  className={`px-3 py-1 rounded-full text-xs border transition-all
                    ${passwordType === type ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Character Options */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-gray-600">Character Options</p>
              <button onClick={clearAll} className="text-xs text-red-500 hover:underline">Clear All</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'uppercase', label: 'Uppercase (A-Z)' },
                { key: 'lowercase', label: 'Lowercase (a-z)' },
                { key: 'numbers', label: 'Numbers (0-9)' },
                { key: 'special', label: 'Special (!@#$%)' },
                { key: 'avoidSimilar', label: 'Avoid Similar (O,0,I,l)' },
                { key: 'excludeAmbiguous', label: 'Exclude Ambiguous' },
                { key: 'includeSpaces', label: 'Include Spaces' },
                { key: 'easyToRead', label: 'Easy to Read' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={options[key]} onChange={() => toggleOption(key)}
                    className="accent-indigo-600" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <button onClick={generatePasswords}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-all">
            🔁 Generate Password
          </button>
        </div>

        {/* RIGHT — History */}
        <div className="w-full lg:w-80 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-800">🕓 Password History</h3>
            {history.length > 0 && (
              <button onClick={exportHistory}
                className="text-xs text-indigo-600 hover:underline">
                ⬇️ Export CSV
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400">No history yet. Copy a password to save it.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map(h => (
                <div key={h.id}
                  className="group flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 hover:bg-indigo-50 transition-all">
                  <div>
                    <p className="font-mono text-xs text-gray-700 break-all">{h.password}</p>
                    <p className={`text-xs mt-0.5 font-medium ${getHistoryAge(h.created_at)}`}>
                      {formatTime(h.created_at)}
                    </p>
                  </div>
                  <button onClick={() => copyToClipboard(h.password, h.id)}
                    className="ml-2 text-xs text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {copiedHistoryId === h.id ? '✅' : '📋'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lab;