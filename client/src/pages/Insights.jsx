import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import VaultGate from "./VaultGate";
import axiosInstance from '../api/axiosInstance';

// Password Rules
const RULES = [
  { id: 'minLength', label: 'At least 12 characters', test: p => p.length >= 12 },
  { id: 'uppercase', label: 'At least 3 uppercase letters', test: p => (p.match(/[A-Z]/g) || []).length >= 3 },
  { id: 'lowercase', label: 'At least 2 lowercase letters', test: p => (p.match(/[a-z]/g) || []).length >= 2 },
  { id: 'numbers', label: 'At least 2 numbers', test: p => (p.match(/[0-9]/g) || []).length >= 2 },
  { id: 'special', label: 'At least 5 special characters', test: p => (p.match(/[^a-zA-Z0-9]/g) || []).length >= 5 },
  { id: 'noSpaces', label: 'No spaces allowed', test: p => !/\s/.test(p) },
  { id: 'length16', label: 'Bonus: 16+ characters', test: p => p.length >= 16 },
];

const getStrength = (pwd) => {
  if (!pwd) return { label: 'N/A', color: 'text-gray-400', barColor: 'bg-gray-200', percent: 0 };
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
  if (score <= 2) return { label: 'Weak', color: 'text-red-500', barColor: 'bg-red-400', percent };
  if (score <= 4) return { label: 'Medium', color: 'text-yellow-500', barColor: 'bg-yellow-400', percent };
  if (score <= 6) return { label: 'Strong', color: 'text-green-500', barColor: 'bg-green-400', percent };
  return { label: 'Very Strong', color: 'text-emerald-600', barColor: 'bg-emerald-500', percent };
};

