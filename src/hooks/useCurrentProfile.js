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
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member"] });
      // 영문 이름 입력 강제 이동 판단이 최신 프로필을 보도록 갱신을 기다린다.
      return queryClient.invalidateQueries({ queryKey: ["current-profile"] });
    },
  });
}
