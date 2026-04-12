import { Box, Container, Heading, Stack, Text } from "@chakra-ui/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useGetApiUsersSuspense } from "../lib/api/generated";
import { authClient } from "../lib/auth";

export const Route = createFileRoute("/_authenticated/users")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data?.user) {
      throw redirect({ to: "/login" });
    }
    return { session: data };
  },
  component: UsersPage,
});

function UsersPage() {
  const { data: response } = useGetApiUsersSuspense();
  const users = response.data.users;

  return (
    <Container maxW="4xl" py={10}>
      <Stack gap={6}>
        <Box>
          <Heading size="2xl">ユーザー</Heading>
          <Text color="fg.muted" mt={2}>
            登録済みユーザーを確認できます
          </Text>
        </Box>

        <Stack gap={3}>
          {users.length === 0 ? (
            <Text color="fg.muted">ユーザーはまだありません</Text>
          ) : (
            users.map((user) => (
              <Box key={user.id} borderWidth="1px" borderRadius="md" p={4}>
                <Stack gap={1}>
                  <Text fontWeight="medium">{user.displayName}</Text>
                  <Text color="fg.muted" fontSize="sm">
                    Slack ID: {user.slackUserId}
                  </Text>
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </Stack>
    </Container>
  );
}
