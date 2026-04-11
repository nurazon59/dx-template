import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../../lib/api";

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { slackUserId: string; displayName: string }) => {
      const res = await client.api.users.$post({ json: input });
      if (!res.ok) throw new Error("Failed to create user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
