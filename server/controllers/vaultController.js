const pool = require("../config/db");
const crypto = require("crypto");

const ENCRYPTION_KEY = process.env.AES_SECRET_KEY; // 32 chars hona chahiye
const ALGORITHM = "aes-256-cbc";

// Helper: Encrypt
const encrypt = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return {
        iv: iv.toString("hex"),
        encrypted_password: encrypted
    };
};

// Helper: Decrypt
const decrypt = (encryptedPassword, ivHex) => {
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedPassword, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
};


const home = async (req, res) => {
    return res.status(200).json({ message: "Welcome to the Vault API" });

};
const addPassword = async (req, res) => {
    try {
        // 1. Destructure body
        const { appname, username, password, category, tags, notes, favorite } = req.body;

        // 2. Validate required fields
        if (!appname || !password || !category) {
            return res.status(400).json({
                success: false,
                message: "App name, password, and category are required.",
            });
        }

        // 3. Password length check
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters.",
            });
        }

        // 4. user_id from verifyToken middleware
        const user_id = req.user.id;

        // 5. Encrypt password
        const { iv, encrypted_password } = encrypt(password);

        // 6. Tags array to JSON string
        const tagsJSON = JSON.stringify(tags || []);

        // 7. Insert into DB
        await pool.query(
            "INSERT INTO vault_passwords (user_id, app_name, username, encrypted_password, iv, category, tags, notes, is_favorite) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [user_id, appname, username, encrypted_password, iv, category, tagsJSON, notes, favorite]
        );

        // 8. Success response
        return res.status(201).json({
            success: true,
            message: "Password saved successfully.",
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};


const viewPassword = async (req, res) => {
    const userId = req.user.id;
    const { category } = req.query;

    console.log("Category received:", category); // ← ye add karo

    try {
        let query = `SELECT id, app_name, username, encrypted_password, iv, category, tags, notes, is_favorite, created_at 
             FROM vault_passwords WHERE user_id = ? AND is_deleted = 0`;
        const params = [userId];

        // ← Yahi fix hai — sirf tab filter karo jab category ho aur 'All' na ho
        if (category && category !== 'All') {
            query += ` AND category = ?`;
            params.push(category);
        }

        const [rows] = await pool.query(query, params);

        // ← Empty result handle karo
        if (rows.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message: `No passwords found for "${category}".`
            });
        }

        const decryptedRows = rows.map(row => ({
            ...row,
            decrypted_password: decrypt(row.encrypted_password, row.iv),
            tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags
        }));

        return res.status(200).json({ success: true, data: decryptedRows });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};


const updatePassword = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { app_name, username, password, category, tags, notes, is_favorite } = req.body;

    try {
        let updateFields = `app_name = ?, username = ?, category = ?, tags = ?, notes = ?, is_favorite = ?, updated_at = NOW()`;
        let params = [app_name, username, category, JSON.stringify(tags), notes, is_favorite];

        if (password) {
            const { iv, encrypted_password } = encrypt(password);
            updateFields += `, encrypted_password = ?, iv = ?`;
            params.push(encrypted_password, iv);
        }

        params.push(id, userId);

        const [result] = await pool.query(
            `UPDATE vault_passwords SET ${updateFields} WHERE id = ? AND user_id = ? AND is_deleted = 0`,
            params
        );

        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: "Password not found." });

        return res.status(200).json({ success: true, message: "Password updated successfully." });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

const deletePassword = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        const [result] = await pool.query(
            `UPDATE vault_passwords 
             SET is_deleted = 1, deleted_at = NOW() 
             WHERE id = ? AND user_id = ?`,
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Password not found." });
        }

        return res.status(200).json({ success: true, message: "Password deleted successfully." });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

const getRecycleBinPassword = async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await pool.query(
            `SELECT id, app_name, username, category, tags, is_favorite, created_at, deleted_at
             FROM vault_passwords 
             WHERE user_id = ? AND is_deleted = 1
             ORDER BY deleted_at DESC`,
            [userId]
        );

        const data = rows.map(row => ({
            ...row,
            tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
            days_left: Math.max(0, 30 - Math.floor((new Date() - new Date(row.deleted_at)) / (1000 * 60 * 60 * 24)))
        }));

        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

