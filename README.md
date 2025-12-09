# QuantumAuth SDK Monorepo
![Powered by QuantumAuth](https://img.shields.io/badge/Powered%20By-QuantumAuth-1a1a1a?style=for-the-badge&logo=dependabot)
<!-- Badges -->
[![Lint Status](https://github.com/quantumauth-io/quantum-auth-sdk/actions/workflows/lint.yml/badge.svg)](https://github.com/quantumauth-io/quantum-auth-sdk/actions/workflows/lint.yml)
[![Release](https://github.com/quantumauth-io/quantum-auth-sdk/actions/workflows/release.yml/badge.svg)](https://github.com/quantumauth-io/quantum-auth-sdk/actions/workflows/release.yml)

[![web - npm version](https://img.shields.io/npm/v/@quantumauth/web.svg?label=@quantumauth/web)](https://www.npmjs.com/package/@quantumauth/web)
[![node - npm version](https://img.shields.io/npm/v/@quantumauth/node.svg?label=@quantumauth/node)](https://www.npmjs.com/package/@quantumauth/node)
[![web downloads](https://img.shields.io/npm/dm/@quantumauth/web)](https://www.npmjs.com/package/@quantumauth/web)
[![node downloads](https://img.shields.io/npm/dm/@quantumauth/node)](https://www.npmjs.com/package/@quantumauth/node)

[![web size](https://img.shields.io/bundlephobia/minzip/@quantumauth/web)](https://bundlephobia.com/package/@quantumauth/web)
[![Node version](https://img.shields.io/node/v/@quantumauth/node)](https://www.npmjs.com/package/@quantumauth/node)
[![License](https://img.shields.io/github/license/quantumauth-io/quantum-auth-sdk)](https://github.com/quantumauth-io/quantum-auth-sdk/blob/main/LICENSE)
[![Package manager: pnpm](https://img.shields.io/static/v1?label=package+manager&message=pnpm&color=F69220&logo=pnpm)](https://pnpm.io/)
[![Coverage Status](https://codecov.io/gh/quantumauth-io/quantum-auth-sdk/branch/main/graph/badge.svg)](https://codecov.io/gh/quantumauth-io/quantum-auth-sdk)


QuantumAuth is an open-source, hardware-anchored, post-quantum authentication platform.  
This monorepo contains the official SDKs used to integrate QuantumAuth into web and server-side applications.

QuantumAuth delivers device-bound identity using TPM modules, Secure Enclave, and post-quantum signatures — creating an authentication system that is invisible to users, impossible to phish, and resistant to next-generation threats.

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