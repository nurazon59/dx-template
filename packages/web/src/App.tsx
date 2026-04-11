import { Container, Heading, Text } from "@chakra-ui/react";

export function App() {
  return (
    <Container maxW="4xl" py={10}>
      <Heading size="2xl" mb={4}>
        DX Template
      </Heading>
      <Text color="fg.muted">Welcome to DX Template.</Text>
    </Container>
  );
}
