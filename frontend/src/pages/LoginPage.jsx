import { useState } from 'react';
import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Center,
  Alert,
  Box,
} from '@mantine/core';
import { AlertCircle } from 'lucide-react';
import useAuthStore from '../store/auth';
import { APP_VERSION } from '../version';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, error, clearError } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await login(username, password);
    setLoading(false);
  };

  return (
    <Center mih="100vh" bg="#18181b">
      <Paper
        w={400}
        p="xl"
        radius="md"
        withBorder
        style={{ borderColor: '#3f3f46' }}
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md" align="center">
            <img
              src="/logo.jpg"
              alt="TV Logo Finder"
              style={{ width: 80, height: 80, borderRadius: 12 }}
            />

            <Title order={2} c="white" ta="center">
              TV Logo Finder
            </Title>

            <Text size="xs" c="#a1a1aa" ta="center" mt={-8}>
              v{APP_VERSION}
            </Text>

            <Text size="sm" c="dimmed" ta="center">
              Sign in to manage your channel logos
            </Text>

            {error && (
              <Alert
                color="red"
                icon={<AlertCircle size={16} />}
                w="100%"
                onClose={clearError}
                withCloseButton
              >
                {error}
              </Alert>
            )}

            <TextInput
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              w="100%"
            />

            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              w="100%"
            />

            <Button
              type="submit"
              fullWidth
              loading={loading}
              color="teal"
              mt="sm"
            >
              Sign In
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
