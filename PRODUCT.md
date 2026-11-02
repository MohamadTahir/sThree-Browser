# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Ships twice from one Next.js codebase: a Tauri desktop app (macOS, Windows, Linux) and a self-hosted web build (Docker). Both matter equally; the interface is the same web UI in both.

## Users

Anyone who needs to browse their own S3 or S3-compatible buckets (AWS S3, MinIO, Cloudflare R2, and similar): find objects, look at them, upload, download, share time-limited links, and delete. Users range from engineers juggling many buckets to people who were simply handed a set of keys.

## Product Purpose

A safe, local S3 browser. A user adds connections (bucket, region, endpoint) and credentials, and browses without worrying about where their keys go. Success means the user can work across buckets quickly and trust that credentials stay protected on their device.

## Positioning

Credentials never leave the device. They are stored in a local vault encrypted with a key derived from the user's master password, and every S3 request is signed and sent directly from the user's device to the storage endpoint. There is no backend that sees keys, no analytics, and no tracking.

## Operating Context

- First run: create a master password; afterwards, unlock on every launch. The vault auto-locks after inactivity and can be locked manually.
- Connections are organised into user-defined, colour-coded folders in a sidebar. One connection is active at a time.
- The web build requires each bucket's CORS policy to allow the site's origin; the desktop build does not.

## Capabilities and Constraints

- Browse by prefix with pagination; breadcrumb navigation; create folders.
- Upload files (multipart, bounded concurrency, aborted cleanly on failure) by picker or drag-and-drop.
- Object details: size, type, modified date, storage class; previews for images, video, audio, and text.
- Download, and share presigned links valid for up to 7 days.
- Delete objects with confirmation.
- Terminology: "connection" = a configured bucket; "credential" = an access/secret key pair; "folder" in the sidebar = a group of connections; "folder" in the explorer = an S3 prefix.

## Brand Commitments

Name: sThree Browser. Existing assets: `src-tauri/icons/`, `public/favicon.png`.

## Evidence on Hand

No testimonials, customers, or benchmarks exist. Do not invent any.

## Product Principles

1. Security state is always visible and never surprising: the user can see that the vault is encrypted and locked/unlocked, and destructive or exposing actions (delete, reset vault, public links) are explicit.
2. Fast for repeat use: the common path (pick a connection, find an object, act on it) takes as few steps as possible.
3. Honest errors: when S3 refuses, say why in plain terms and what to change (credential, region, CORS).
4. Works the same on desktop and web.

## Brand Commitments (visual standing preference)

The user chose the category standard over a distinctive world (2026-11-02): a clean, neutral S3-client look executed to a high standard. Polish bar: Linear / Vercel dashboard, Cloudflare R2 / AWS S3 console, GitHub.
