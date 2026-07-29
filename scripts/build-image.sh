#!/usr/bin/env bash
#
# Builds the custom WangKe Web Linux disk image (custom-disk-images/wangke.ext2)
# from dockerfiles/wangke_debian, mirroring what the Deploy workflow does on CI.
#
# Requirements: docker (with linux/386 emulation, e.g. Docker Desktop), sudo, jq.
# Usage:
#   scripts/build-image.sh [dockerfile] [image-size]
#   scripts/build-image.sh dockerfiles/wangke_debian 900M
#
set -euo pipefail

cd "$(dirname "$0")/.."

DOCKERFILE="${1:-dockerfiles/wangke_debian}"
IMAGE_SIZE="${2:-900M}"
OUT="custom-disk-images/wangke.ext2"
TAG="wangke-web-linux-image"
MNT="/mnt/wangke-ext2"

command -v docker >/dev/null 2>&1 || { echo "error: docker is required" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "error: jq is required" >&2; exit 1; }
[ -f "$DOCKERFILE" ] || { echo "error: Dockerfile not found: $DOCKERFILE" >&2; exit 1; }

echo ">> Building i386 Docker image from $DOCKERFILE ..."
docker build . --tag "$TAG" --file "$DOCKERFILE" --platform=i386

echo ">> Creating container ..."
CID=$(docker create "$TAG")
trap 'docker rm -f "$CID" >/dev/null 2>&1 || true' EXIT

# Extract the VM settings, same logic as .github/workflows/deploy.yml.
cmd_json=$(docker inspect --format='{{json .Config.Cmd}}' "$CID")
VM_CMD=$(echo "$cmd_json" | jq -r '.[0]')
if [ "$VM_CMD" = "/bin/bash" ] || [ "$VM_CMD" = "/bin/sh" ]; then
	VM_ARGS='["--login"]'
else
	VM_ARGS=$(echo "$cmd_json" | jq -c '.[1:]')
fi
VM_ENV=$(docker inspect --format='{{json .Config.Env}}' "$CID" | jq -c 'map(select(startswith("HOSTNAME=") | not))')
VM_CWD=$(docker inspect --format='{{json .Config.WorkingDir}}' "$CID" | jq -r '.')

echo ">> Creating ext2 image ($IMAGE_SIZE) ..."
TMP="$OUT.tmp"
rm -f "$TMP"
sudo fallocate -l "$IMAGE_SIZE" "$TMP"
# Revision 0 ext2: required by the CheerpX block driver.
sudo mkfs.ext2 -r 0 -F "$TMP"
sudo mkdir -p "$MNT"
sudo mount -o loop -t ext2 "$TMP" "$MNT"

echo ">> Copying container filesystem into image ..."
sudo docker cp -a "$CID":/ "$MNT"/
sudo umount "$MNT"
sudo chown "$(id -u):$(id -g)" "$TMP"
mv -f "$TMP" "$OUT"

echo ""
echo "Done: $OUT ($(du -h "$OUT" | cut -f1))"
cat <<EOF

To use this image with the dev server, create .env with:

VITE_DISK_IMAGE_URL=/custom-disk-images/$(basename "$OUT")
VITE_DISK_IMAGE_TYPE=bytes
VITE_VM_CMD=$VM_CMD
VITE_VM_ARGS=$VM_ARGS
VITE_VM_ENV=$VM_ENV
VITE_VM_CWD=$VM_CWD

Then run: npm run dev
EOF
