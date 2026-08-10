const pool = require("../config/db");
const crypto = require("crypto");
const { comparePassword } = require("../utils/hash");
const { sendOtpEmail } = require("../utils/sendEmail");

const vaultAttempts = new Map();


const getRandomQuestions = async (userId) => {
    const [rows] = await pool.query(
        "SELECT id, question FROM security_questions WHERE user_id = ?",
        [userId]
    );
    const shuffled = rows.sort(() => Math.random() - 0.5).slice(0, 3);
    return shuffled; // [{ id, question }, ...]
};

const getVaultQuestions = async (req, res) => {
    try {
        const userId = req.user.id;

        const [userRows] = await pool.query(
            "SELECT vault_locked_until FROM users WHERE id = ?",
            [userId]
        );
        const { vault_locked_until } = userRows[0];
        if (vault_locked_until && new Date() < new Date(vault_locked_until)) {
            const remaining = Math.ceil((new Date(vault_locked_until) - new Date()) / 60000);
            return res.status(403).json({
                success: false,
                message: `Vault locked. Try again after ${remaining} minute(s).`,
            });
        }

        const questions = await getRandomQuestions(userId);
        return res.status(200).json({ success: true, questions });

    } catch (err) {
        console.error("getVaultQuestions error:", err.message);
        return res.status(500).json({ success: false, message: "Something went wrong." });
    }
};


const sendVaultOtp = async (req, res) => {
    try {
        const userId = req.user.id;

        const [userRows] = await pool.query(
            "SELECT email, vault_locked_until FROM users WHERE id = ?",
            [userId]
        );
        const { email, vault_locked_until } = userRows[0];

        if (vault_locked_until && new Date() < new Date(vault_locked_until)) {
            const remaining = Math.ceil((new Date(vault_locked_until) - new Date()) / 60000);
            return res.status(403).json({
                success: false,
                message: `Vault locked. Try again after ${remaining} minute(s).`,
            });
        }

        // OTP generate + save
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        await pool.query("DELETE FROM otp_tokens WHERE user_id = ?", [userId]);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await pool.query(
            "INSERT INTO otp_tokens (user_id, otp, expires_at) VALUES (?, ?, ?)",
            [userId, otp, expiresAt]
        );

        await sendOtpEmail(email, otp);

        return res.status(200).json({ success: true, message: "OTP sent to your email." });

    } catch (err) {
        console.error("sendVaultOtp error:", err.message);
        return res.status(500).json({ success: false, message: "Something went wrong." });
    }
};

const verifyVaultGate = async (req, res) => {
    try {
        const userId = req.user.id;
        const { otp, answers, masterPassword } = req.body;
        // answers = [{ id: questionId, answer: "..." }, ...]

        // 1. Lockout check
        const [userRows] = await pool.query(
            "SELECT vault_locked_until, master_password_hash FROM users WHERE id = ?",
            [userId]
        );
        const { vault_locked_until, master_password_hash } = userRows[0];

        if (vault_locked_until && new Date() < new Date(vault_locked_until)) {
            const remaining = Math.ceil((new Date(vault_locked_until) - new Date()) / 60000);
            return res.status(403).json({
                success: false,
                message: `Vault locked. Try again after ${remaining} minute(s).`,
            });
        }

        // 2. Attempt tracker init
        if (!vaultAttempts.has(userId)) {
            vaultAttempts.set(userId, { count: 0 });
        }
        const attemptData = vaultAttempts.get(userId);

        const failAndRespond = async (message) => {
            attemptData.count += 1;

            // Audit log
            await pool.query(
                "INSERT INTO vault_attempt_log (user_id, attempt_type, ip_address) VALUES (?, 'fail', ?)",
                [userId, req.ip]
            );

            if (attemptData.count >= 3) {
                const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
                await pool.query(
                    "UPDATE users SET vault_locked_until = ? WHERE id = ?",
                    [lockUntil, userId]
                );
                vaultAttempts.delete(userId);
                return res.status(403).json({
                    success: false,
                    message: "3 attempts failed. Vault locked for 30 minutes.",
                });
            }

            const remaining = 3 - attemptData.count;
            return res.status(400).json({
                success: false,
                message: `${message} ${remaining} attempt(s) remaining.`,
            });
        };

        // 3. OTP verify
        const [otpRows] = await pool.query(
            "SELECT * FROM otp_tokens WHERE user_id = ?",
            [userId]
        );
        if (otpRows.length === 0) return failAndRespond("OTP not found.");
        if (new Date() > new Date(otpRows[0].expires_at)) {
            await pool.query("DELETE FROM otp_tokens WHERE user_id = ?", [userId]);
            return failAndRespond("OTP expired.");
        }
        if (otpRows[0].otp !== String(otp)) return failAndRespond("Incorrect OTP.");

        // 4. Security questions verify
        for (const ans of answers) {
            const [qRows] = await pool.query(
                "SELECT answer_hash FROM security_questions WHERE id = ? AND user_id = ?",
                [ans.id, userId]
            );
            if (qRows.length === 0) return failAndRespond("Invalid question.");
            const isCorrect = await comparePassword(ans.answer, qRows[0].answer_hash);
            if (!isCorrect) return failAndRespond("Incorrect security answer.");
        }

        // 5. Master password verify
        const isMasterCorrect = await comparePassword(masterPassword, master_password_hash);
        if (!isMasterCorrect) return failAndRespond("Incorrect master password.");

        // 6. All passed — cleanup + session create
        await pool.query("DELETE FROM otp_tokens WHERE user_id = ?", [userId]);
        vaultAttempts.delete(userId);

        const sessionToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

        await pool.query(
            "INSERT INTO vault_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)",
            [userId, sessionToken, expiresAt]
        );

        // Audit log — success
        await pool.query(
            "INSERT INTO vault_attempt_log (user_id, attempt_type, ip_address) VALUES (?, 'success', ?)",
            [userId, req.ip]
        );

        return res.status(200).json({
            success: true,
            message: "Vault unlocked.",
            vaultSessionToken: sessionToken,
        });

    } catch (err) {
        console.error("verifyVaultGate error:", err.message);
        return res.status(500).json({ success: false, message: "Something went wrong." });
    }
};

module.exports = { getVaultQuestions, sendVaultOtp, verifyVaultGate };