const recycleBinPassword = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    try {
        const [result] = await pool.query(
            `UPDATE vault_passwords 
             SET is_deleted = 0, deleted_at = NULL 
             WHERE id = ? AND user_id = ?`,
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Password not found." });
        }

        return res.status(200).json({ success: true, message: "Password restored successfully." });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

const getCategoriesPassword = async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await pool.query(
            `SELECT id, app_name, username, encrypted_password, iv, category, tags, is_favorite, created_at
            FROM vault_passwords 
            WHERE user_id = ? AND is_deleted = 0
            ORDER BY category ASC`,
            [userId]
        );

        const data = rows.map(row => ({
            ...row,
            decrypted_password: decrypt(row.encrypted_password, row.iv),
            tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
        }));

        // Category wise group karo
        const grouped = {};
        data.forEach(p => {
            if (!grouped[p.category]) grouped[p.category] = [];
            grouped[p.category].push(p);
        });

        return res.status(200).json({ success: true, data: grouped });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

const getFavoritePassword = async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await pool.query(
            `SELECT id, app_name, username, encrypted_password, iv, category, tags, is_favorite, created_at
            FROM vault_passwords 
            WHERE user_id = ? AND is_deleted = 0 AND is_favorite = 1
            ORDER BY category ASC`,
            [userId]
        );

        const data = rows.map(row => ({
            ...row,
            decrypted_password: decrypt(row.encrypted_password, row.iv),
            tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
        }));

        // Category wise group karo
        const grouped = {};
        data.forEach(p => {
            if (!grouped[p.category]) grouped[p.category] = [];
            grouped[p.category].push(p);
        });

        return res.status(200).json({ success: true, data: grouped });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};


const generatePassword = async (req, res) => {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) return res.status(400).json({ success: false, message: "Password required." });

    try {
        // Sirf last 15 rakhne ke liye purane delete karo
        const [rows] = await pool.query(
            `SELECT id FROM password_history WHERE user_id = ? ORDER BY created_at DESC`,
            [userId]
        );

        if (rows.length >= 15) {
            const deleteIds = rows.slice(14).map(r => r.id);
            await pool.query(`DELETE FROM password_history WHERE id IN (?)`, [deleteIds]);
        }

        await pool.query(
            `INSERT INTO password_history (user_id, password) VALUES (?, ?)`,
            [userId, password]
        );

        return res.status(200).json({ success: true, message: "Saved to history." });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

const getPasswordHistory = async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await pool.query(
            `SELECT id, password, created_at FROM password_history 
             WHERE user_id = ? ORDER BY created_at DESC LIMIT 15`,
            [userId]
        );
        return res.status(200).json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

const analyzePasswords = async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await pool.query(
            `SELECT id, app_name, encrypted_password, iv, category, is_favorite
             FROM vault_passwords 
             WHERE user_id = ? AND is_deleted = 0`,
            [userId]
        );

        const analyzed = rows.map(row => {
            const pwd = decrypt(row.encrypted_password, row.iv);
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
            const label = score <= 2 ? 'Weak' : score <= 4 ? 'Medium' : score <= 6 ? 'Strong' : 'Very Strong';

            return {
                id: row.id,
                app_name: row.app_name,
                category: row.category,
                is_favorite: row.is_favorite,
                score: percent,
                label,
                length: pwd.length,
                has_upper: /[A-Z]/.test(pwd),
                has_lower: /[a-z]/.test(pwd),
                has_number: /[0-9]/.test(pwd),
                has_special: /[^a-zA-Z0-9]/.test(pwd),
            };
        });

        // Summary stats
        const total = analyzed.length;
        const weak = analyzed.filter(p => p.label === 'Weak').length;
        const medium = analyzed.filter(p => p.label === 'Medium').length;
        const strong = analyzed.filter(p => p.label === 'Strong' || p.label === 'Very Strong').length;
        const avgScore = total ? Math.round(analyzed.reduce((sum, p) => sum + p.score, 0) / total) : 0;

        return res.status(200).json({
            success: true,
            summary: { total, weak, medium, strong, avgScore },
            data: analyzed,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

const getProfile = async (req, res) => { };
const updateProfile = async (req, res) => { };

module.exports = {
    home,
    addPassword,
    viewPassword,
    updatePassword,
    deletePassword,
    recycleBinPassword,
    getRecycleBinPassword,
    getCategoriesPassword,
    getFavoritePassword,
    generatePassword,
    analyzePasswords,
    getProfile,
    updateProfile,
    getPasswordHistory,
    
};