require('dotenv').config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const vaultRoutes = require("./routes/vaultRoutes");

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

app.get("/", (req, res) => {
    res.json({
        message: "Server is running",
        status: "Success",
        success: true
    });
});

app.use("/", authRoutes);
app.use("/vault", vaultRoutes);

app.listen(port, () => {
    console.log(`server running at port ${port}`);
});