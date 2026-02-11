<div align="center">

# sThree Browser
### Modern S3 Object Storage Manager via Web & Desktop

[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.1-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
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

| Core Capabilities | Security & Privacy |
| :--- | :--- |
| 🪣 **Multi-Account**<br>Manage AWS S3, MinIO, Cloudflare R2, and more from one place. | 🔐 **Local Encryption**<br>Credentials never leave your device. Encrypted with AES-GCM. |
| 🚀 **High Performance**<br>Built with Rust (Tauri) for native speed and low memory usage. | 🛡️ **Privacy First**<br>No analytics, no tracking, no external servers. |
| 📂 **Smart Explorer**<br>Drag & drop uploads, breadcrumb nav, and grid/list views. | 🌐 **Cross-Platform**<br>Consistent experience across Web, macOS, Windows, and Linux. |

### Advanced Tools
- **Presigned URLs**: Generate and share temporary access links instantly.
- **File Previews**: View images, PDFs, and code directly in-app.
- **Dark Mode**: Beautiful, glassmorphic UI designed for modern workflows.
- **Docker Ready**: Deploy the web version anywhere with a single command.

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

| Frontend | Backend (Desktop) | Backend (Web) |
| :---: | :---: | :---: |
| **Next.js 14** (App Router) | **Tauri v2** (Rust) | **Next.js API Routes** |
| **React 18** | **Tokio** Async Runtime | **Node.js** |
| **Tailwind CSS** | **aws-sdk-rust** | **aws-sdk-js-v3** |
| **Shadcn UI** | **Local Store Plugin** | **Docker** |

</div>

---

## 💻 Development

### Prerequisites
- Node.js 18+ & pnpm
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
| Environment | Command | Description |
| :--- | :--- | :--- |
| **Web** | `pnpm dev` | Starts Next.js dev server at `localhost:1420` |
| **Desktop** | `pnpm tauri dev` | Launches Tauri app with hot-reload |

## 🏗️ Build Commands

```bash
# Build Web (Production)
pnpm build

# Build Desktop (Production)
pnpm tauri build
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
