import { Button, Container, Heading, HStack, Spinner, Text } from "@chakra-ui/react";
import { useState } from "react";
import { authClient } from "./lib/auth";
import { LoginPage } from "./pages/LoginPage";
import { SignUpPage } from "./pages/SignUpPage";

type AuthPage = "login" | "signup";

export function App() {
  const { data: session, isPending } = authClient.useSession();
  const [page, setPage] = useState<AuthPage>("login");

  if (isPending) {
    return (
      <Container maxW="4xl" py={20} textAlign="center">
        <Spinner size="xl" />
      </Container>
    );
  }

  if (!session) {
    return page === "login" ? (
      <LoginPage onSwitchToSignUp={() => setPage("signup")} />
    ) : (
      <SignUpPage onSwitchToLogin={() => setPage("login")} />
    );
  }

  return (
    <Container maxW="4xl" py={10}>
      <HStack justify="space-between" mb={6}>
        <Heading size="2xl">DX Template</Heading>
        <Button
          variant="outline"
          size="sm"
          onClick={() => authClient.signOut()}
        >
          ログアウト
        </Button>
      </HStack>
      <Text color="fg.muted">
        ようこそ、{session.user.name}さん
      </Text>
    </Container>
  );
}
