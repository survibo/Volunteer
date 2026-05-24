import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentProfile, updateOwnProfile } from "../lib/auth";

export function useCurrentProfile() {
  return useQuery({
    queryKey: ["current-profile"],
    queryFn: getCurrentProfile,
    staleTime: 30 * 1000,
    select: (data) => data.profile,
  });
}

export function useUpdateOwnProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => updateOwnProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-profile"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member"] });
    },
  });
}
