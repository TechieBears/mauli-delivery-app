import { useState } from 'react';
import { uploadVendorDocument } from '../services/vendorService';
import { uploadCustomerDocument } from '../services/customerService';

/**
 * Hook for uploading a KYC/bank document to the backend. The target route
 * depends on the role: vendor → POST /vendor/profile/documents, customer →
 * POST /customer/profile/documents.
 *
 * Usage:
 *   const { upload, uploading, error } = useImageUpload(role);
 *
 *   // asset = result from launchImageLibrary / launchCamera
 *   const url = await upload(asset, 'pan');
 *
 * @param {'vendor'|'customer'} role  which onboarding flow is uploading (defaults to vendor)
 */
const useImageUpload = (role = 'vendor') => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const uploadDocument = role === 'customer' ? uploadCustomerDocument : uploadVendorDocument;

  /**
   * @param {{ uri: string, type: string, fileName: string }} asset
   * @param {string} field  backend multipart field name: pan, gst,
   *   addressProof, identityProof, cancelledCheck, fssai
   * @returns {Promise<string>} Public URL of the uploaded document
   */
  const upload = async (asset, field) => {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadDocument(field, asset);
      return url;
    } catch (err) {
      setError(err.message ?? 'Upload failed');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error };
};

export default useImageUpload;
