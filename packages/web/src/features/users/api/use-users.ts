import { useSuspenseQuery } from "@tanstack/react-query"
import { client } from "../../../lib/api"

export const useUsers = () => {
  const { data } = useSuspenseQuery({
    queryKey: ["users", "list"],
    queryFn: async () => {
      const res = await client.api.users.$get()
      if (!res.ok) throw new Error("Failed to fetch users")
      return res.json()
    },
  })

  return { data: data.users }
}
