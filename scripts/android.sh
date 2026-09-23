#!/bin/bash

EMULATOR="$HOME/Library/Android/sdk/emulator/emulator"
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
AVD="Pixel_8_API_35"

# Metro port. The customer app (mauliapp) owns the default 8081, so this app
# runs its own bundler on 8082 and both can be developed at the same time.
# --port on run-android bakes the port into the build (gradle property
# reactNativeDevServerPort) AND sets up `adb reverse`, so the installed app
# asks 8082 for its bundle rather than the default.
PORT=8082

# Clear only THIS app's port. Killing 8081 here would take down the customer
# app's Metro — the two are developed side by side.
echo "Clearing port $PORT..."
lsof -ti :$PORT | xargs kill -9 2>/dev/null
sleep 1

# Ensure ADB server is running (never kill it — that breaks key auth)
$ADB start-server 2>/dev/null

# Reuse an already-running emulator rather than restarting it. Both apps share
# the same AVD, so tearing it down would kill the customer app's session too.
if $ADB devices | awk 'NR>1 && $1 ~ /^emulator-/ && $2=="device" {found=1} END {exit !found}'; then
  echo "Emulator already running — reusing it."
else
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
fi

echo "Emulator ready. Building and launching app on port $PORT..."
npx react-native run-android --port $PORT
