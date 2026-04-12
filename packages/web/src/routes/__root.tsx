import { Box, Button, Container, Heading, Spinner, Stack, Text } from "@chakra-ui/react";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: RootErrorComponent,
});

function RootLayout() {
  return (
    <Suspense fallback={<RoutePending />}>
      <Outlet />
    </Suspense>
  );
}

function RoutePending() {
  return (
    <Container maxW="4xl" py={20} textAlign="center">
      <Spinner size="xl" />
    </Container>
  );
}

function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Container maxW="4xl" py={20}>
      <Box borderWidth="1px" borderColor="red.200" borderRadius="md" p={6}>
        <Stack gap={4}>
          <Heading size="lg">エラーが発生しました</Heading>
          <Text color="fg.muted">{error.message}</Text>
          <Button alignSelf="flex-start" colorPalette="red" onClick={reset}>
            再試行
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
