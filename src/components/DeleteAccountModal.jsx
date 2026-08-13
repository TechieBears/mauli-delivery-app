import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Trash, Warning } from 'phosphor-react-native';
import { useDeleteAccount } from '../hooks/useAuthQueries';
import useAppStore from '../store/useAppStore';
import { resetToLogin } from '../navigation/navigationRef';
import toast from '../utils/toast';

/**
 * Account deletion, required by App Store guideline 5.1.1(v) — an app that
 * supports account creation must let the account be deleted from inside the app.
 *
 * Two steps on purpose: the guideline permits a confirmation step to prevent
 * accidental deletion, and this is destructive and irreversible. What it must
 * NOT do is send the user to a phone call or an email to finish the job — the
 * whole flow completes here.
 *
 * On success the local session is cleared and the app resets to the start of the
 * auth flow. The account is gone: signing in with the same number creates a new,
 * empty one.
 *
 * `onDeleted` overrides where the app lands afterwards — the vendor and customer
 * profile screens send their users back to RoleSelection rather than Login,
 * matching what their Sign Out already does.
 */
const DeleteAccountModal = ({ visible, onCancel, onDeleted }) => {
  const [confirming, setConfirming] = useState(false);
  const logout = useAppStore(state => state.logout);
  const { mutate: deleteAccount, isPending } = useDeleteAccount();

  const close = () => {
    if (isPending) return;
    setConfirming(false);
    onCancel?.();
  };

  const handleDelete = () => {
    deleteAccount(undefined, {
      onSuccess: () => {
        setConfirming(false);
        onCancel?.();
        // Clears tokens + MMKV and stops the location watcher.
        logout();
        if (onDeleted) onDeleted();
        else resetToLogin();
        toast.success('Account deleted', 'Your account and data have been deleted.');
      },
      onError: err =>
        toast.error(
          'Could not delete account',
          err?.message ?? 'Please try again.',
        ),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Trash size={26} color="#ef4444" weight="regular" />
          </View>

          {confirming ? (
            <>
              <Text style={styles.title}>This cannot be undone</Text>
              <Text style={styles.subtitle}>
                Deleting removes your profile, documents and account access. You
                will be signed out immediately, and this phone number will no
                longer open this account.
              </Text>

              <View style={styles.notice}>
                <Warning size={18} color="#a16207" weight="fill" />
                <Text style={styles.noticeText}>
                  Completed order and invoice records are kept where the law
                  requires it, and are no longer linked to your login.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.dangerBtn, isPending && styles.btnDisabled]}
                onPress={handleDelete}
                disabled={isPending}
                activeOpacity={0.85}>
                {isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.dangerText}>Delete my account</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={close}
                disabled={isPending}
                activeOpacity={0.7}>
                <Text style={styles.cancelText}>Keep my account</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Delete account?</Text>
              <Text style={styles.subtitle}>
                This permanently deletes your Mauli G-Mart account and your
                personal data.
              </Text>

              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={() => setConfirming(true)}
                activeOpacity={0.85}>
                <Text style={styles.dangerText}>Continue</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={close} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff1f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  notice: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fefce8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  noticeText: { flex: 1, fontSize: 12, color: '#a16207', lineHeight: 18 },
  dangerBtn: {
    width: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnDisabled: { opacity: 0.6 },
  dangerText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelBtn: { paddingVertical: 8 },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
});

export default DeleteAccountModal;
