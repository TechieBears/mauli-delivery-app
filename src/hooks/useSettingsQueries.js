import { useQuery } from '@tanstack/react-query';
import { fetchSupportContact } from '../services/settingsService';

// Backs the transporter Help & Support contact rows. Support contact details
// change rarely, so this caches for an hour rather than the global staleTime.
export const useSupportContact = (enabled = true) =>
  useQuery({
    queryKey: ['supportContact'],
    queryFn: fetchSupportContact,
    enabled,
    staleTime: 60 * 60 * 1000,
  });
