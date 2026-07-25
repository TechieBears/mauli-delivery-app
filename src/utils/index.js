export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export const formatDate = (dateString, locale = 'en-US') => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const truncate = (str, maxLength = 100) => {
  if (!str) return '';
  return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
};

export const isEmptyObject = obj =>
  obj && typeof obj === 'object' && Object.keys(obj).length === 0;

export {
  pickImageWithChooser,
  getUploadedFileLabel,
  formatFileSize,
} from './imagePicker';

export { default as logger, LOGS_ENABLED } from './logger';
