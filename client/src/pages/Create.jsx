import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import axiosInstance from '../api/axiosInstance';

const CATEGORIES = [
  'Social Media', 'Email', 'Development', 'Cloud', 'Hosting',
  'Banking', 'Finance', 'Shopping', 'Education', 'Work',
  'Entertainment', 'Gaming', 'Streaming', 'Travel', 'Healthcare',
  'Government', 'Utilities', 'Crypto', 'Business', 'Personal',
  'Family', 'WiFi', 'Software License', 'Servers', 'IoT', 'Others'
];

const TAGS = [
  'Personal', 'Office', 'College', 'Important', 'Favorite',
  'Shared', 'Daily Use', 'Temporary', 'Backup', '2FA Enabled',
  'Strong Password', 'Needs Update', 'Testing', 'Internship', 'Others'
];

const Create = () => {
  const [appname, setAppname] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState([]); // FIX 1: array, not string
  const [notes, setNotes] = useState('');
  const [favorite, setFavorite] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // FIX 2: tags onChange — array from selectedOptions
  const handleTagsChange = (e) => {
    const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setTags(selected);
  };

  // Quick Generate Password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}';
    let pwd = '';
    for (let i = 0; i < 16; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
    setConfirmPassword(pwd);
  };

  const handleReset = () => {
    setAppname('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setCategory('');
    setTags([]); // FIX 3: reset to array, not ''
    setNotes('');
    setFavorite(false); // FIX 4: reset to false, not ''
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!appname || !password || !category) {
      setError('App name, password, and category are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    const data = { appname, username, password, category, tags, notes, favorite };

    setLoading(true); // FIX 5: setLoading(true) before try
    try {
      const res = await axiosInstance.post('/vault/add-password', data);
      console.log(res.data);
      if (res.data.success) {
        setSuccess('Password saved to vault!');
        setTimeout(() => {   // yahan
          handleReset();
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Add Password</h1>
          <p className="text-gray-400 text-sm mt-1">Store a new credential in your vault</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* App Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              App / Website Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={appname}
              onChange={(e) => setAppname(e.target.value)}
              placeholder="e.g. Instagram, GitHub"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Username / Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. john@example.com"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-300">
                Password <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition"
              >
                ⚡ Quick Generate
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter or generate a password"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-sm"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Confirm Password <span className="text-red-400">*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
            )}
            {confirmPassword && password === confirmPassword && (
              <p className="text-green-400 text-xs mt-1">✓ Passwords match</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="" disabled>Select a category</option>
              {/* FIX 6: option value matches DB ENUM exactly */}
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Tags - Multiple Select */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Tags
              <span className="text-gray-500 text-xs ml-2">(Ctrl/Cmd + click to select multiple)</span>
            </label>
            <select
              multiple
              value={tags}
              onChange={handleTagsChange} // FIX 2: correct handler
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition h-36"
            >
              {TAGS.map(tag => (
                <option key={tag} value={tag} className="py-1">{tag}</option>
              ))}
            </select>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(tag => (
                  <span key={tag} className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this credential..."
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition resize-none"
            />
          </div>

          {/* Favorite */}
          <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3">
            <input
              type="checkbox"
              id="favorite"
              checked={favorite}
              onChange={(e) => setFavorite(e.target.checked)}
              className="w-4 h-4 accent-indigo-500 cursor-pointer"
            />
            <label htmlFor="favorite" className="text-sm text-gray-300 cursor-pointer select-none">
              ⭐ Mark as Favorite
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition"
            >
              {loading ? 'Saving...' : 'Save to Vault'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 rounded-lg transition"
            >
              Reset
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Create;