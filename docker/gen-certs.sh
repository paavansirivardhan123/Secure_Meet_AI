#!/bin/bash
# Generates a self-signed TLS cert for local/dev use with Nginx.
# For production, replace these with certs from Let's Encrypt or your CA.

set -e

CERTS_DIR="$(dirname "$0")/certs"
mkdir -p "$CERTS_DIR"

echo "Generating self-signed certificate in $CERTS_DIR ..."

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERTS_DIR/key.pem" \
  -out "$CERTS_DIR/cert.pem" \
  -subj "/C=IN/ST=AP/L=Localhost/O=SecureMeet/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

chmod 600 "$CERTS_DIR/key.pem"
chmod 644 "$CERTS_DIR/cert.pem"

echo ""
echo "Done! cert.pem and key.pem created in $CERTS_DIR"
echo "For production, replace these with proper CA-signed certificates."
