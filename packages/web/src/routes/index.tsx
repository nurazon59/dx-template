import { Button, Container, HStack, Heading, Spinner, Text } from "@chakra-ui/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "../lib/auth";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) {
      throw redirect({ to: "/login" });
    }
    return { session: data };
  },
  component: HomePage,
});

function HomePage() {
  const { session } = Route.useRouteContext();
  const { data, isPending } = authClient.useSession();

  const currentSession = data ?? session;

  if (isPending && !currentSession) {
    return (
      <Container maxW="4xl" py={20} textAlign="center">
        <Spinner size="xl" />
      </Container>
    );
  }

  return (
    <Container maxW="4xl" py={10}>
      <HStack justify="space-between" mb={6}>
        <Heading size="2xl">DX Template</Heading>
        <Button variant="outline" size="sm" onClick={() => authClient.signOut()}>
          ログアウト
        </Button>
      </HStack>
      <Text color="fg.muted">ようこそ、{currentSession?.user.name}さん</Text>
    </Container>
  );
}
