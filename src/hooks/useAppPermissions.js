import { useEffect, useRef } from 'react';
import { requestAppPermissionsOnLaunch } from '../services/permissions';

/**
 * Requests camera, media, and notification permissions once on app launch.
 */
const useAppPermissions = () => {
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) {
      return;
    }
    requested.current = true;

    requestAppPermissionsOnLaunch().catch(() => {
      // Non-fatal: user can still grant when using camera/gallery
    });
  }, []);
};

export default useAppPermissions;
