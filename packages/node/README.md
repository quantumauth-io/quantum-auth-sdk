![Powered by QuantumAuth](https://img.shields.io/badge/Powered%20By-QuantumAuth-1a1a1a?style=for-the-badge&logo=dependabot)
[![npm version](https://img.shields.io/npm/v/@quantumauth/node.svg)](https://www.npmjs.com/package/@quantumauth/node)
![npm downloads](https://img.shields.io/npm/dm/@quantumauth/node.svg)
[![License](https://img.shields.io/npm/l/@quantumauth/node.svg)](https://github.com/quantumauth-io/quantum-auth-sdk/blob/main/LICENSE)
# @quantumauth/node

QuantumAuth Node SDK — server-side authentication middleware.

## 🚀 Install

```sh
pnpm add @quantumauth/node
```

## Development

is QA_ENV is not set in your environment it will default to prod.

options are:

```ts
QA_ENV=local   // for local development
QA_ENV=develop // for develop environment (Official QA develop)
```


## 🧩 Usage (Express)

imports

```ts
import {
    createExpressQuantumAuthMiddleware,
    QUANTUMAUTH_ALLOWED_HEADERS,
    QuantumAuthRequest
} from "@quantumauth/node";
```
Use middleware

```ts
app.post("/qa/demo", qaMiddleware, (req: QuantumAuthRequest, res : Response) => {

    res.json({
        userId: req.userId,  // middleware inject the authenticated user id in the request
        body: req.body,
    });
});

```

## 🔐 CORS Allowed Headers

The headers required to authenticate user with QA proof (TPM signatures)

```ts
app.use(cors({
    origin: ["http://localhost:3000"], // address of the front end
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        ...QUANTUMAUTH_ALLOWED_HEADERS
    ],
    credentials: true,
}));
```

## 📘 Docs

[Read the documentation](https://docs.quantumauth.io) 

## 📝 License

Apache 2.0.