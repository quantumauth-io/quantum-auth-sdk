import express from "express";
import cors from "cors";
import {
    createExpressQuantumAuthMiddleware,
    type QuantumAuthContext
} from "@quantumauth/node";

const app = express();
// CORS for Next.js GUI on :3000
app.use(cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-QuantumAuth-App-ID",
        "X-QuantumAuth-User-ID",
        "X-QuantumAuth-Device-ID",
        "X-QuantumAuth-Nonce",
        "X-QuantumAuth-Challenge-ID",
        "X-QuantumAuth-Encrypted",
        "X-QuantumAuth-Canonical-B64"
    ],
    credentials: true,
}));

// Parse JSON
app.use(express.json());

// Configure the QA middleware
const qaMiddleware = createExpressQuantumAuthMiddleware({
    qaServerUrl: "http://localhost:1042", // your QA server
    verifyPath: "/quantum-auth/v1/auth/verify", // adjust if needed
    backendApiKey: "dev-backend-key" // optional
});

// ----------- Public health endpoint (not QA protected) -----------
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

// ----------- Protected endpoint (requires QA) -----------
app.post("/secure/data", qaMiddleware, (req, res) => {
    const qa = (req as any).quantumAuth as QuantumAuthContext;

    res.json({
        authenticated: true,
        userId: qa.userId,
        decryptedBody: qa.payload
    });
});

// protected endpoint using QA headers (no encrypted body)
app.post("/qa/demo", qaMiddleware, (req: any, res) => {
    const qa = req.quantumAuth as QuantumAuthContext;

    res.json({
        authenticated: true,
        userId: qa.userId,
        body: req.body, // plain JSON body from frontend
    });
});

// Start server
app.listen(4000, () => {
    console.log("Express demo listening on http://localhost:4000");
});
