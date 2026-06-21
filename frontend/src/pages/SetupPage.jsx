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
import { APP_VERSION } from '../version';

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
  const [backendUsername, setBackendUsername] = useState('');
  const [backendPassword, setBackendPassword] = useState('');
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

  const buildSettingsPayload = () => {
    const payload = { backend_type: backendType, backend_url: backendUrl };
    if (backendType === 'ecm') {
      payload.backend_api_key = apiKey || undefined;
    } else {
      payload.backend_username = backendUsername || undefined;
      payload.backend_password = backendPassword || undefined;
    }
    return payload;
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setConnectionResult(null);
    try {
      await api.put('/api/settings', buildSettingsPayload());
      const result = await api.post('/api/settings/test-connection');
      setConnectionResult(result);
    } catch (err) {
      setConnectionResult({ success: false, message: err.message });
    }
    setTesting(false);
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await api.put('/api/settings', buildSettingsPayload());
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
                  description={backendType === 'ecm' ? 'URL of your ECM instance' : 'URL of your Dispatcharr instance'}
                  placeholder="http://your-server:port"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  required
                />

                {backendType === 'ecm' ? (
                  <PasswordInput
                    label="Dispatcharr API Key"
                    description="Required — found in your Dispatcharr settings"
                    placeholder="Dispatcharr API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    required
                  />
                ) : (
                  <>
                    <TextInput
                      label="Dispatcharr Username"
                      description="Required — your Dispatcharr login"
                      placeholder="Username"
                      value={backendUsername}
                      onChange={(e) => setBackendUsername(e.target.value)}
                      required
                    />
                    <PasswordInput
                      label="Dispatcharr Password"
                      placeholder="Password"
                      value={backendPassword}
                      onChange={(e) => setBackendPassword(e.target.value)}
                      required
                    />
                  </>
                )}

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
      <Text size="xs" c="dimmed" mt="md" style={{ opacity: 0.5 }}>
        v{APP_VERSION}
      </Text>
    </Center>
  );
}
