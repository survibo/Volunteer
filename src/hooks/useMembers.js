import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveMember,
  cancelMemberApproval,
  getMember,
  grantAdmin,
  listMembers,
} from "../lib/memberApi";

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: listMembers,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMember(id) {
  return useQuery({
    queryKey: ["member", id],
    queryFn: () => getMember(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useApproveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, memberNumber }) => approveMember(id, memberNumber),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member", variables.id] });
    },
  });
}

export function useCancelMemberApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => cancelMemberApproval(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member", variables.id] });
    },
  });
}

export function useGrantAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, memberNumber }) => grantAdmin(id, memberNumber),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member", variables.id] });
    },
  });
}
