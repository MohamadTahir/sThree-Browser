<div align="center">

# sThree Browser

### Modern S3 Object Storage Manager via Web & Desktop

[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=flat-square&logo=tauri&logoColor=black)](https://tauri.app/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

<p align="center">
  <img src="https://raw.githubusercontent.com/MohamadTahir/sThree-Browser/main/public/logo.png" alt="sThree Browser Logo" width="120" height="120" />
</p>

**sThree Browser** is a high-performance, cross-platform interface for managing S3-compatible storage.
Built for speed and security, it runs natively on **macOS**, **Windows**, and **Linux**, or as a containerized **Web Application**.

[Download Latest Release](https://github.com/MohamadTahir/sThree-Browser/releases) • [Report Bug](https://github.com/MohamadTahir/sThree-Browser/issues) • [Request Feature](https://github.com/MohamadTahir/sThree-Browser/issues)

</div>

---

## ✨ Features

| Core Capabilities                                                                         | Security & Privacy                                                                      |
| :---------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| 🪣 **Multi-Account**<br>Manage AWS S3, MinIO, Cloudflare R2, and more from one place.     | 🔐 **Local Encryption**<br>Credentials never leave your device. Encrypted with AES-GCM. |
| 🚀 **High Performance**<br>Built with Rust (Tauri) for native speed and low memory usage. | 🛡️ **Privacy First**<br>No analytics, no tracking, no external servers.                 |
| 📂 **Smart Explorer**<br>Drag & drop uploads, breadcrumb nav, sortable lists, keyboard navigation. | 🌐 **Cross-Platform**<br>Consistent experience across Web, macOS, Windows, and Linux.   |

### Advanced Tools

- **Share links**: Presigned download links valid from 15 minutes up to 7 days.
- **File previews**: Images, video, audio, and text/code in-app; PDFs open in a new tab.
- **Resumable-safe uploads**: Multipart with bounded concurrency; failed uploads are aborted so no orphaned parts are left behind.
- **Light and dark**: Follows your system setting.
- **Docker ready**: Deploy the web version anywhere with a single command.

---

## 🔐 Security model

- **Encrypted vault.** Connections and credentials are stored in one AES-256-GCM ciphertext. The key is derived from your master password with scrypt (N=2¹⁷, r=8, p=1) and held in memory only as a non-extractable key. Nothing about your buckets is stored in plain text.
- **Auto-lock.** The vault locks after 15 minutes without input, or when you press **Lock**. Locking reloads the app so no decrypted secret stays in memory.
- **No middleman.** Every S3 request is signed on your device and sent straight to your storage endpoint: from the browser on the web, and through the Tauri HTTP plugin on desktop. The server that hosts the web version never sees your keys.
- **Hardened web build.** Strict Content-Security-Policy, `Referrer-Policy: no-referrer` (so presigned URLs never leak), `X-Frame-Options: DENY`, and no `X-Powered-By`.
- **Upgrading from 1.x:** your existing data is migrated to the new vault format on first unlock.

There is no password recovery. If you forget the master password, reset the vault and add your connections again; your buckets are not affected.

### Web version: bucket CORS

Because the browser talks to S3 directly, each bucket must allow the site's origin. If a bucket isn't set up, the app shows the exact rule to copy. It looks like this (replace the origin with where you host sThree Browser):

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type", "Last-Modified"],
    "MaxAgeSeconds": 3600
  }
]
```

`ETag` must be exposed for multipart uploads to complete. The desktop app needs no CORS setup.

---

## 🚀 Quick Start

### Option A: Desktop App (Recommended)

Download the latest installer for your OS from the [Releases Page](https://github.com/MohamadTahir/sThree-Browser/releases).

- **macOS**: `.dmg` or `.app`
- **Windows**: `.msi` or `.exe`
- **Linux**: `.AppImage` or `.deb`

### Option B: Docker (Web Version)

Run the web interface instantly with Docker:

```bash
docker run -d -p 3000:3000 --name sthree-browser ghcr.io/mohamadtahir/sthree-browser:latest
```

Access at `http://localhost:3000`.

---

## 🛠️ Tech Stack

<div align="center">

|          App            |          Desktop           |          Web           |
| :---------------------: | :------------------------: | :--------------------: |
| **Next.js 16**, React 19 |     **Tauri v2** (Rust)    | Next.js standalone server (static page + `/api/health`) |
|   **aws-sdk-js-v3** (in the client) | `tauri-plugin-http` for S3 requests | **Docker** |
| **Tailwind CSS**, Radix Dialog | `tauri-plugin-opener` for downloads | Security headers via `next.config.js` |

</div>

---

## 💻 Development

### Prerequisites

- Node.js 26+ & pnpm 10
- Rust (Latest Stable)
- [Tauri Dependencies](https://tauri.app/v1/guides/getting-started/prerequisites) (if building desktop)

### Installation

```bash
# Clone
git clone https://github.com/MohamadTahir/sThree-Browser.git
cd sthree-browser

# Install Dependencies
pnpm install
```

### Running Locally

| Environment | Command          | Description                                   |
| :---------- | :--------------- | :-------------------------------------------- |
| **Web**     | `pnpm dev`       | Starts Next.js dev server at `localhost:3000` |
| **Desktop** | `pnpm tauri dev` | Launches Tauri app with hot-reload            |

## 🏗️ Build Commands

```bash
# Build Web (Production)
pnpm build

# Build Desktop (Production; runs a static export first)
pnpm tauri build

# Type-check
pnpm typecheck
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <sub>Made with ❤️ by Mohamad Tahir</sub>
</div>
