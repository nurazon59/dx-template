import { Box, Button, Container, Field, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { authClient } from "../lib/auth";

export function SignUpPage({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signUpError } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    setLoading(false);
    if (signUpError) {
      setError(signUpError.message ?? "サインアップに失敗しました");
    }
  };

  return (
    <Container maxW="sm" py={20}>
      <Stack gap={6}>
        <Heading size="xl" textAlign="center">
          サインアップ
        </Heading>

        <Box as="form" onSubmit={handleSubmit}>
          <Stack gap={4}>
            <Field.Root>
              <Field.Label>名前</Field.Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>メールアドレス</Field.Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>パスワード</Field.Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </Field.Root>

            {error && (
              <Text color="red.500" fontSize="sm">
                {error}
              </Text>
            )}

            <Button type="submit" colorPalette="blue" loading={loading} width="full">
              サインアップ
            </Button>
          </Stack>
        </Box>

        <Text textAlign="center" fontSize="sm">
          アカウントをお持ちの方は{" "}
          <Button variant="plain" size="sm" onClick={onSwitchToLogin} p={0}>
            ログイン
          </Button>
        </Text>
      </Stack>
    </Container>
  );
}
