#!/bin/bash
# ==============================================================================
# Oasyss Flux — Divyesh Edition
# macOS Universal DMG Packaging & Validation Script
# Packages Oasyss Flux.app into a production-ready, notarization-capable .dmg
# and validates mountability and bundle integrity.
# ==============================================================================

set -e

APP_NAME="Oasyss Flux"
VOLUME_NAME="Oasyss Flux"
SOURCE_APP_DIR="dist/${APP_NAME}-darwin-universal/${APP_NAME}.app"
OUTPUT_DIR="dist"
DMG_NAME="Oasyss Flux — macOS Universal.dmg"
FINAL_DMG="${OUTPUT_DIR}/${DMG_NAME}"
STAGING_DIR="${OUTPUT_DIR}/dmg_staging"

echo "===================================================="
echo "Oasyss Flux: Packaging & Validating macOS DMG"
echo "===================================================="

# Check for macOS environment
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "⚠️ Notice: hdiutil and macOS disk imaging tools are exclusive to macOS."
  echo "On non-macOS environments, the pre-assembled .app bundle is preserved in dist/."
  echo "Use the GitHub Actions workflow (.github/workflows/build-macos.yml) or run this script on a Mac to produce the .dmg."
  exit 0
fi

# Fallback to arm64 or x64 if universal is not present
if [ ! -d "$SOURCE_APP_DIR" ]; then
  if [ -d "dist/${APP_NAME}-darwin-arm64/${APP_NAME}.app" ]; then
    SOURCE_APP_DIR="dist/${APP_NAME}-darwin-arm64/${APP_NAME}.app"
    DMG_NAME="Oasyss Flux — Apple Silicon.dmg"
    FINAL_DMG="${OUTPUT_DIR}/${DMG_NAME}"
    echo "Notice: Universal bundle not found. Using Apple Silicon (arm64) bundle."
  elif [ -d "dist/${APP_NAME}-darwin-x64/${APP_NAME}.app" ]; then
    SOURCE_APP_DIR="dist/${APP_NAME}-darwin-x64/${APP_NAME}.app"
    DMG_NAME="Oasyss Flux — Intel.dmg"
    FINAL_DMG="${OUTPUT_DIR}/${DMG_NAME}"
    echo "Notice: Universal bundle not found. Using Intel (x64) bundle."
  else
    echo "❌ Error: Could not locate ${APP_NAME}.app in dist/."
    exit 1
  fi
fi

echo "Source app bundle: ${SOURCE_APP_DIR}"
echo "Target DMG: ${FINAL_DMG}"

# Prepare temporary staging directory
rm -rf "$STAGING_DIR" "$FINAL_DMG"
mkdir -p "$STAGING_DIR"

# Copy .app bundle into staging
echo "Staging application bundle..."
cp -R "$SOURCE_APP_DIR" "$STAGING_DIR/"

# Create /Applications symbolic link for drag-and-drop installation
echo "Creating /Applications shortcut..."
ln -s /Applications "$STAGING_DIR/Applications"

# Create disk image with hdiutil
echo "Creating compressed read-only UDZO disk image..."
hdiutil create -ov -volname "${VOLUME_NAME}" -srcfolder "$STAGING_DIR" -format UDZO "$FINAL_DMG"

# Cleanup staging directory
rm -rf "$STAGING_DIR"

echo "✓ DMG created: ${FINAL_DMG}"

# ──────────────────────────────────────────────
#  DMG Integrity & Mount Validation
# ──────────────────────────────────────────────
echo "=== Validating DMG Package Mountability ==="
ATTACH_OUTPUT=$(hdiutil attach "$FINAL_DMG" -nobrowse -readonly)
MOUNT_POINT=$(echo "$ATTACH_OUTPUT" | grep "/Volumes/" | awk -F'\t' '{print $NF}')

if [ -z "$MOUNT_POINT" ]; then
  echo "❌ Error: Failed to mount DMG for validation."
  exit 1
fi

echo "DMG successfully mounted at: ${MOUNT_POINT}"

# Verify bundle inside mounted DMG
if [ ! -d "${MOUNT_POINT}/${APP_NAME}.app" ]; then
  echo "❌ Error: ${APP_NAME}.app is missing from mounted DMG!"
  hdiutil detach "$MOUNT_POINT" -force
  exit 1
fi

if [ ! -L "${MOUNT_POINT}/Applications" ]; then
  echo "❌ Error: /Applications shortcut is missing from mounted DMG!"
  hdiutil detach "$MOUNT_POINT" -force
  exit 1
fi

echo "✓ Verified: ${APP_NAME}.app and /Applications shortcut are intact inside DMG."

# Unmount DMG
hdiutil detach "$MOUNT_POINT"
echo "✓ DMG unmounted successfully."

# ──────────────────────────────────────────────
#  Code Signing & Notarization (Conditional)
# ──────────────────────────────────────────────
SIGNING_IDENTITY="${APPLE_SIGNING_IDENTITY:-$CSC_NAME}"

if [ -n "$SIGNING_IDENTITY" ]; then
  echo "=== Signing DMG with Developer ID ==="
  codesign --force --sign "${SIGNING_IDENTITY}" "${FINAL_DMG}"
  codesign --verify --verbose=2 "${FINAL_DMG}"
  echo "✓ DMG signed successfully."

  if [ -n "$APPLE_ID" ] && [ -n "$APPLE_APP_SPECIFIC_PASSWORD" ] && [ -n "$APPLE_TEAM_ID" ]; then
    echo "=== Submitting DMG to Apple Notary Service ==="
    xcrun notarytool submit "${FINAL_DMG}" \
      --apple-id "${APPLE_ID}" \
      --password "${APPLE_APP_SPECIFIC_PASSWORD}" \
      --team-id "${APPLE_TEAM_ID}" \
      --wait

    echo "=== Stapling Notarization Ticket to DMG ==="
    xcrun stapler staple "${FINAL_DMG}"
    xcrun stapler validate "${FINAL_DMG}"

    echo "=== Assessing Gatekeeper Compliance ==="
    spctl --assess --type open --context context:primary-signature --verbose "${FINAL_DMG}"
    echo "✓ Apple Notarization, Stapling, and Gatekeeper Assessment Complete!"
  else
    echo "Notice: Apple Notary credentials not fully provided. Skipping notarization."
  fi
else
  echo "Notice: Signing identity not configured. DMG is an unsigned validation build."
fi

echo "===================================================="
echo "DMG packaging pipeline completed successfully."
echo "===================================================="
