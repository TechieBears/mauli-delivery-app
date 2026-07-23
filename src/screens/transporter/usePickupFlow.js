import { useCallback, useState } from 'react';
import {
  useScanPickupQr,
  useConfirmPickup,
  useTransporterProfile,
} from '../../hooks/useTransporterQueries';
import toast from '../../utils/toast';

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

  const openScanner = useCallback(() => {
    if (needsVehicleChoice) {
      toast.warning('Pick a vehicle', 'Choose which vehicle is making this pickup.');
      return;
    }
    navigation?.navigate('PickupScanner', {
      vendorName,
      onScanned: handleScanned,
    });
  }, [needsVehicleChoice, navigation, vendorName, handleScanned]);

  const confirmPickup = useCallback(() => {
    confirm(
      { token: scan?.token, vehicleNo: effectiveVehicle },
      {
        onSuccess: res => {
          const assigned = res?.data?.assigned?.length ?? 0;
          setScan(null);
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
  };
};

export default usePickupFlow;
