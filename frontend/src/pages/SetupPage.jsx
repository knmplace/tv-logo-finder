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
  Stepper,
  Radio,
  Group,
  Badge,
  Box,
} from '@mantine/core';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import useAuthStore from '../store/auth';
import api from '../api';

export default function SetupPage() {
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const { setup, finishSetup, error, clearError } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountError, setAccountError] = useState('');

  const [backendType, setBackendType] = useState('ecm');
  const [backendUrl, setBackendUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [connectionResult, setConnectionResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const handleCreateAccount = async () => {
    setAccountError('');
    if (password !== confirmPassword) {
      setAccountError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setAccountError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const success = await setup(username, password);
    setLoading(false);
    if (success) {
      setActive(1);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setConnectionResult(null);
    try {
      const result = await api.post('/api/settings/test-connection', {
        backend_type: backendType,
        backend_url: backendUrl,
        api_key: apiKey || undefined,
      });
      setConnectionResult(result);
    } catch (err) {
      setConnectionResult({ success: false, message: err.message });
    }
    setTesting(false);
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await api.put('/api/settings', {
        backend_type: backendType,
        backend_url: backendUrl,
        api_key: apiKey || undefined,
      });
      setActive(2);
    } catch (err) {
      setConnectionResult({ success: false, message: err.message });
    }
    setLoading(false);
  };

  return (
    <Center mih="100vh" bg="#18181b" p="md">
      <Paper
        w={520}
        p="xl"
        radius="md"
        withBorder
        style={{ borderColor: '#3f3f46' }}
      >
        <Stack gap="lg">
          <Stack gap="xs" align="center">
            <img
              src="/logo.jpg"
              alt="TV Logo Finder"
              style={{ width: 72, height: 72, borderRadius: 12 }}
            />
            <Title order={2} c="white">
              TV Logo Finder Setup
            </Title>
            <Text size="sm" c="dimmed">
              Configure your instance to get started
            </Text>
          </Stack>

          <Stepper active={active} color="teal" size="sm">
            <Stepper.Step label="Account" description="Create admin">
              <Stack gap="md" mt="md">
                {(error || accountError) && (
                  <Alert
                    color="red"
                    icon={<AlertCircle size={16} />}
                    onClose={() => { clearError(); setAccountError(''); }}
                    withCloseButton
                  >
                    {error || accountError}
                  </Alert>
                )}

                <TextInput
                  label="Username"
                  placeholder="Admin username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />

                <PasswordInput
                  label="Password"
                  placeholder="Choose a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <PasswordInput
                  label="Confirm Password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />

                <Button
                  color="teal"
                  onClick={handleCreateAccount}
                  loading={loading}
                  disabled={!username || !password || !confirmPassword}
                >
                  Create Account
                </Button>
              </Stack>
            </Stepper.Step>

            <Stepper.Step label="Backend" description="Connect service">
              <Stack gap="md" mt="md">
                <Radio.Group
                  label="Backend Type"
                  value={backendType}
                  onChange={setBackendType}
                >
                  <Group mt="xs">
                    <Radio value="ecm" label="ECM" color="teal" />
                    <Radio value="dispatcharr" label="Dispatcharr" color="teal" />
                  </Group>
                </Radio.Group>

                <TextInput
                  label="Backend URL"
                  placeholder={
                    backendType === 'ecm'
                      ? 'http://192.168.1.94:6100'
                      : 'http://192.168.1.94:9000'
                  }
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  required
                />

                <PasswordInput
                  label="API Key"
                  placeholder="Optional API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />

                {connectionResult && (
                  <Alert
                    color={connectionResult.success ? 'green' : 'red'}
                    icon={
                      connectionResult.success ? (
                        <CheckCircle size={16} />
                      ) : (
                        <XCircle size={16} />
                      )
                    }
                  >
                    {connectionResult.message}
                  </Alert>
                )}

                <Group>
                  <Button
                    variant="light"
                    color="teal"
                    onClick={handleTestConnection}
                    loading={testing}
                    disabled={!backendUrl}
                  >
                    Test Connection
                  </Button>

                  <Button
                    color="teal"
                    onClick={handleSaveSettings}
                    loading={loading}
                    disabled={!backendUrl}
                  >
                    Save and Continue
                  </Button>
                </Group>
              </Stack>
            </Stepper.Step>

            <Stepper.Step label="Done" description="Ready to go">
              <Stack gap="md" mt="md" align="center">
                <Badge size="xl" color="teal" variant="light" p="lg">
                  Setup Complete
                </Badge>
                <Text c="dimmed" ta="center">
                  Your instance is configured. Sign in with your new account to
                  start finding logos.
                </Text>
                <Button
                  color="teal"
                  onClick={() => finishSetup()}
                  fullWidth
                >
                  Get Started
                </Button>
              </Stack>
            </Stepper.Step>
          </Stepper>
        </Stack>
      </Paper>
    </Center>
  );
}
