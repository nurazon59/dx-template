import { useSuspenseQuery } from "@tanstack/react-query"
import { client } from "../../../lib/api"

export const useUser = (slackUserId: string) => {
  const { data } = useSuspenseQuery({
    queryKey: ["users", "detail", slackUserId],
    queryFn: async () => {
      const res = await client.api.users[":slackUserId"].$get({
        param: { slackUserId },
      })
      if (!res.ok) throw new Error("Failed to fetch user")
      return res.json()
    },
  })

  return { data: data.user }
}
