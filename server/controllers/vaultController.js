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
                     FROM vault_passwords WHERE user_id = ?`;
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


const updatePassword = async (req, res) => { };
const deletePassword = async (req, res) => { };
const recycleBinPassword = async (req, res) => { };
const getRecycleBinPassword = async (req, res) => { };
const getCategoriesPassword = async (req, res) => { };
const getFavoritePassword = async (req, res) => { };
const generatePassword = async (req, res) => { };
const analyzePasswords = async (req, res) => { };
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
};