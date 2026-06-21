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
import { Monitor, AlertCircle } from 'lucide-react';
import useAuthStore from '../store/auth';

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
            <Box
              p="md"
              style={{
                borderRadius: '50%',
                backgroundColor: 'rgba(20, 145, 126, 0.15)',
              }}
            >
              <Monitor size={40} color="#14917e" />
            </Box>

            <Title order={2} c="white" ta="center">
              TV Logo Finder
            </Title>

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
