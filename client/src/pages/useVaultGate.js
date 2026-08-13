import { useState, useCallback } from "react";
import axios from "axios";
import axiosInstance from "../api/axiosInstance";

const BASE_URL = "http://localhost:3000/vault/gate";

export const useVaultGate = () => {
    const [step, setStep] = useState(1);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [otp, setOtp] = useState("");
    const [masterPassword, setMasterPassword] = useState("");
    const [isVerified, setIsVerified] = useState(false);
    const [vaultToken, setVaultToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [attemptsLeft, setAttemptsLeft] = useState(3);
    const [isLocked, setIsLocked] = useState(false);
    const [lockMessage, setLockMessage] = useState("");

    const getToken = () => localStorage.getItem("accessToken");
    const headers = () => ({ Authorization: `Bearer ${getToken()}` });

    const handleError = (err) => {
        const msg = err.response?.data?.message || "Something went wrong.";
        setError(msg);
        if (msg.includes("locked")) { setIsLocked(true); setLockMessage(msg); }
        const match = msg.match(/(\d+) attempt/);
        if (match) setAttemptsLeft(parseInt(match[1]));
    };

    const initGate = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [qRes] = await Promise.all([
                axiosInstance.get(`${BASE_URL}/questions`, { headers: headers() }),
                axiosInstance.post(`${BASE_URL}/send-otp`, {}, { headers: headers() }),
            ]);
            setQuestions(qRes.data.questions);
        } catch (err) { handleError(err); }
        finally { setLoading(false); }
    }, []);

    // Step 1 — OTP verify
    const submitOtp = useCallback(async () => {
        setLoading(true); setError(""); setSuccessMsg("");
        try {
            const res = await axiosInstance.post(`${BASE_URL}/verify-otp`, { otp }, { headers: headers() });
            setSuccessMsg(res.data.message);
            setTimeout(() => { setSuccessMsg(""); setStep(2); }, 1000);
        } catch (err) { handleError(err); }
        finally { setLoading(false); }
    }, [otp]);

    // Step 2 — Questions verify
    const submitQuestions = useCallback(async () => {
        setLoading(true); setError(""); setSuccessMsg("");
        try {
            const answersArray = questions.map((q) => ({ id: q.id, answer: answers[q.id] || "" }));
            const res = await axiosInstance.post(`${BASE_URL}/verify-questions`, { answers: answersArray }, { headers: headers() });
            setSuccessMsg(res.data.message);
            
            setTimeout(() => { setSuccessMsg(""); setStep(3); }, 1000);
        } catch (err) { handleError(err); }
        finally { setLoading(false); }
    }, [questions, answers]);

    // Step 3 — Master password verify
    const submitMaster = useCallback(async () => {
        setLoading(true); setError(""); setSuccessMsg("");
        try {
            const res = await axiosInstance.post(`${BASE_URL}/verify-master`, { masterPassword }, { headers: headers() });
            setSuccessMsg("Vault unlocked! Loading your vault...");
            setTimeout(() => { setVaultToken(res.data.vaultSessionToken); setIsVerified(true); }, 1200);
        } catch (err) { handleError(err); }
        finally { setLoading(false); }
    }, [masterPassword]);

    return {
        step, questions, answers, setAnswers,
        otp, setOtp, masterPassword, setMasterPassword,
        isVerified, vaultToken, loading, error, successMsg,
        attemptsLeft, isLocked, lockMessage,
        initGate, submitOtp, submitQuestions, submitMaster,
    };
};