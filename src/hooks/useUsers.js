import { useQuery } from '@tanstack/react-query';
import { userService } from '../services/userService';
import { QUERY_KEYS } from '../constants';

export const useUsers = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.USERS],
    queryFn: userService.getUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUser = id => {
  return useQuery({
    queryKey: [QUERY_KEYS.USER, id],
    queryFn: () => userService.getUserById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};
