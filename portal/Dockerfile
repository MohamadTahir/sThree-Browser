# syntax=docker/dockerfile:1.7
#
# The public portal (landing page) for a hosted sThree Browser instance.
# A separate image from the app: people who self-host sThree Browser run the
# app image only and never get this page. Build it from this folder:
#
#   docker build -t sthree-portal portal
#
# There is no build step: the portal is hand-written static files.

FROM joseluisq/static-web-server:2.44.1

LABEL org.opencontainers.image.title="sThree Browser portal" \
      org.opencontainers.image.description="Landing page for a hosted sThree Browser instance" \
      org.opencontainers.image.source="https://github.com/MohamadTahir/sThree-Browser" \
      org.opencontainers.image.licenses="MIT"

COPY legal.html /public/
COPY sws.toml /etc/sws.toml
COPY index.html styles.css main.js config.js logo.svg logo-mark.svg favicon.png /public/
COPY fonts/ /public/fonts/

ENV SERVER_CONFIG_FILE=/etc/sws.toml
USER 65534:65534
EXPOSE 8080
