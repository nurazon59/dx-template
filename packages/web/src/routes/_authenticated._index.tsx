import { Button, Container, HStack, Heading, Stack, Text } from "@chakra-ui/react";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "../lib/auth";

export const Route = createFileRoute("/_authenticated/_index")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data?.user) {
      throw redirect({ to: "/login" });
    }
    return { session: data };
  },
  component: HomePage,
});

function HomePage() {
  const { session } = Route.useRouteContext();
  const currentUser = session.user;

  return (
    <Container maxW="4xl" py={10}>
      <HStack justify="space-between" mb={6}>
        <Heading size="2xl">DX Template</Heading>
        <Button variant="outline" size="sm" onClick={() => authClient.signOut()}>
          ログアウト
        </Button>
      </HStack>
      <Stack gap={4}>
        <Text color="fg.muted">ようこそ、{currentUser.name}さん</Text>
        <Link to="/agents" style={{ color: "var(--chakra-colors-blue-500)" }}>
          Agents と話す
        </Link>
        <Link to="/users" style={{ color: "var(--chakra-colors-blue-500)" }}>
          ユーザー一覧を見る
        </Link>
      </Stack>
    </Container>
  );
}
