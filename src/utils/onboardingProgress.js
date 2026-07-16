// Derives how far a vendor got in onboarding from their saved Vendor profile.
// Identity (Step 1: name/phone/email) has no Vendor-schema fields — email is
// only persisted to the backend at Review, together with Bank/Address/KYC —
// so it's implicitly "done for this session" once OTP is verified.
// Step indices: 0=identity, 1=bank, 2=kyc, 3=review

export const isBankStepComplete = vendorProfile =>
  !!(vendorProfile?.bankDetails?.accountNumber?.trim() &&
     vendorProfile?.bankDetails?.ifscCode?.trim());

// Business Name is not collected in the app — it's handled from the admin side.
export const isKycStepComplete = vendorProfile =>
  !!(vendorProfile?.address?.line?.trim() &&
     vendorProfile?.panCardNo?.trim() &&
     vendorProfile?.panFile &&
     vendorProfile?.gstNo?.trim() &&
     vendorProfile?.gstFile &&
     vendorProfile?.fssaiNo?.trim() &&
     vendorProfile?.fssaiFile);

export const getResumeStep = vendorProfile => {
  if (!vendorProfile) return 0;
  if (!isBankStepComplete(vendorProfile)) return 1;
  if (!isKycStepComplete(vendorProfile)) return 2;
  return 3;
};

// KYC status semantics (backend enum: drafted | pending | onReview | approved | rejected):
//   drafted  → saved as a draft, form not finished
//   pending  → form not completed yet (default after registration)
//   onReview → submitted, under admin review
//   approved → approved, full access
//   rejected → rejected
// 'drafted' and 'pending' both mean "resume the onboarding form".
export const KYC_STATUS = {
  DRAFTED: 'drafted',
  PENDING: 'pending',
  ON_REVIEW: 'onReview',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const isOnboardingIncomplete = kycStatus =>
  kycStatus === KYC_STATUS.DRAFTED || kycStatus === KYC_STATUS.PENDING;
