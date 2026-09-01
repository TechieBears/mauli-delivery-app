import { useCallback, useRef, useState } from 'react';
import {
  useScanPickupQr,
  useConfirmPickup,
  useTransporterProfile,
} from '../../hooks/useTransporterQueries';
import toast from '../../utils/toast';
import LocationTracking from '../../services/LocationTrackingService';

/**
 * The scan → preview → confirm pickup flow, shared by every screen that can
 * start a pickup (vendor detail, order history).
 *
 * Nothing here is vendor-scoped: the QR token itself carries the vendorId and
 * the order list, and confirm-pickup only takes { token, vehicleNo }. So the
 * flow works identically wherever it's launched from — `vendorName` is passed to
 * the scanner for on-screen wording only.
 *
 * Returns the state a screen needs to render the button, the vehicle picker
 * (only relevant with multiple vehicles) and PickupConfirmModal.
 */
const usePickupFlow = ({ navigation, vendorName, onConfirmed } = {}) => {
  const [scan, setScan] = useState(null);
  const [vehicleNo, setVehicleNo] = useState(null);

  // Disclosure + OS prompt, resolved BEFORE the scanner opens.
  //
  // Google Play (Prominent Disclosure) requires the runtime request to be
  // immediately preceded by the disclosure. Previously the modal was shown here
  // but the prompt only fired much later, from LocationTracking.start() after the
  // rider had scanned and confirmed a QR — a whole flow in between, which is what
  // got the 1 Sep 2026 build rejected. Now LocationPermissionModal fires the
  // prompt itself, and only once it resolves do we continue to the scanner.
  const [locationRationaleVisible, setLocationRationaleVisible] = useState(false);
  // Once the grant is settled for this session, later pickups skip straight to
  // the scanner — start() no-ops on an already-granted permission.
  const permissionSettled = useRef(false);

  const { data: profileRes } = useTransporterProfile();
  const vehicles = (profileRes?.data?.vehicles ?? [])
    .map(v => v?.vehicleNo)
    .filter(Boolean);

  const { mutate: scanQr, isPending: scanning } = useScanPickupQr();
  const { mutate: confirm, isPending: confirming } = useConfirmPickup();

  // The backend only lets vehicleNo be omitted when exactly one vehicle is on
  // file; with several it 400s asking which one. Default to the sole vehicle so
  // the common case needs no picker.
  const effectiveVehicle = vehicleNo ?? (vehicles.length === 1 ? vehicles[0] : null);
  const needsVehicleChoice = vehicles.length > 1 && !effectiveVehicle;

  const handleScanned = useCallback(
    token => {
      scanQr(token, {
        onSuccess: res => setScan(res?.data ?? null),
        onError: err =>
          toast.error(
            'Scan failed',
            err?.message ?? 'This QR code could not be read.',
          ),
      });
    },
    [scanQr],
  );

  const launchScanner = useCallback(() => {
    navigation?.navigate('PickupScanner', {
      vendorName,
      onScanned: handleScanned,
    });
  }, [navigation, vendorName, handleScanned]);

  const openScanner = useCallback(() => {
    if (needsVehicleChoice) {
      toast.warning('Pick a vehicle', 'Choose which vehicle is making this pickup.');
      return;
    }
    // First pickup of the session: show the disclosure, which then fires the OS
    // prompt itself. The scanner opens only after that resolves, so the request
    // is never separated from the disclosure by the scan flow.
    // Shown in every permission state — including iOS after a "Don't Allow",
    // where the modal turns its button into "Open Settings" rather than firing a
    // prompt that iOS will never present. Either way the rider sees the reason.
    if (!permissionSettled.current) {
      setLocationRationaleVisible(true);
      return;
    }
    launchScanner();
  }, [needsVehicleChoice, launchScanner]);

  // Called by LocationPermissionModal once the OS prompt has been answered.
  // Either way we continue to the scanner — a declined grant must not block the
  // pickup; it only means location won't be shared (or only while foregrounded).
  const onLocationRationaleResult = useCallback(() => {
    permissionSettled.current = true;
    setLocationRationaleVisible(false);
    launchScanner();
  }, [launchScanner]);

  const confirmPickup = useCallback(() => {
    confirm(
      { token: scan?.token, vehicleNo: effectiveVehicle },
      {
        onSuccess: res => {
          const assigned = res?.data?.assigned?.length ?? 0;
          setScan(null);
          // The vehicle now has 'intransit' orders — begin (or refresh) location
          // tracking for it. start() is idempotent per vehicle, so a second batch
          // pickup on the same vehicle just keeps the existing watcher running.
          if (effectiveVehicle && assigned > 0) {
            LocationTracking.start(effectiveVehicle);
          }
          toast.success(
            'Pickup confirmed',
            `${assigned} ${assigned === 1 ? 'order is' : 'orders are'} now in transit.`,
          );
          onConfirmed?.(assigned);
        },
        onError: err =>
          toast.error(
            'Could not confirm pickup',
            err?.message ?? 'Please try again.',
          ),
      },
    );
  }, [confirm, scan, effectiveVehicle, onConfirmed]);

  return {
    scan,
    closeScan: () => setScan(null),
    scanning,
    confirming,
    openScanner,
    confirmPickup,
    vehicles,
    effectiveVehicle,
    setVehicleNo,
    // Wire these into a <LocationPermissionModal> in the screen using this flow.
    // The modal has no dismiss path by design (App Store 5.1.1(iv)) — it always
    // resolves through onLocationRationaleResult.
    locationRationaleVisible,
    onLocationRationaleResult,
  };
};

export default usePickupFlow;
