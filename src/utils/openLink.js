import { Linking } from 'react-native';
import toast from './toast';

// Opens an external URL in the device browser. `Linking.openURL` rejects when
// no app can handle the URL (and on Android when the intent is blocked), so we
// surface that as a toast rather than letting the promise reject silently.
export const openExternalLink = async url => {
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    toast.error('Unable to open link', 'Please try again later.');
    return false;
  }
};

// Opens the dialer pre-filled with `phone`. Strips spaces, dashes and brackets
// so numbers stored with formatting still produce a valid tel: URI. Note the
// iOS Simulator has no dialer, so this only works on a real device.
export const openDialer = async phone => {
  const digits = String(phone ?? '').replace(/[^\d+]/g, '');
  if (!digits) {
    toast.error('No support number', 'Support contact is unavailable right now.');
    return false;
  }
  try {
    await Linking.openURL(`tel:${digits}`);
    return true;
  } catch {
    toast.error('Unable to open dialer', `Please call ${phone} manually.`);
    return false;
  }
};

// Opens the default mail app with a new draft to `email`.
export const openEmail = async (email, subject) => {
  const address = String(email ?? '').trim();
  if (!address) {
    toast.error('No support email', 'Support contact is unavailable right now.');
    return false;
  }
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : '';
  try {
    await Linking.openURL(`mailto:${address}${query}`);
    return true;
  } catch {
    toast.error('Unable to open mail app', `Please email ${address} manually.`);
    return false;
  }
};

export default openExternalLink;
