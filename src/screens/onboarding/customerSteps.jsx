import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  FormField,
  SelectField,
  FileUploadBox,
  ReviewCard,
} from '../../components/onboarding';
import { ACCOUNT_TYPES } from '../../constants/onboardingSteps';
import { colors } from '../../theme/colors';

// Customer onboarding mirrors the vendor KYC flow. The backend customer profile
// stores the same fields (address, bankDetails, panCardNo, gstNo, fssaiNo +
// documents), so these steps intentionally parallel vendorSteps.jsx. Documents
// upload to the /customer/* route via role="customer" on FileUploadBox.

export const CustomerIdentityStep = ({ data, errors, onChange, phone, phoneLocked, showEmail }) => (
  <>
    <Text style={styles.sectionTitle}>Identity</Text>
    <Text style={styles.sectionDesc}>
      Tell us about yourself.
    </Text>
    <FormField
      label="Full Name"
      value={data.fullName}
      onChangeText={v => onChange('fullName', v)}
      placeholder="Enter your full legal name"
      error={errors.fullName}
    />
    {phoneLocked ? (
      <FormField
        label="Phone Number"
        value={phone ? `${data.countryCode || '+91'} ${phone}` : ''}
        editable={false}
      />
    ) : (
      <View style={styles.phoneRow}>
        <View style={styles.countryCodeField}>
          <FormField
            label="Code"
            value={data.countryCode || '+91'}
            onChangeText={v => onChange('countryCode', '+' + v.replace(/[^0-9]/g, ''))}
            keyboardType="phone-pad"
            maxLength={5}
          />
        </View>
        <View style={styles.phoneField}>
          <FormField
            label="Phone Number"
            value={data.phone}
            onChangeText={v => onChange('phone', v.replace(/[^0-9]/g, ''))}
            placeholder="98765 43210"
            keyboardType="phone-pad"
            maxLength={10}
            error={errors.phone}
          />
        </View>
      </View>
    )}
    {showEmail ? (
      <FormField
        label="Email Address"
        value={data.email}
        onChangeText={v => onChange('email', v)}
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
      />
    ) : null}
  </>
);

