import { Box, Button, Container, Field, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { authClient } from "../lib/auth";

const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setServerError("");

    const { error: signInError } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    });

    if (signInError) {
      setServerError(signInError.message ?? "ログインに失敗しました");
    } else {
      await router.navigate({ to: "/" });
    }
  };

  return (
    <Container maxW="sm" py={20}>
      <Stack gap={6}>
        <Heading size="xl" textAlign="center">
          ログイン
        </Heading>

        <Box as="form" onSubmit={handleSubmit(onSubmit)}>
          <Stack gap={4}>
            <Field.Root invalid={!!errors.email}>
              <Field.Label>メールアドレス</Field.Label>
              <Input type="email" {...register("email")} />
              <Field.ErrorText>{errors.email?.message}</Field.ErrorText>
            </Field.Root>

            <Field.Root invalid={!!errors.password}>
              <Field.Label>パスワード</Field.Label>
              <Input type="password" {...register("password")} />
              <Field.ErrorText>{errors.password?.message}</Field.ErrorText>
            </Field.Root>

            {serverError && (
              <Text color="red.500" fontSize="sm">
                {serverError}
              </Text>
            )}

            <Button type="submit" colorPalette="blue" loading={isSubmitting} width="full">
              ログイン
            </Button>
          </Stack>
        </Box>

        <Text textAlign="center" fontSize="sm">
          アカウントをお持ちでない方は{" "}
          <Link to="/signup" style={{ color: "var(--chakra-colors-blue-500)" }}>
            サインアップ
          </Link>
        </Text>
      </Stack>
    </Container>
  );
}
