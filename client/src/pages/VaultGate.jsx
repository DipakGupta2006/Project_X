import { useEffect } from "react";
import { useVaultGate } from "./useVaultGate";
import { Link } from "react-router-dom";

const VaultGate = ({ onVerified }) => {
    const {
        step, questions, answers, setAnswers,
        otp, setOtp, masterPassword, setMasterPassword,
        loading, error, successMsg,
        attemptsLeft, isLocked, lockMessage,
        initGate, submitOtp, submitQuestions, submitMaster,
        isVerified, vaultToken, sendOtp, otpSent,
    } = useVaultGate();

    useEffect(() => { initGate(); }, []);

    useEffect(() => {
        if (isVerified && vaultToken) onVerified(vaultToken);
    }, [isVerified, vaultToken]);

    if (isLocked) return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center shadow-2xl">
                <div className="text-5xl mb-4">🔒</div>
                <h2 className="text-xl font-bold text-red-600 mb-2">Vault Locked</h2>
                <p className="text-gray-600 text-sm">{lockMessage}</p>
                {/* logout button */}
                <Link to="/login">Logout</Link>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="text-4xl mb-2">🔐</div>
                    <h2 className="text-xl font-bold text-gray-800">Vault Verification</h2>
                    <p className="text-sm text-gray-500 mt-1">Step {step} of 3</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
                        <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
                    </div>
                </div>

                {/* Success message */}
                {successMsg && (
                    <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-2 mb-4 text-center">
                        ✅ {successMsg}
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2 mb-4">
                        {error}
                        {attemptsLeft < 3 && <span className="block font-semibold">{attemptsLeft} attempt(s) remaining</span>}
                    </div>
                )}

                {/* Step 1 — OTP */}
                {step === 1 && (
                    <div>
                        <p className="text-sm text-gray-600 mb-3">Enter the OTP sent to your email.</p>
                        <input
                            type="text" maxLength={6} placeholder="Enter 6-digit OTP"
                            value={otp} onChange={(e) => setOtp(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button onClick={submitOtp} disabled={otp.length !== 6 || loading}
                            className="w-full mt-4 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                            {loading ? "Verifying..." : "Verify OTP"}
                        </button>
                        <button onClick={sendOtp} disabled={loading}
                            className="w-full mt-2 text-sm text-blue-600 hover:underline disabled:opacity-50 bg-transparent border-none cursor-pointer">
                            Resend OTP
                        </button>
                    </div>
                )}
                
                {/* Step 2 — Security Questions */}
                {step === 2 && (
                    <div>
                        <p className="text-sm text-gray-600 mb-3">Answer your security questions.</p>
                        {questions.map((q) => (
                            <div key={q.id} className="mb-4">
                                <label className="block text-sm text-gray-700 mb-1">{q.question}</label>
                                <input
                                    type="text" placeholder="Your answer"
                                    value={answers[q.id] || ""}
                                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        ))}
                        <button onClick={submitQuestions}
                            disabled={questions.some((q) => !answers[q.id]?.trim()) || loading}
                            className="w-full mt-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                            {loading ? "Verifying..." : "Verify Answers"}
                        </button>
                    </div>
                )}

                {/* Step 3 — Master Password */}
                {step === 3 && (
                    <div>
                        <p className="text-sm text-gray-600 mb-3">Enter your master password to unlock the vault.</p>
                        <input
                            type="password" placeholder="Master Password"
                            value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button onClick={submitMaster} disabled={!masterPassword || loading}
                            className="w-full mt-4 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                            {loading ? "Unlocking..." : "Unlock Vault 🔓"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VaultGate;