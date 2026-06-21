import { useEffect, useState } from 'react';
import {
  Paper,
  Title,
  Text,
  Group,
  Stack,
  Button,
  TextInput,
  PasswordInput,
  Radio,
  Alert,
  Loader,
  Center,
  Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Settings, CheckCircle, XCircle, Plug } from 'lucide-react';
import useSettingsStore from '../store/settings';

export default function SettingsPage() {
  const {
    settings,
    loading,
    connectionStatus,
    testing,
    fetchSettings,
    saveSettings,
    testConnection,
    clearConnectionStatus,
  } = useSettingsStore();

  const [backendType, setBackendType] = useState('');
  const [backendUrl, setBackendUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setBackendType(settings.backend_type || 'ecm');
      setBackendUrl(settings.backend_url || '');
      setApiKey(settings.api_key || '');
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    const success = await saveSettings({
      backend_type: backendType,
      backend_url: backendUrl,
      api_key: apiKey || undefined,
    });
    setSaving(false);
    if (success) {
      notifications.show({
        title: 'Settings saved',
        message: 'Backend configuration updated',
        color: 'teal',
      });
    } else {
      notifications.show({
        title: 'Save failed',
        message: 'Could not save settings',
        color: 'red',
      });
    }
  };

  const handleTest = async () => {
    const result = await testConnection();
    if (result.success) {
      notifications.show({
        title: 'Connection successful',
        message: result.message || 'Backend is reachable',
        color: 'teal',
      });
    }
  };

  if (loading) {
    return (
      <Center py="xl">
        <Loader color="teal" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Title order={3} c="white">
        Settings
      </Title>

      <Paper
        p="lg"
        radius="md"
        withBorder
        style={{ borderColor: '#3f3f46' }}
        maw={600}
      >
        <Stack gap="md">
          <Group gap="sm">
            <Plug size={20} color="#14917e" />
            <Title order={5} c="white">
              Backend Connection
            </Title>
          </Group>

          <Divider color="#3f3f46" />

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

          <PasswordInput
            label={backendType === 'ecm' ? 'Dispatcharr API Key' : 'API Key'}
            description={backendType === 'ecm' ? 'Required — ECM uses your Dispatcharr API key' : 'Required if authentication is enabled'}
            placeholder={backendType === 'ecm' ? 'Dispatcharr API key from ECM settings' : 'API key'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required={backendType === 'ecm'}
          />

          {connectionStatus && (
            <Alert
              color={connectionStatus.success ? 'green' : 'red'}
              icon={
                connectionStatus.success ? (
                  <CheckCircle size={16} />
                ) : (
                  <XCircle size={16} />
                )
              }
              onClose={clearConnectionStatus}
              withCloseButton
            >
              {connectionStatus.message}
            </Alert>
          )}

          <Group>
            <Button
              variant="light"
              color="teal"
              onClick={handleTest}
              loading={testing}
              disabled={!backendUrl}
            >
              Test Connection
            </Button>
            <Button
              color="teal"
              onClick={handleSave}
              loading={saving}
              disabled={!backendUrl}
            >
              Save Settings
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
