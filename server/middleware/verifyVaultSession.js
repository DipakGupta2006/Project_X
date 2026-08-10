const pool = require("../config/db");

const verifyVaultSession = async (req, res, next) => {
    // ye frontend beheje ga har request me
    const vaultToken = req.headers["x-vault-session"];

    if (!vaultToken) {
        return res.status(401).json({
            success: false,
            message: "Vault session not found. Please unlock vault first.",
        });
    }

    try {
        const [rows] = await pool.query(
            "SELECT * FROM vault_sessions WHERE session_token = ?",
            [vaultToken]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid vault session.",
            });
        }

        const session = rows[0];

        // Expiry check
        if (new Date() > new Date(session.expires_at)) {
            await pool.query("DELETE FROM vault_sessions WHERE session_token = ?", [vaultToken]);
            return res.status(401).json({
                success: false,
                message: "Vault session expired. Please unlock vault again.",
            });
        }

        // last_active update
        await pool.query("DELETE FROM vault_sessions WHERE session_token = ?", [vaultToken]);

        req.vaultSession = session; // age use kar sako agar zarurat pade
        next();

    } catch (err) {
        console.error("verifyVaultSession error:", err.message);
        return res.status(500).json({ success: false, message: "Something went wrong." });
    }
};

module.exports = verifyVaultSession;