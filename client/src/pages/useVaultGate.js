import { useState, useCallback } from "react";
import axios from "axios";

const BASE_URL = "http://localhost:3000/vault/gate";

export const useVaultGate = () => {
    const [step, setStep] = useState(1); // 1: OTP, 2: Questions, 3: Master Password
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [otp, setOtp] = useState("");
    const [masterPassword, setMasterPassword] = useState("");
    const [isVerified, setIsVerified] = useState(false);
    const [vaultToken, setVaultToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [attemptsLeft, setAttemptsLeft] = useState(3);
    const [isLocked, setIsLocked] = useState(false);
    const [lockMessage, setLockMessage] = useState("");

    const getToken = () => localStorage.getItem("accessToken");

    // Step 1 init — questions fetch + OTP send
    const initGate = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const token = getToken();
            const headers = { Authorization: `Bearer ${token}` };

            const [qRes, otpRes] = await Promise.all([
                axios.get(`${BASE_URL}/questions`, { headers }),
                axios.post(`${BASE_URL}/send-otp`, {}, { headers }),
            ]);

            setQuestions(qRes.data.questions);
        } catch (err) {
            setError("Failed to initialize vault gate. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    // Verify — final submit
    const verifyGate = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const token = getToken();
            const answersArray = questions.map((q) => ({
                id: q.id,
                answer: answers[q.id] || "",
            }));

            const res = await axios.post(
                `${BASE_URL}/verify`,
                { otp, answers: answersArray, masterPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setVaultToken(res.data.vaultSessionToken);
            setIsVerified(true);

        } catch (err) {
            const msg = err.response?.data?.message || "Verification failed.";
            setError(msg);

            if (msg.includes("locked")) {
                setIsLocked(true);
                setLockMessage(msg);
            } else {
                // attempts remaining extract karo message se
                const match = msg.match(/(\d+) attempt/);
                if (match) setAttemptsLeft(parseInt(match[1]));
            }
        } finally {
            setLoading(false);
        }
    }, [otp, answers, masterPassword, questions]);

    return {
        step, setStep,
        questions,
        answers, setAnswers,
        otp, setOtp,
        masterPassword, setMasterPassword,
        isVerified,
        vaultToken,
        loading,
        error,
        attemptsLeft,
        isLocked,
        lockMessage,
        initGate,
        verifyGate,
    };
};