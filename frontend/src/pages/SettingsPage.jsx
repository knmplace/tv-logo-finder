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
  Box,
  SegmentedControl,
  Switch,
  Badge,
  Anchor,
  Table,
  ActionIcon,
  Modal,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  Settings,
  CheckCircle,
  XCircle,
  Plug,
  ArrowUpCircle,
  RefreshCw,
  Database,
  Plus,
  Trash2,
  User,
  Lock,
} from 'lucide-react';
import useSettingsStore from '../store/settings';
import useUpdateStore from '../store/updates';
import useAuthStore from '../store/auth';
import { APP_VERSION } from '../version';
import api from '../api';

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
  const [authMethod, setAuthMethod] = useState('api_key');
  const [apiKey, setApiKey] = useState('');
  const [backendUsername, setBackendUsername] = useState('');
  const [backendPassword, setBackendPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setBackendType(settings.backend_type || 'ecm');
      setBackendUrl(settings.backend_url || '');
      setAuthMethod(settings.backend_auth_method || 'api_key');
      setApiKey(settings.backend_api_key || '');
      setBackendUsername(settings.backend_username || '');
      setBackendPassword(settings.backend_password || '');
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      backend_type: backendType,
      backend_url: backendUrl,
      backend_auth_method: authMethod,
    };
    if (authMethod === 'api_key') {
      payload.backend_api_key = apiKey || undefined;
    } else {
      payload.backend_username = backendUsername || undefined;
      payload.backend_password = backendPassword || undefined;
    }
    const success = await saveSettings(payload);
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

          <Box>
            <Text size="sm" fw={500} mb={4}>Authentication Method</Text>
            <SegmentedControl
              value={authMethod}
              onChange={setAuthMethod}
              data={[
                { label: 'API Key', value: 'api_key' },
                { label: 'Username & Password', value: 'password' },
              ]}
              color="teal"
              fullWidth
            />
            <Text size="xs" c="dimmed" mt={4}>
              {authMethod === 'api_key'
                ? 'Recommended — generate a key in Dispatcharr under Account → API Keys'
                : 'Use your Dispatcharr login credentials'}
            </Text>
          </Box>

          {authMethod === 'api_key' ? (
            <PasswordInput
              label="Dispatcharr API Key"
              placeholder="Dispatcharr API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
          ) : (
            <>
              <TextInput
                label="Dispatcharr Username"
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

      <LogoSourcesSection />
      <AccountSection />
      <UpdateSection />
    </Stack>
  );
}

