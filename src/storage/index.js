import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({
  id: 'maulitransporter-storage',
});

export const mmkvStorage = {
  getItem: key => {
    const value = storage.getString(key);
    return value ?? null;
  },
  setItem: (key, value) => {
    storage.set(key, value);
  },
  removeItem: key => {
    storage.remove(key);
  },
};
