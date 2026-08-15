import { useState, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";

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
    const [otpSent, setOtpSent] = useState(false);

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
                axiosInstance.get("/vault/gate/questions"),
                axiosInstance.post("/vault/gate/send-otp", {}),
            ]);
            setQuestions(qRes.data.questions);
        } catch (err) { handleError(err); }
        finally { setLoading(false); }
    }, []);

    const sendOtp = useCallback(async () => {
        setLoading(true); setError(""); setSuccessMsg("");
        try {
            await axiosInstance.post("/vault/gate/send-otp", {});
            setSuccessMsg("New OTP sent to your email.");
            setTimeout(() => setSuccessMsg(""), 3000);
        } catch (err) { handleError(err); }
        finally { setLoading(false); }
    }, []);

    const submitOtp = useCallback(async () => {
        setLoading(true); setError(""); setSuccessMsg("");
        try {
            const res = await axiosInstance.post("/vault/gate/verify-otp", { otp });
            setSuccessMsg(res.data.message);
            setTimeout(() => { setSuccessMsg(""); setStep(2); }, 1000);
        } catch (err) { handleError(err); }
        finally { setLoading(false); }
    }, [otp]);

    const submitQuestions = useCallback(async () => {
        setLoading(true); setError(""); setSuccessMsg("");
        try {
            const answersArray = questions.map((q) => ({ id: q.id, answer: answers[q.id] || "" }));
            const res = await axiosInstance.post("/vault/gate/verify-questions", { answers: answersArray });
            setSuccessMsg(res.data.message);
            setTimeout(() => { setSuccessMsg(""); setStep(3); }, 1000);
        } catch (err) { handleError(err); }
        finally { setLoading(false); }
    }, [questions, answers]);

    const submitMaster = useCallback(async () => {
        setLoading(true); setError(""); setSuccessMsg("");
        try {
            const res = await axiosInstance.post("/vault/gate/verify-master", { masterPassword });
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
        initGate, submitOtp, submitQuestions, submitMaster, sendOtp, otpSent,
    };
};