import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { NavigationArrow, MapPin, ArrowsClockwise } from 'phosphor-react-native';
import { colors } from '../theme/colors';
import {
  ensureLocationPermission,
  canPromptForLocation,
} from '../services/locationPermissions';

/**
 * PROMINENT DISCLOSURE for location collection. This is the ONLY component in the
 * app allowed to call `ensureLocationPermission()` — every runtime location prompt
 * must be reached through here.
 *
 * Google Play — Prominent Disclosure & Consent (User Data policy). The app was
 * rejected on 1 Sep 2026 ("Inadequate Prominent Disclosure") because runtime
 * prompts were NOT immediately preceded by an in-app disclosure. Rules that keep
 * this compliant — do not weaken any of them:
 *
 *   1. IMMEDIATELY PRECEDING. Pressing the button on this modal fires the OS
 *      prompt directly, in the same handler. Nothing — no scanner, no navigation,
 *      no network call — may sit between this disclosure and the request.
 *   2. The disclosure names the data ("location"), says it is COLLECTED, says it
 *      is collected in the BACKGROUND / when the app is closed, and says who it is
 *      shared with. Play requires all four in the disclosure itself, not in a
 *      privacy policy.
 *   3. It is not a toast/banner and can't be dismissed by tapping outside or by
 *      Android back — see `onRequestClose`.
 *
 * App Store guideline 5.1.1(iv) additionally constrains it: a pre-permission
 * message may explain, but must not steer the choice. So the button stays neutral
 * ("Continue"), never "Allow location". Both stores' constraints are satisfied by
 * the same layout — the user's actual choice is only ever made in the OS prompt.
 *
 * Calls `onResult({ granted, background })` once the OS prompt resolves. The
 * parent decides what to do with a partial/denied grant (tracking still runs
 * foreground-only, and the pickup itself is never blocked).
 */
const LocationPermissionModal = ({ visible, onResult }) => {
  const [requesting, setRequesting] = useState(false);
  // null = not yet known. When false, the OS will never show its prompt again
  // (iOS after a "Don't Allow"), so Settings is the only way to fix it.
  const [canPrompt, setCanPrompt] = useState(null);

  // Work out which of the two endings applies, so the button can say what it
  // will actually do. Re-checked each time the modal opens, because the rider
  // may have changed the setting since.
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    canPromptForLocation().then(possible => {
      if (alive) setCanPrompt(possible);
    });
    return () => {
      alive = false;
    };
  }, [visible]);

  // Rule 1 above: the OS prompt is fired from this handler, so the disclosure is
  // literally the last thing shown before it. Keep it that way.
  //
  // When no prompt is possible the rider still reads the same disclosure first —
  // being sent to Settings without knowing why is worse, not better — and this
  // button takes them there instead.
  const handleContinue = async () => {
    if (requesting) return;
    setRequesting(true);
    if (canPrompt === false) {
      // Lands on THIS app's settings pane: openSettings() uses iOS's
      // UIApplicationOpenSettingsURLString. (iOS only builds that pane once the
      // app has requested a permission at least once — before that it can fall
      // back to the Settings root, which is out of our control.)
      // It rejects if the URL can't be opened, so swallow that rather than
      // leaving an unhandled rejection.
      try {
        await Linking.openSettings();
      } catch {
        // Nothing more we can offer — the rider stays on the disclosure.
      }
      setRequesting(false);
      // Report the unchanged (denied) state; the grant is re-checked when the
      // rider returns to the app, so the caller must not treat this as granted.
      onResult?.({ granted: false, background: false });
      return;
    }
    const result = await ensureLocationPermission();
    setRequesting(false);
    onResult?.(result);
  };

  return (
    // No dismiss path: an Android back press must not become a way to reach the
    // permission request while skipping the disclosure, so back also continues.
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleContinue}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <NavigationArrow size={30} color={colors.primary} weight="fill" />
          </View>

          <Text style={styles.title}>We collect your location</Text>

          {/* The disclosure proper. Names the data, that it is collected, that
              collection continues in the background, and who receives it. */}
          <Text style={styles.body}>
            Mauli G-Mart Transporter collects your location to use as your
            vehicle's location, and shares it with the administrative authority
            so the delivery can be tracked.
          </Text>

          <View style={styles.point}>
            <ArrowsClockwise size={18} color={colors.primary} weight="fill" />
            <Text style={styles.pointText}>
              This location data is collected{' '}
              <Text style={styles.strong}>
                even when the app is closed or not in use
              </Text>
              , so the order keeps updating while you drive.
            </Text>
          </View>

          <View style={styles.point}>
            <MapPin size={18} color={colors.primary} weight="fill" />
            <Text style={styles.pointText}>
              Collection happens only while you have an active delivery, and
              stops as soon as that delivery is completed.
            </Text>
          </View>

          {/* Only when the OS won't prompt again: say why the next tap leaves
              the app, so Settings isn't a surprise. */}
          {canPrompt === false ? (
            <Text style={styles.settingsNote}>
              Location is currently turned off for this app. It can only be
              turned back on from Settings.
            </Text>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, requesting && styles.btnDisabled]}
            onPress={handleContinue}
            disabled={requesting}
            activeOpacity={0.85}>
            {requesting ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              // "Continue" stays neutral where a prompt follows (App Store
              // 5.1.1(iv) — the pre-prompt message must not steer the choice).
              // Once Settings is the only route there is no OS choice left to
              // steer, so the button can name where it goes.
              <Text style={styles.primaryBtnText}>
                {canPrompt === false ? 'Open Settings' : 'Continue'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 16,
  },
  point: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  pointText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },
  strong: { fontWeight: '800', color: colors.text },
  settingsNote: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 4,
  },
  primaryBtn: {
    width: '100%',
    marginTop: 10,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: colors.border },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: colors.surface },
});

export default LocationPermissionModal;