function LogoSourcesSection() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [newSource, setNewSource] = useState({ name: '', repo_owner: '', repo_name: '', branch: 'main', path_prefix: '' });
  const [adding, setAdding] = useState(false);

  const fetchSources = async () => {
    try {
      const data = await api.get('/api/logos/sources');
      setSources(data);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleToggle = async (source) => {
    try {
      await api.patch(`/api/logos/sources/${source.id}`, { enabled: !source.enabled });
      await fetchSources();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const handleRefresh = async (source) => {
    try {
      const result = await api.post(`/api/logos/sources/${source.id}/refresh`);
      notifications.show({
        title: 'Source refreshed',
        message: `${source.name}: ${result.logo_count.toLocaleString()} logos cached`,
        color: 'teal',
      });
      await fetchSources();
    } catch (err) {
      notifications.show({ title: 'Refresh failed', message: err.message, color: 'red' });
    }
  };

  const handleDelete = async (source) => {
    try {
      await api.delete(`/api/logos/sources/${source.id}`);
      notifications.show({ title: 'Source removed', message: source.name, color: 'teal' });
      await fetchSources();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const handleAdd = async () => {
    if (!newSource.name || !newSource.repo_owner || !newSource.repo_name) return;
    setAdding(true);
    try {
      await api.post('/api/logos/sources', newSource);
      notifications.show({ title: 'Source added', message: newSource.name, color: 'teal' });
      setNewSource({ name: '', repo_owner: '', repo_name: '', branch: 'main', path_prefix: '' });
      closeAdd();
      await fetchSources();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
    setAdding(false);
  };

  return (
    <Paper p="lg" radius="md" withBorder style={{ borderColor: '#3f3f46' }} maw={700}>
      <Stack gap="md">
        <Group gap="sm" justify="space-between">
          <Group gap="sm">
            <Database size={20} color="#14917e" />
            <Title order={5} c="white">Logo Sources</Title>
          </Group>
          <Button size="xs" variant="light" color="teal" leftSection={<Plus size={14} />} onClick={openAdd}>
            Add Source
          </Button>
        </Group>

        <Divider color="#3f3f46" />

        {loading ? (
          <Center py="md"><Loader color="teal" size="sm" /></Center>
        ) : (
          <Table.ScrollContainer minWidth={500}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th c="#a1a1aa">Source</Table.Th>
                  <Table.Th c="#a1a1aa">Repository</Table.Th>
                  <Table.Th c="#a1a1aa" ta="center">Logos</Table.Th>
                  <Table.Th c="#a1a1aa" ta="center">Enabled</Table.Th>
                  <Table.Th c="#a1a1aa" ta="center">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sources.map((s) => (
                  <Table.Tr key={s.id}>
                    <Table.Td c="white">
                      <Group gap="xs">
                        {s.name}
                        {s.is_builtin && <Badge size="xs" variant="light" color="gray">Built-in</Badge>}
                      </Group>
                    </Table.Td>
                    <Table.Td c="#a1a1aa" style={{ fontSize: 13 }}>
                      {s.repo_owner}/{s.repo_name}
                    </Table.Td>
                    <Table.Td ta="center" c="#a1a1aa">
                      {s.logo_count > 0 ? s.logo_count.toLocaleString() : '—'}
                    </Table.Td>
                    <Table.Td ta="center">
                      <Switch
                        size="xs"
                        color="teal"
                        checked={s.enabled}
                        onChange={() => handleToggle(s)}
                      />
                    </Table.Td>
                    <Table.Td ta="center">
                      <Group gap={4} justify="center">
                        <Tooltip label="Refresh cache">
                          <ActionIcon size="sm" variant="subtle" color="teal" onClick={() => handleRefresh(s)}>
                            <RefreshCw size={14} />
                          </ActionIcon>
                        </Tooltip>
                        {!s.is_builtin && (
                          <Tooltip label="Remove source">
                            <ActionIcon size="sm" variant="subtle" color="red" onClick={() => handleDelete(s)}>
                              <Trash2 size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Stack>

      <Modal opened={addOpened} onClose={closeAdd} title="Add Logo Source" centered>
        <Stack gap="sm">
          <TextInput
            label="Display Name"
            placeholder="My Custom Logos"
            value={newSource.name}
            onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
            required
          />
          <TextInput
            label="Repository Owner"
            placeholder="username or org"
            value={newSource.repo_owner}
            onChange={(e) => setNewSource({ ...newSource, repo_owner: e.target.value })}
            required
          />
          <TextInput
            label="Repository Name"
            placeholder="repo-name"
            value={newSource.repo_name}
            onChange={(e) => setNewSource({ ...newSource, repo_name: e.target.value })}
            required
          />
          <TextInput
            label="Branch"
            placeholder="main"
            value={newSource.branch}
            onChange={(e) => setNewSource({ ...newSource, branch: e.target.value })}
          />
          <TextInput
            label="Path Prefix"
            description="Only include files under this directory (leave empty for all)"
            placeholder="logos/"
            value={newSource.path_prefix}
            onChange={(e) => setNewSource({ ...newSource, path_prefix: e.target.value })}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" color="gray" onClick={closeAdd}>Cancel</Button>
            <Button color="teal" onClick={handleAdd} loading={adding}>Add Source</Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}

function AccountSection() {
  const { user } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      notifications.show({ title: 'Error', message: 'New passwords do not match', color: 'red' });
      return;
    }
    if (newPassword.length < 6) {
      notifications.show({ title: 'Error', message: 'Password must be at least 6 characters', color: 'red' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      notifications.show({ title: 'Password changed', message: 'Your password has been updated', color: 'teal' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
    setSaving(false);
  };

  return (
    <Paper p="lg" radius="md" withBorder style={{ borderColor: '#3f3f46' }} maw={600}>
      <Stack gap="md">
        <Group gap="sm">
          <User size={20} color="#14917e" />
          <Title order={5} c="white">Account</Title>
        </Group>

        <Divider color="#3f3f46" />

        <Group justify="space-between">
          <Box>
            <Text size="sm" c="white" fw={500}>Username</Text>
            <Text size="sm" c="#a1a1aa">{user?.username || '—'}</Text>
          </Box>
          <Box>
            <Text size="sm" c="white" fw={500}>Role</Text>
            <Text size="sm" c="#a1a1aa">{user?.is_admin ? 'Admin' : 'User'}</Text>
          </Box>
        </Group>

        <Divider color="#3f3f46" label={<Group gap={4}><Lock size={12} /><Text size="xs">Change Password</Text></Group>} labelPosition="left" />

        <PasswordInput
          label="Current Password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <PasswordInput
          label="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <PasswordInput
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
          required
        />

        <Button
          color="teal"
          onClick={handleChangePassword}
          loading={saving}
          disabled={!currentPassword || !newPassword || !confirmPassword}
        >
          Change Password
        </Button>
      </Stack>
    </Paper>
  );
}

function UpdateSection() {
  const { updateInfo, loading, checkForUpdates, getNotifyBeta, setNotifyBeta } = useUpdateStore();
  const [betaEnabled, setBetaEnabled] = useState(getNotifyBeta());

  const handleToggleBeta = (e) => {
    const val = e.currentTarget.checked;
    setBetaEnabled(val);
    setNotifyBeta(val);
  };

  const handleCheck = async () => {
    await checkForUpdates(true);
    notifications.show({
      title: 'Update check complete',
      message: updateInfo?.update_available
        ? 'A new version is available!'
        : 'You are on the latest version.',
      color: updateInfo?.update_available ? 'yellow' : 'teal',
    });
  };

  return (
    <Paper
      p="lg"
      radius="md"
      withBorder
      style={{ borderColor: '#3f3f46' }}
      maw={600}
    >
      <Stack gap="md">
        <Group gap="sm">
          <ArrowUpCircle size={20} color="#14917e" />
          <Title order={5} c="white">
            Updates
          </Title>
        </Group>

        <Divider color="#3f3f46" />

        <Group justify="space-between">
          <Box>
            <Text size="sm" c="white" fw={500}>Current Version</Text>
            <Text size="sm" c="#a1a1aa">v{APP_VERSION}</Text>
          </Box>
          {updateInfo?.latest_stable && (
            <Box>
              <Text size="sm" c="white" fw={500}>Latest Stable</Text>
              <Group gap="xs">
                <Text size="sm" c="#a1a1aa">v{updateInfo.latest_stable}</Text>
                {updateInfo.update_available && (
                  <Badge color="yellow" variant="light" size="xs">New</Badge>
                )}
              </Group>
            </Box>
          )}
          {updateInfo?.latest_beta && (
            <Box>
              <Text size="sm" c="white" fw={500}>Latest Beta</Text>
              <Text size="sm" c="#a1a1aa">v{updateInfo.latest_beta}</Text>
            </Box>
          )}
        </Group>

        {updateInfo?.update_available && updateInfo.stable_url && (
          <Alert color="yellow" variant="light">
            <Text size="sm">
              A new version is available.{' '}
              <Anchor href={updateInfo.stable_url} target="_blank" rel="noopener" size="sm">
                View release notes
              </Anchor>
            </Text>
          </Alert>
        )}

        <Switch
          label="Include beta releases in update checks"
          checked={betaEnabled}
          onChange={handleToggleBeta}
          color="teal"
        />

        <Button
          variant="light"
          color="teal"
          leftSection={<RefreshCw size={16} />}
          onClick={handleCheck}
          loading={loading}
        >
          Check for Updates
        </Button>
      </Stack>
    </Paper>
  );
}
