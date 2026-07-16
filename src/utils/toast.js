import Toast from 'react-native-toast-message';

const show = (type, text1, text2, options = {}) =>
  Toast.show({ type, text1, text2, visibilityTime: 3000, topOffset: 56, ...options });

const toast = {
  success: (text1, text2, opts) => show('success', text1, text2, opts),
  error:   (text1, text2, opts) => show('error',   text1, text2, opts),
  warning: (text1, text2, opts) => show('warning', text1, text2, opts),
  info:    (text1, text2, opts) => show('info',    text1, text2, opts),
  hide:    () => Toast.hide(),
};

export default toast;
