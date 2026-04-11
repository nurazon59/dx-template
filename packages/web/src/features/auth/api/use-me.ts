import { useSuspenseQuery } from "@tanstack/react-query";
import { client } from "../../../lib/api";

export const useMe = () => {
  const { data } = useSuspenseQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await client.api.me.$get();
      if (!res.ok) throw new Error("Failed to fetch current user");
      return res.json();
    },
  });

  return { data: data.user };
};
