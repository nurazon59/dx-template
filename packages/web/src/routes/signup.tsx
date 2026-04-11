import { Box, Button, Container, Field, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { authClient } from "../lib/auth";

const signupSchema = z.object({
  name: z.string().min(1, "名前を入力してください"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
});

function SignUpPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    setServerError("");

    const { error: signUpError } = await authClient.signUp.email({
      name: data.name,
      email: data.email,
      password: data.password,
    });

    if (signUpError) {
      setServerError(signUpError.message ?? "サインアップに失敗しました");
    } else {
      await router.navigate({ to: "/" });
    }
  };

  return (
    <Container maxW="sm" py={20}>
      <Stack gap={6}>
        <Heading size="xl" textAlign="center">
          サインアップ
        </Heading>

        <Box as="form" onSubmit={handleSubmit(onSubmit)}>
          <Stack gap={4}>
            <Field.Root invalid={!!errors.name}>
              <Field.Label>名前</Field.Label>
              <Input type="text" {...register("name")} />
              <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
            </Field.Root>

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
              サインアップ
            </Button>
          </Stack>
        </Box>

        <Text textAlign="center" fontSize="sm">
          アカウントをお持ちの方は{" "}
          <Link to="/login" style={{ color: "var(--chakra-colors-blue-500)" }}>
            ログイン
          </Link>
        </Text>
      </Stack>
    </Container>
  );
}
