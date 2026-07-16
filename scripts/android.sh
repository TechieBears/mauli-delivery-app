#!/bin/bash

EMULATOR="$HOME/Library/Android/sdk/emulator/emulator"
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
AVD="Pixel_8_API_35"

# Kill any stale Metro bundler on port 8081
echo "Clearing port 8081..."
lsof -ti :8081 | xargs kill -9 2>/dev/null
sleep 1

# Kill any running emulators (not ADB — killing ADB breaks key auth)
echo "Stopping any running emulators..."
pkill -f "qemu-system" 2>/dev/null
pkill -f "emulator64" 2>/dev/null
sleep 3

# Ensure ADB server is running
$ADB start-server 2>/dev/null

# Start the phone emulator with software GPU to avoid color buffer errors
echo "Starting $AVD..."
$EMULATOR -avd $AVD -no-snapshot-load -gpu swiftshader_indirect 2>/dev/null &

# Wait for emulator to appear in ADB
echo "Waiting for emulator to connect..."
$ADB wait-for-device

# Wait for full Android boot
echo "Waiting for full boot..."
until $ADB shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' | grep -q "^1$"; do
  sleep 2
done

echo "Emulator ready. Building and launching app..."
npx react-native run-android
