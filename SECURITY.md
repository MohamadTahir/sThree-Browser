# Security Policy

sThree Browser stores S3 credentials, so security reports are taken seriously.

## Supported versions

Only the latest release, and the `latest` image at `ghcr.io/mohamadtahir/sthree-browser`, gets security fixes.

## Reporting a vulnerability

**Please don't open a public issue for a security problem.**

Report it privately through [GitHub's private vulnerability reporting](https://github.com/MohamadTahir/sThree-Browser/security/advisories/new). Include:

- What the problem is and what an attacker could do with it.
- Steps to reproduce it, or a proof of concept.
- The affected build (desktop or web), version, and platform.

Don't include real credentials. Use a throwaway bucket or the local MinIO from `make minio`.

You can expect an acknowledgement within a few days. Once the issue is confirmed, a fix is prepared and released, and the advisory is published with credit to you, unless you'd rather stay anonymous.

## Scope

In scope:

- The vault: encryption, key derivation, keychain binding, auto-lock, and how secrets are held in memory.
- Anything that sends credentials, signed requests or object data anywhere other than the configured storage endpoint.
- The web build's Content-Security-Policy and other security headers (`sws.toml`).
- The Tauri desktop shell and its capabilities.
- The Docker image.

Out of scope:

- Weaknesses in a storage provider itself, or a bucket's own CORS or access policy.
- Attacks that need an already compromised device or browser.
- Hosting the web build without the recommended headers or without HTTPS.
