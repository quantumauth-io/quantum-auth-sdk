import express from "express";
import { Request, Response } from "express";
import cors from "cors";

import {
    createExpressQuantumAuthMiddleware,
    QUANTUMAUTH_ALLOWED_HEADERS,
    QuantumAuthRequest
} from "@quantumauth/node";

const app = express();

app.use(cors({
    origin: ["http://localhost:3000"], // address of the front end
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        ...QUANTUMAUTH_ALLOWED_HEADERS
    ],
    credentials: true,
}));

// Parse JSON
app.use(express.json());


/**
 * Middleware for integrating Quantum Authentication with an Express application.
 *
 * This middleware is used to authenticate and authorize requests using Quantum Authentication.
 * It enables secure communication with the Quantum backend services, providing features
 * such as session validation and user authorization.
 *
 * Configuration:
 * - `backendApiKey` (optional): Specifies the API key required to communicate with the Quantum backend.
 *   If not provided, the service may operate in a limited or development mode.
 *
 * Ensure this middleware is applied to the desired routes in the Express application to enable
 * authentication and enforce security policies as defined by the Quantum backend.
 *
 */
const qaMiddleware = createExpressQuantumAuthMiddleware({
    backendApiKey: "dev-backend-key" // optional for now
});


app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});


app.post("/qa/demo", qaMiddleware, (req: QuantumAuthRequest, res : Response) => {

    res.json({
        userId: req.userId,
        body: req.body,
    });
});

// Start server
app.listen(4000, () => {
    console.log("Express demo listening on http://localhost:4000");
});
