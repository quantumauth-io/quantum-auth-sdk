![Powered by QuantumAuth](https://img.shields.io/badge/Powered%20By-QuantumAuth-1a1a1a?style=for-the-badge&logo=dependabot)

# QuantumAuth SDK Monorepo

QuantumAuth is an open-source, hardware-anchored, post-quantum authentication platform.  
This monorepo contains the official SDKs used to integrate QuantumAuth into web and server-side applications.

QuantumAuth delivers device-bound identity using TPM modules, Secure Enclave, and post-quantum signatures — creating an authentication system that is invisible to users, impossible to phish, and resistant to next-generation threats.

## Packages

[![web - npm version](https://img.shields.io/npm/v/@quantumauth/web.svg?label=@quantumauth/web)](https://www.npmjs.com/package/@quantumauth/web)
[![node - npm version](https://img.shields.io/npm/v/@quantumauth/node.svg?label=@quantumauth/node)](https://www.npmjs.com/package/@quantumauth/node)

### **@quantumauth/web**
Client-side SDK for browsers and frameworks like Next.js.

### **@quantumauth/node**
Server-side SDK for Node.js.

## 🚀 Installation

```sh
pnpm add @quantumauth/web @quantumauth/node
```

## 🔧 Development (Monorepo)

```sh
pnpm install
pnpm build
```

## 🛠 Release & Publishing

Uses Changesets + GitHub Actions.

## 📝 License

Apache 2.0 — see LICENSE.