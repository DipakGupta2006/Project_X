const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const verifyVaultSession = require("../middleware/verifyVaultSession");

const {
    home, addPassword, viewPassword, updatePassword, deletePassword,
    recycleBinPassword, getRecycleBinPassword, getCategoriesPassword,
    getFavoritePassword, generatePassword, analyzePasswords,
    getProfile, updateProfile, getPasswordHistory, 
} = require("../controllers/vaultController");

const { getVaultQuestions, sendVaultOtp, verifyVaultOtp, verifyVaultQuestions, verifyVaultMaster } = require("../controllers/vaultGateController");

// Vault Gate routes (no vaultSession needed)
router.get("/gate/questions", verifyToken, getVaultQuestions);
router.post("/gate/send-otp", verifyToken, sendVaultOtp);
router.post("/gate/verify-otp", verifyToken, verifyVaultOtp);
router.post("/gate/verify-questions", verifyToken, verifyVaultQuestions);
router.post("/gate/verify-master", verifyToken, verifyVaultMaster);

// No vault session needed
router.get("/home", verifyToken, home);
router.post("/add-password", verifyToken, addPassword);
router.get("/generate-password", verifyToken, generatePassword);
router.post("/generate-password", verifyToken, generatePassword);
router.get("/password-history", verifyToken, getPasswordHistory);

// Vault session required
router.get("/view-password", verifyToken, verifyVaultSession, viewPassword);
router.put("/update-password/:id", verifyToken, verifyVaultSession, updatePassword);
router.delete("/delete-password/:id", verifyToken, verifyVaultSession, deletePassword);
router.put("/recycle-bin/:id", verifyToken, verifyVaultSession, recycleBinPassword);
router.get("/recycle-bin-passwords", verifyToken, verifyVaultSession, getRecycleBinPassword);
router.get("/categories", verifyToken, verifyVaultSession, getCategoriesPassword);
router.get("/favorite-passwords", verifyToken, verifyVaultSession, getFavoritePassword);
router.get("/analyze-passwords", verifyToken, verifyVaultSession, analyzePasswords);
router.get("/profile", verifyToken, verifyVaultSession, getProfile);
router.put("/update-profile", verifyToken, verifyVaultSession, updateProfile);

module.exports = router;