const Insights = () => {
  const [vaultToken, setVaultToken] = useState(null);

  // Rule-based generator
  const [ruleInput, setRuleInput] = useState('');
  const [ruleCopied, setRuleCopied] = useState(false);
  const allRulesPassed = RULES.every(r => r.test(ruleInput));

  // AI Analyzer
  const [aiInput, setAiInput] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);

  // Vault Analysis
  const [summary, setSummary] = useState(null);
  const [passwords, setPasswords] = useState([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [filterLabel, setFilterLabel] = useState('All');

  useEffect(() => {
    if (vaultToken) fetchAnalysis();
  }, [vaultToken]);

  const fetchAnalysis = async () => {
    setVaultLoading(true);
    try {
      const res = await axiosInstance.get('/vault/analyze-passwords', {
        headers: { 'x-vault-session': vaultToken },
      });
      if (res.data.success) {
        setSummary(res.data.summary);
        setPasswords(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVaultLoading(false);
    }
  };

  const analyzeWithAI = async () => {
    if (!aiInput) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Analyze this password and give a security report: "${aiInput}"
            
Return ONLY a JSON object (no markdown, no backticks) with:
{
  "score": <number 0-100>,
  "label": "<Weak|Medium|Strong|Very Strong>",
  "summary": "<2 sentence overall assessment>",
  "strengths": ["<strength1>", "<strength2>"],
  "weaknesses": ["<weakness1>", "<weakness2>"],
  "suggestion": "<one improved version of the password>"
}`
          }]
        })
      });
      const data = await response.json();
      const text = data.content[0].text;
      const parsed = JSON.parse(text);
      setAiResult(parsed);
    } catch (err) {
      console.error(err);
      setAiResult({ error: true });
    } finally {
      setAiLoading(false);
    }
  };

  const filteredPasswords = filterLabel === 'All'
    ? passwords
    : passwords.filter(p => p.label === filterLabel);

  const labelColor = (label) => {
    if (label === 'Weak') return 'text-red-500 bg-red-50';
    if (label === 'Medium') return 'text-yellow-600 bg-yellow-50';
    if (label === 'Strong') return 'text-green-600 bg-green-50';
    return 'text-emerald-600 bg-emerald-50';
  };

  const barColor = (label) => {
    if (label === 'Weak') return 'bg-red-400';
    if (label === 'Medium') return 'bg-yellow-400';
    if (label === 'Strong') return 'bg-green-400';
    return 'bg-emerald-500';
  };

  return (
    <div>
      <Navbar />
      {!vaultToken && <VaultGate onVerified={(token) => setVaultToken(token)} />}
      <div className={!vaultToken ? "blur-sm pointer-events-none select-none" : ""}>
        <div className="p-6 flex flex-col gap-8">

          {/* ── SECTION 1: Rule-Based Password Builder ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-1">🛡️ Rule-Based Password Builder</h2>
            <p className="text-sm text-gray-400 mb-4">Build a password that meets all security rules below.</p>

            <input
              type="text"
              value={ruleInput}
              onChange={e => setRuleInput(e.target.value)}
              placeholder="Type your password here..."
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {RULES.map(rule => {
                const passed = ruleInput ? rule.test(ruleInput) : false;
                return (
                  <div key={rule.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                    ${passed ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                    <span>{passed ? '✅' : '⭕'}</span>
                    {rule.label}
                  </div>
                );
              })}
            </div>

            {allRulesPassed && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <span className="text-green-700 text-sm font-semibold">🎉 All rules passed!</span>
                <button onClick={() => { navigator.clipboard.writeText(ruleInput); setRuleCopied(true); setTimeout(() => setRuleCopied(false), 2000); }}
                  className="ml-auto text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                  {ruleCopied ? '✅ Copied!' : '📋 Copy Password'}
                </button>
              </div>
            )}
          </div>

          {/* ── SECTION 2: AI Password Analyzer ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-1">🤖 AI Password Analyzer</h2>
            <p className="text-sm text-gray-400 mb-4">Paste any password — AI will analyze its security in detail.</p>

            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                placeholder="Enter password to analyze..."
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button onClick={analyzeWithAI} disabled={!aiInput || aiLoading}
                className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {aiLoading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>

            {aiResult && !aiResult.error && (
              <div className="flex flex-col gap-4">
                {/* Score */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className={`text-sm font-bold ${getStrength(aiInput).color}`}>{aiResult.label}</span>
                    <span className={`text-sm font-bold ${getStrength(aiInput).color}`}>{aiResult.score}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${getStrength(aiInput).barColor}`}
                      style={{ width: `${aiResult.score}%` }} />
                  </div>
                </div>

                {/* Summary */}
                <p className="text-sm text-gray-600">{aiResult.summary}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-green-700 mb-2">✅ Strengths</p>
                    {aiResult.strengths?.map((s, i) => (
                      <p key={i} className="text-xs text-green-600">• {s}</p>
                    ))}
                  </div>
                  {/* Weaknesses */}
                  <div className="bg-red-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-red-700 mb-2">⚠️ Weaknesses</p>
                    {aiResult.weaknesses?.map((w, i) => (
                      <p key={i} className="text-xs text-red-600">• {w}</p>
                    ))}
                  </div>
                </div>

                {/* Suggestion */}
                {aiResult.suggestion && (
                  <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-xs text-indigo-500 mb-0.5">💡 Suggested stronger password:</p>
                      <p className="font-mono text-sm text-indigo-800">{aiResult.suggestion}</p>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(aiResult.suggestion); setAiCopied(true); setTimeout(() => setAiCopied(false), 2000); }}
                      className="ml-3 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 whitespace-nowrap">
                      {aiCopied ? '✅' : '📋'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {aiResult?.error && (
              <p className="text-sm text-red-500">Analysis failed. Try again.</p>
            )}
          </div>

          {/* ── SECTION 3: Vault Password Health ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4">📊 Vault Password Health</h2>

            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                {[
                  { label: 'Total', value: summary.total, color: 'bg-gray-50 text-gray-700' },
                  { label: 'Weak', value: summary.weak, color: 'bg-red-50 text-red-600' },
                  { label: 'Medium', value: summary.medium, color: 'bg-yellow-50 text-yellow-600' },
                  { label: 'Strong', value: summary.strong, color: 'bg-green-50 text-green-600' },
                  { label: 'Avg Score', value: `${summary.avgScore}%`, color: 'bg-indigo-50 text-indigo-600' },
                ].map(card => (
                  <div key={card.label} className={`rounded-xl px-4 py-3 text-center ${card.color}`}>
                    <p className="text-xl font-bold">{card.value}</p>
                    <p className="text-xs mt-0.5">{card.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Filter */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {['All', 'Weak', 'Medium', 'Strong', 'Very Strong'].map(f => (
                <button key={f} onClick={() => setFilterLabel(f)}
                  className={`px-3 py-1 rounded-full text-xs border transition-all
                    ${filterLabel === f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                  {f}
                </button>
              ))}
            </div>

            {vaultLoading ? <p className="text-sm text-gray-400">Loading...</p> : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500">
                    <th className="px-4 py-2 border-b">#</th>
                    <th className="px-4 py-2 border-b">App</th>
                    <th className="px-4 py-2 border-b">Category</th>
                    <th className="px-4 py-2 border-b">Score</th>
                    <th className="px-4 py-2 border-b">Strength</th>
                    <th className="px-4 py-2 border-b">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPasswords.map((p, i) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border-b text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2 border-b font-medium">{p.app_name}</td>
                      <td className="px-4 py-2 border-b text-gray-500">{p.category}</td>
                      <td className="px-4 py-2 border-b">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${barColor(p.label)}`}
                              style={{ width: `${p.score}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{p.score}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-b">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${labelColor(p.label)}`}>
                          {p.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 border-b">
                        <div className="flex gap-1 flex-wrap">
                          {p.has_upper && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">A-Z</span>}
                          {p.has_lower && <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">a-z</span>}
                          {p.has_number && <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded">0-9</span>}
                          {p.has_special && <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">!@#</span>}
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{p.length}chr</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;