import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import useAppStore from '../store/useAppStore';
import { useTransporterOrders } from './useTransporterQueries';
import { hasBackgroundLocationPermission } from '../services/locationPermissions';
import { STATUS_ACCEPTED } from '../screens/transporter/orderStatus';

/**
 * Decides whether the app must be BLOCKED because the rider has a delivery in
 * transit but "all the time" (background) location is off/revoked.
 *
 * Rule (per product): while at least one order is `intransit`, background
 * location is mandatory. If it isn't granted, the whole app is gated until the
 * rider re-enables it. With no in-transit order, the app is never blocked.
 *
 * Permission is re-checked:
 *   - on mount / when the in-transit count changes
 *   - whenever the app returns to the foreground (they may have toggled it in
 *     OS Settings)
 *   - on demand via the returned `recheck()` (call it on every navigation)
 *
 * Returns `{ blocked, recheck }`.
 */
const useBackgroundLocationGate = () => {
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const role = useAppStore(state => state.role);
  const isTransporter = isAuthenticated && role === 'transporter';

  // Only query orders for a logged-in transporter. staleTime/refetch settings
  // live in the shared hook; this rides the same cache the order screens use.
  const { data } = useTransporterOrders(STATUS_ACCEPTED, isTransporter);
  const inTransitCount =
    data?.pagination?.total ?? (Array.isArray(data?.data) ? data.data.length : 0);
  const hasInTransit = isTransporter && inTransitCount > 0;

  // `null` = not yet checked; treat unknown as "granted" so we never flash the
  // block screen before the first check resolves.
  const [hasBackground, setHasBackground] = useState(null);

  const recheck = useCallback(async () => {
    if (!hasInTransit) {
      // Nothing to gate — clear any stale "denied" state.
      setHasBackground(true);
      return;
    }
    const granted = await hasBackgroundLocationPermission();
    setHasBackground(granted);
  }, [hasInTransit]);

  // Re-check on mount and whenever the in-transit state flips.
  useEffect(() => {
    recheck();
  }, [recheck]);

  // Re-check when the app comes back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') recheck();
    });
    return () => sub.remove();
  }, [recheck]);

  const blocked = hasInTransit && hasBackground === false;

  return { blocked, recheck };
};

export default useBackgroundLocationGate;
