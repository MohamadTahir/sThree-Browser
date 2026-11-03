# Contributing to sThree Browser

Thanks for helping out. Bug reports, ideas and pull requests are all welcome.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting bugs and asking for features

Open an [issue](https://github.com/MohamadTahir/sThree-Browser/issues/new/choose) and pick the bug report or feature request template. For bugs, say whether you use the desktop app or the web version, which storage provider you use (AWS S3, Cloudflare R2, MinIO, …), and the steps that cause the problem.

**Never paste access keys, secret keys, share links or vault exports into an issue.**

Security problems don't belong in public issues. See [SECURITY.md](SECURITY.md).

## Development setup

You need Node.js 26+ and pnpm 10. For the desktop app you also need Rust (latest stable) and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). Docker is needed for the container and for the local MinIO test server.

```bash
git clone https://github.com/MohamadTahir/sThree-Browser.git
cd sThree-Browser
make install
make dev          # web app at http://localhost:3000
make tauri-dev    # desktop app with hot reload
```

Run `make` to list every target.

To test against throwaway storage, run `make minio`. It prints an endpoint, an access key and a command that creates a test bucket. Add a connection with endpoint `http://localhost:19000` and path-style URLs turned on. `make minio-stop` discards it. Please test against MinIO or a bucket you created for testing, not against real data.

## Pull requests

1. Fork the repository and create a branch from `main`, for example `feature/your-change` or `fix/your-bug`.
2. Keep each pull request to one change. Small pull requests are reviewed faster.
3. Run `make check` (type-check, build, and desktop compile-check) before you push.
4. If you change the UI, follow [DESIGN.md](DESIGN.md) and add a screenshot to the pull request.
5. Update the README when you change behaviour that it describes.
6. Open the pull request and fill in the template.

### Security-sensitive code

Changes to `src/services/vault.ts`, the CSP and headers in `sws.toml`, or the Tauri capabilities in `src-tauri/` get a closer review. Explain in the pull request why the change is safe. Never log, persist or send decrypted credentials, and keep every S3 request going straight from the device to the storage endpoint.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