export const CustomerBankStep = ({ data, errors, onChange }) => (
  <>
    <Text style={styles.sectionTitle}>Bank Details</Text>
    <Text style={styles.sectionDesc}>
      Provide your banking information for secure and timely payments.
    </Text>
    <FormField
      label="Bank Name"
      value={data.bankName}
      onChangeText={v => onChange('bankName', v)}
      placeholder="e.g. State Bank of India"
      error={errors.bankName}
    />
    <FormField
      label="Branch Name"
      value={data.branchName}
      onChangeText={v => onChange('branchName', v)}
      placeholder="e.g. Main Branch, Pune"
      error={errors.branchName}
    />
    <FormField
      label="Account Number"
      value={data.accountNumber}
      onChangeText={v => onChange('accountNumber', v.replace(/[^0-9]/g, ''))}
      placeholder="Enter Account Number"
      keyboardType="number-pad"
      error={errors.accountNumber}
    />
    <SelectField
      label="Account Type"
      value={data.accountType}
      options={ACCOUNT_TYPES}
      onSelect={v => onChange('accountType', v)}
      placeholder="Select Type"
      error={errors.accountType}
    />
    <FormField
      label="Bank IFSC Code"
      value={data.ifsc}
      onChangeText={v => onChange('ifsc', v.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
      placeholder="SBIN0001234"
      autoCapitalize="characters"
      maxLength={11}
      error={errors.ifsc}
    />
    <FileUploadBox
      label="Cancelled Cheque Photo"
      hint="JPEG, PNG up to 5MB"
      value={data.chequePhoto}
      onChange={url => onChange('chequePhoto', url)}
      error={errors.chequePhoto}
      field="cancelledCheck"
      role="customer"
    />
  </>
);

export const CustomerKycStep = ({ data, errors, onChange }) => (
  <>
    <Text style={styles.sectionTitle}>KYC Documents</Text>
    <Text style={styles.sectionSubtitle}>Address Details</Text>
    <FormField
      label="Full Address"
      value={data.officeAddress}
      onChangeText={v => onChange('officeAddress', v)}
      placeholder="Street, city, district, state & pincode"
      multiline
      error={errors.officeAddress}
    />

    <Text style={[styles.sectionSubtitle, styles.mt]}>Identity Verification</Text>
    <FormField
      label="PAN Number"
      value={data.pan}
      onChangeText={v => onChange('pan', v.toUpperCase())}
      placeholder="ABCDE1234F"
      autoCapitalize="characters"
      maxLength={10}
      error={errors.pan}
    />
    <FileUploadBox
      label="PAN Card Image"
      hint="JPG or PNG (Max 5MB)"
      value={data.panDoc}
      onChange={url => onChange('panDoc', url)}
      error={errors.panDoc}
      field="pan"
      role="customer"
    />
    <FileUploadBox
      label="Address Proof"
      hint="Aadhar, Voter ID or Electricity Bill"
      value={data.addressProof}
      onChange={url => onChange('addressProof', url)}
      error={errors.addressProof}
      field="addressProof"
      role="customer"
    />
    <FileUploadBox
      label="Identity Proof"
      hint="Aadhar, Passport or Driving Licence (Max 5MB)"
      value={data.identityProofDoc}
      onChange={url => onChange('identityProofDoc', url)}
      error={errors.identityProofDoc}
      field="identityProof"
      role="customer"
    />

    <Text style={[styles.sectionSubtitle, styles.mt]}>Business Proof</Text>
    <FormField
      label="GST Number"
      value={data.gst}
      onChangeText={v => onChange('gst', v.toUpperCase())}
      placeholder="22AAAAA0000A1Z5"
      autoCapitalize="characters"
      error={errors.gst}
    />
    <FileUploadBox
      label="GST Proof"
      hint="Mandatory for registered businesses"
      value={data.gstProof}
      onChange={url => onChange('gstProof', url)}
      error={errors.gstProof}
      field="gst"
      role="customer"
    />
    <FormField
      label="FSSAI Number"
      value={data.fssai}
      onChangeText={v => onChange('fssai', v)}
      placeholder="License number"
      error={errors.fssai}
    />
    <FileUploadBox
      label="FSSAI Certificate"
      hint="Clear photo required (Max 5MB)"
      value={data.fssaiCert}
      onChange={url => onChange('fssaiCert', url)}
      error={errors.fssaiCert}
      field="fssai"
      role="customer"
    />

    <View style={styles.tipBanner}>
      <Text style={styles.tipTitle}>Expert Tip</Text>
      <Text style={styles.tipText}>
        Ensure documents are clear and all corners are visible for faster verification.
      </Text>
    </View>
  </>
);

export const CustomerReviewStep = ({
  data,
  phone,
  onEditStep,
  agreed,
  onAgreeChange,
  agreeError,
}) => (
  <>
    <Text style={styles.sectionTitle}>Review & Submit</Text>
    <Text style={styles.sectionDesc}>
      Please verify all information before finishing your registration.
    </Text>
    <ReviewCard
      title="BASIC DETAILS"
      onEdit={() => onEditStep(0)}
      fields={[
        { label: 'Full Name', value: data.fullName },
        { label: 'Phone', value: phone ? `+91 ${phone}` : '' },
        { label: 'Email Address', value: data.email },
      ]}
    />
    <ReviewCard
      title="ADDRESS DETAILS"
      onEdit={() => onEditStep(2)}
      fields={[
        { label: 'GSTIN Number', value: data.gst },
        { label: 'Full Address', value: data.officeAddress },
      ]}
    />
    <ReviewCard
      title="KYC & DOCUMENTS"
      onEdit={() => onEditStep(2)}
      fields={[
        { label: 'PAN', value: data.pan },
        { label: 'PAN Card', value: data.panDoc, isImage: true },
        { label: 'Address Proof', value: data.addressProof, isImage: true },
        { label: 'Identity Proof', value: data.identityProofDoc, isImage: true },
        { label: 'GST Proof', value: data.gstProof, isImage: true },
        { label: 'FSSAI Certificate', value: data.fssaiCert, isImage: true },
      ]}
    />
    <ReviewCard
      title="BANK DETAILS"
      onEdit={() => onEditStep(1)}
      fields={[
        { label: 'Bank Name', value: data.bankName },
        { label: 'Account Number', value: data.accountNumber },
        { label: 'Cancelled Cheque', value: data.chequePhoto, isImage: true },
      ]}
    />
    <TouchableOpacity
      style={styles.checkboxRow}
      onPress={() => onAgreeChange(!agreed)}
      activeOpacity={0.8}>
      <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
        {agreed ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={styles.checkboxLabel}>
        I hereby declare that the information provided is true to the best of my
        knowledge and I agree to the{' '}
        <Text style={styles.link}>Customer Terms & Conditions</Text>
      </Text>
    </TouchableOpacity>
    {agreeError ? <Text style={styles.errorText}>{agreeError}</Text> : null}
  </>
);

const styles = StyleSheet.create({
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
  },
  countryCodeField: { width: 88 },
  phoneField: { flex: 1 },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  sectionDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 20,
  },
  mt: { marginTop: 8 },
  tipBanner: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  tipText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  checkboxLabel: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  link: { color: colors.primary, fontWeight: '600' },
  errorText: { fontSize: 12, color: colors.error, marginBottom: 12, marginTop: -8 },
});
