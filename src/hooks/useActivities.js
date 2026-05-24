import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applyToActivity,
  cancelOwnApplication,
  decideApplications,
  getActivity,
  getActivityMaybe,
  getMyApplication,
  listActivities,
  listApplicantCounts,
  listApplications,
  listMyApplications,
} from "../lib/activityApi";

export function useActivities(kind, isAdmin = false) {
  return useQuery({
    queryKey: ["activities", kind],
    queryFn: async () => {
      const data = await listActivities(kind);
      const ids = data.map((a) => a.id);
      const counts = isAdmin ? await listApplicantCounts(kind, ids) : {};
      return data.map((a) => ({ ...a, _applicantCount: counts[a.id] ?? 0 }));
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useActivity(kind, id) {
  return useQuery({
    queryKey: ["activity", kind, id],
    queryFn: () => getActivity(kind, id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useActivityMaybe(kind, id) {
  return useQuery({
    queryKey: ["activity", kind, id],
    queryFn: () => getActivityMaybe(kind, id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyApplication(kind, activityId, userId) {
  return useQuery({
    queryKey: ["application", kind, activityId, userId],
    queryFn: () => getMyApplication(kind, activityId, userId),
    staleTime: 30 * 1000,
  });
}

export function useMyApplications(userId) {
  return useQuery({
    queryKey: ["my-applications", userId],
    queryFn: () => listMyApplications(userId),
    staleTime: 30 * 1000,
  });
}

export function useActivityApplications(kind, activityId) {
  return useQuery({
    queryKey: ["applications", kind, activityId],
    queryFn: () => listApplications(kind, activityId),
    staleTime: 30 * 1000,
  });
}

export function useApplyActivity(kind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, userId, existingApp }) =>
      applyToActivity(kind, activityId, userId, existingApp),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["application", kind, variables.activityId, variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["my-applications", variables.userId],
      });
      queryClient.invalidateQueries({ queryKey: ["activities", kind] });
    },
  });
}

export function useCancelApplication(kind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appId }) => cancelOwnApplication(kind, appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application", kind] });
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      queryClient.invalidateQueries({ queryKey: ["activities", kind] });
    },
  });
}

export function useDecideApplications(kind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appIds, status }) =>
      decideApplications(kind, appIds, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications", kind] });
      queryClient.invalidateQueries({ queryKey: ["activity", kind] });
    },
  });
}
