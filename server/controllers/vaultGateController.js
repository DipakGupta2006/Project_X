const pool = require("../config/db");
const crypto = require("crypto");
const { comparePassword } = require("../utils/hash");
const { sendOtpEmail } = require("../utils/sendEmail");

const vaultAttempts = new Map();

const checkLock = async (userId) => {
    const [rows] = await pool.query("SELECT vault_locked_until FROM users WHERE id = ?", [userId]);
    const { vault_locked_until } = rows[0];
    if (vault_locked_until && new Date() < new Date(vault_locked_until)) {
        const remaining = Math.ceil((new Date(vault_locked_until) - new Date()) / 60000);
        return { locked: true, remaining };
    }
    return { locked: false };
};

const handleFail = async (userId, req, res, message) => {
    if (!vaultAttempts.has(userId)) vaultAttempts.set(userId, { count: 0 });
    const attemptData = vaultAttempts.get(userId);
    attemptData.count += 1;

    await pool.query(
        "INSERT INTO vault_attempt_log (user_id, attempt_type, ip_address) VALUES (?, 'fail', ?)",
        [userId, req.ip]
    );

    if (attemptData.count >= 3) {
        const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        await pool.query("UPDATE users SET vault_locked_until = ? WHERE id = ?", [lockUntil, userId]);
        vaultAttempts.delete(userId);
        return res.status(403).json({ success: false, message: "3 attempts failed. Vault locked for 30 minutes." });
    }

    const remaining = 3 - attemptData.count;
    return res.status(400).json({ success: false, message: `${message} ${remaining} attempt(s) remaining.` });
};

// ── GET /vault/gate/questions ─────────────────────────────────────────────────
const getVaultQuestions = async (req, res) => {
    try {
        const userId = req.user.id;
        const lock = await checkLock(userId);
        if (lock.locked) return res.status(403).json({ success: false, message: `Vault locked. Try again after ${lock.remaining} minute(s).` });

        const [rows] = await pool.query(
            "SELECT id, question FROM security_questions WHERE user_id = ?",
            [userId]
        );
        const shuffled = rows.sort(() => Math.random() - 0.5).slice(0, 3);
        return res.status(200).json({ success: true, questions: shuffled });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Something went wrong." });
    }
};

// ── POST /vault/gate/send-otp ─────────────────────────────────────────────────
const sendVaultOtp = async (req, res) => {
    try {
        const userId = req.user.id;
        const lock = await checkLock(userId);
        if (lock.locked) return res.status(403).json({ success: false, message: `Vault locked. Try again after ${lock.remaining} minute(s).` });

        const [userRows] = await pool.query("SELECT email FROM users WHERE id = ?", [userId]);
        const { email } = userRows[0];

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        await pool.query("DELETE FROM otp_tokens WHERE user_id = ?", [userId]);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await pool.query("INSERT INTO otp_tokens (user_id, otp, expires_at) VALUES (?, ?, ?)", [userId, otp, expiresAt]);
        await sendOtpEmail(email, otp);

        return res.status(200).json({ success: true, message: "OTP sent to your email." });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Something went wrong." });
    }
};

// ── POST /vault/gate/verify-otp ───────────────────────────────────────────────
const verifyVaultOtp = async (req, res) => {
    try {
        const userId = req.user.id;
        const { otp } = req.body;

        const lock = await checkLock(userId);
        if (lock.locked) return res.status(403).json({ success: false, message: `Vault locked. Try again after ${lock.remaining} minute(s).` });

        const [otpRows] = await pool.query("SELECT * FROM otp_tokens WHERE user_id = ?", [userId]);
        if (otpRows.length === 0) return handleFail(userId, req, res, "OTP not found.");
        if (new Date() > new Date(otpRows[0].expires_at)) {
            await pool.query("DELETE FROM otp_tokens WHERE user_id = ?", [userId]);
            return handleFail(userId, req, res, "OTP expired.");
        }
        if (otpRows[0].otp !== String(otp)) return handleFail(userId, req, res, "Incorrect OTP.");

        await pool.query("DELETE FROM otp_tokens WHERE user_id = ?", [userId]);
        return res.status(200).json({ success: true, message: "OTP verified successfully." });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Something went wrong." });
    }
};

// ── POST /vault/gate/verify-questions ────────────────────────────────────────
const verifyVaultQuestions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { answers } = req.body; // [{ id, answer }]

        const lock = await checkLock(userId);
        if (lock.locked) return res.status(403).json({ success: false, message: `Vault locked. Try again after ${lock.remaining} minute(s).` });

        for (const ans of answers) {
            const [qRows] = await pool.query(
                "SELECT answer_hash FROM security_questions WHERE id = ? AND user_id = ?",
                [ans.id, userId]
            );
            if (qRows.length === 0) return handleFail(userId, req, res, "Invalid question.");
            const isCorrect = await comparePassword(ans.answer, qRows[0].answer_hash);
            if (!isCorrect) return handleFail(userId, req, res, "Incorrect security answer.");
        }

        return res.status(200).json({ success: true, message: "Security questions verified." });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Something went wrong." });
    }
};

// ── POST /vault/gate/verify-master ───────────────────────────────────────────
const verifyVaultMaster = async (req, res) => {
    try {
        const userId = req.user.id;
        const { masterPassword } = req.body;

        const lock = await checkLock(userId);
        if (lock.locked) return res.status(403).json({ success: false, message: `Vault locked. Try again after ${lock.remaining} minute(s).` });

        const [userRows] = await pool.query("SELECT master_password_hash FROM users WHERE id = ?", [userId]);
        const isCorrect = await comparePassword(masterPassword, userRows[0].master_password_hash);
        if (!isCorrect) return handleFail(userId, req, res, "Incorrect master password.");

        // All passed — create vault session
        vaultAttempts.delete(userId);
        const sessionToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await pool.query(
            "INSERT INTO vault_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)",
            [userId, sessionToken, expiresAt]
        );
        await pool.query(
            "INSERT INTO vault_attempt_log (user_id, attempt_type, ip_address) VALUES (?, 'success', ?)",
            [userId, req.ip]
        );

        return res.status(200).json({ success: true, message: "Vault unlocked. Welcome!", vaultSessionToken: sessionToken });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Something went wrong." });
    }
};

module.exports = { getVaultQuestions, sendVaultOtp, verifyVaultOtp, verifyVaultQuestions, verifyVaultMaster };