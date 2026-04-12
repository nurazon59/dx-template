import { Box, HStack, Heading, Link } from "@chakra-ui/react";
import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <Box minH="100vh">
      <Box
        as="header"
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={100}
        bg="white"
        borderBottomWidth="1px"
        px={6}
        py={3}
      >
        <HStack justify="space-between">
          <Link to="/">
            <Heading size="md">DX Template</Heading>
          </Link>
          <HStack gap={4}>
            <Link to="/agents" fontSize="sm">
              Agents
            </Link>
            <Link to="/users" fontSize="sm">
              ユーザー
            </Link>
          </HStack>
        </HStack>
      </Box>
      <Box pt="56px">
        <Outlet />
      </Box>
    </Box>
  );
}
