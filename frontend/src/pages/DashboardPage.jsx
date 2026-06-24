import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  Title,
  Text,
  Group,
  Stack,
  Button,
  TextInput,
  Table,
  Badge,
  ActionIcon,
  SimpleGrid,
  SegmentedControl,
  Box,
  Loader,
  Center,
  Tooltip,
  Checkbox,
  Affix,
  Transition,
  Select,
  Alert,
  Anchor,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  RefreshCw,
  Search,
  Tv,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  ArrowUpCircle,
} from 'lucide-react';
import useChannelStore from '../store/channels';
import useUpdateStore from '../store/updates';
import { APP_VERSION, DISPLAY_VERSION, IS_BETA } from '../version';

const MAX_SELECTED = 5;
const PAGE_SIZE_OPTIONS = ['25', '50', '100', '250', '300'];

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Paper p="md" radius="md" withBorder style={{ borderColor: '#3f3f46' }}>
      <Group gap="sm">
        <Box
          p="xs"
          style={{
            borderRadius: 8,
            backgroundColor: `${color}20`,
          }}
        >
          <Icon size={20} color={color} />
        </Box>
        <div>
          <Text size="xs" c="#a1a1aa" tt="uppercase" fw={600}>
            {label}
          </Text>
          <Text size="xl" fw={700} c="white">
            {value}
          </Text>
        </div>
      </Group>
    </Paper>
  );
}

function LogoThumbnail({ src }) {
  if (!src) {
    return (
      <Box
        w={32}
        h={32}
        style={{
          borderRadius: 4,
          backgroundColor: '#3f3f46',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ImageIcon size={16} color="#71717a" />
      </Box>
    );
  }
  return (
    <img
      src={src}
      width={32}
      height={32}
      loading="lazy"
      style={{ borderRadius: 4, objectFit: 'contain' }}
      alt=""
    />
  );
}

function VersionCard() {
  const { updateInfo, loading, checkForUpdates } = useUpdateStore();

  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  return (
    <Paper p="md" radius="md" withBorder style={{ borderColor: '#3f3f46' }}>
      <Group justify="space-between" align="center">
        <Group gap="sm">
          <ArrowUpCircle size={18} color="#14917e" />
          <Text size="sm" fw={600} c="white">Version</Text>
          <Badge color={IS_BETA ? 'orange' : 'teal'} variant="light" size="sm">
            {DISPLAY_VERSION}
          </Badge>
        </Group>
        <Group gap="md">
          {updateInfo?.latest_stable && (
            <Group gap={4}>
              <Text size="xs" c="#a1a1aa">Stable:</Text>
              <Text size="xs" c="white" fw={500}>v{updateInfo.latest_stable}</Text>
              {updateInfo.update_available && (
                <Badge color="yellow" variant="light" size="xs">New</Badge>
              )}
            </Group>
          )}
          {updateInfo?.latest_beta && (
            <Group gap={4}>
              <Text size="xs" c="#a1a1aa">Beta:</Text>
              <Text size="xs" c="white" fw={500}>v{updateInfo.latest_beta}</Text>
            </Group>
          )}
          {updateInfo?.update_available && updateInfo.stable_url && (
            <Anchor href={updateInfo.stable_url} target="_blank" rel="noopener" size="xs">
              Release notes
            </Anchor>
          )}
          <ActionIcon
            variant="subtle"
            color="teal"
            size="sm"
            onClick={() => checkForUpdates(true)}
            loading={loading}
          >
            <RefreshCw size={14} />
          </ActionIcon>
        </Group>
      </Group>
    </Paper>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { channels, loading, syncing, lastSynced, fetchChannels, syncChannels } =
    useChannelStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    if (channels.length === 0) fetchChannels();
  }, [channels.length, fetchChannels]);

  const handleSync = async () => {
    const success = await syncChannels();
    if (success) {
      notifications.show({
        title: 'Channels synced',
        message: 'Channel list updated from backend',
        color: 'teal',
      });
    } else {
      notifications.show({
        title: 'Sync failed',
        message: 'Could not sync channels from backend',
        color: 'red',
      });
    }
  };

  const toggleSelect = (ch) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s.id === ch.id);
      if (exists) return prev.filter((s) => s.id !== ch.id);
      if (prev.length >= MAX_SELECTED) {
        notifications.show({
          title: 'Limit reached',
          message: `You can select up to ${MAX_SELECTED} channels at a time`,
          color: 'yellow',
        });
        return prev;
      }
      return [...prev, ch];
    });
  };

  const handleSearchSelected = () => {
    const params = selected.map((ch) => `channels=${ch.id}`).join('&');
    navigate(`/search?${params}`);
  };

  const withLogo = channels.filter((ch) => ch.logo_url);
  const withoutLogo = channels.filter((ch) => !ch.logo_url);

  const filtered = useMemo(() => {
    let result = channels;
    if (filter === 'missing') result = result.filter((ch) => !ch.logo_url);
    if (filter === 'has') result = result.filter((ch) => ch.logo_url);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (ch) =>
          ch.name?.toLowerCase().includes(q) ||
          ch.channel_number?.toString().includes(q)
      );
    }
    return result;
  }, [channels, filter, search]);

  useEffect(() => {
    setPage(0);
  }, [filter, search, pageSize]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageRows = filtered.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <Stack gap="lg" pb={selected.length > 0 ? 80 : 0}>
      <Group justify="space-between" align="center">
        <Title order={3} c="white">
          Channel Dashboard
        </Title>
        <Button
          leftSection={<RefreshCw size={16} />}
          color="teal"
          onClick={handleSync}
          loading={syncing}
        >
          Sync Channels
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <StatCard
          icon={Tv}
          label="Total Channels"
          value={channels.length}
          color="#14917e"
        />
        <StatCard
          icon={CheckCircle}
          label="With Logo"
          value={withLogo.length}
          color="#22c55e"
        />
        <StatCard
          icon={XCircle}
          label="Missing Logo"
          value={withoutLogo.length}
          color="#ef4444"
        />
        <StatCard
          icon={Clock}
          label="Last Synced"
          value={lastSynced ? new Date(lastSynced).toLocaleDateString() : 'Never'}
          color="#a1a1aa"
        />
      </SimpleGrid>

      <VersionCard />

      {syncing && channels.length === 0 && (
        <Alert icon={<Info size={18} />} color="blue" variant="light" title="First sync in progress">
          Fetching your channel list from the backend. This may take a moment on the first sync — the filter tabs and controls will be available once loading completes.
        </Alert>
      )}

      <Group justify="space-between">
        <Group gap="sm">
          <TextInput
            placeholder="Search channels..."
            leftSection={<Search size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            w={300}
          />
          {selected.length > 0 && (
            <Badge color="teal" variant="light" size="lg">
              {selected.length}/{MAX_SELECTED} selected
            </Badge>
          )}
        </Group>
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          data={[
            { label: 'All', value: 'all' },
            { label: 'Missing Logo', value: 'missing' },
            { label: 'Has Logo', value: 'has' },
          ]}
          color="teal"
          size="xs"
        />
      </Group>

      <Paper p="md" radius="md" withBorder style={{ borderColor: '#3f3f46' }}>
        {loading ? (
          <Center py="xl">
            <Loader color="teal" />
          </Center>
        ) : filtered.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed">
              {channels.length === 0
                ? 'No channels loaded. Click "Sync Channels" to fetch from your backend.'
                : 'No channels match your filter.'}
            </Text>
          </Center>
        ) : (
          <Stack gap="md">
            <Table.ScrollContainer minWidth={900}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th c="#a1a1aa" w={40} ta="center">
                      <Tooltip label="Select channels to search logos in batch (max 5)">
                        <Box style={{ cursor: 'help' }}>
                          <Checkbox
                            size="xs"
                            color="teal"
                            checked={selected.length > 0 && selected.length === filtered.length}
                            indeterminate={selected.length > 0 && selected.length < filtered.length}
                            onChange={() => {
                              if (selected.length > 0) {
                                setSelected([]);
                              } else {
                                setSelected(filtered.slice(0, MAX_SELECTED));
                              }
                            }}
                          />
                        </Box>
                      </Tooltip>
                    </Table.Th>
                    <Table.Th c="#a1a1aa" w={50}>#</Table.Th>
                    <Table.Th c="#a1a1aa" w={50}>Logo</Table.Th>
                    <Table.Th c="#a1a1aa">Channel Name</Table.Th>
                    <Table.Th c="#a1a1aa">Existing Logo URL</Table.Th>
                    <Table.Th c="#a1a1aa" w={140}>Group</Table.Th>
                    <Table.Th c="#a1a1aa" w={100} ta="center">Status</Table.Th>
                    <Table.Th c="#a1a1aa" w={70} ta="center">Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {pageRows.map((ch) => {
                    const isSelected = selected.some((s) => s.id === ch.id);
                    return (
                      <Table.Tr
                        key={ch.id}
                        style={isSelected ? { backgroundColor: 'rgba(20, 145, 126, 0.08)' } : undefined}
                      >
                        <Table.Td ta="center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(ch)}
                            style={{ accentColor: '#14917e', cursor: 'pointer' }}
                          />
                        </Table.Td>
                        <Table.Td c="white">{ch.channel_number}</Table.Td>
                        <Table.Td>
                          <LogoThumbnail src={ch.logo_url ? (ch.cache_logo_url || ch.logo_url) : null} />
                        </Table.Td>
                        <Table.Td c="white">{ch.name}</Table.Td>
                        <Table.Td>
                          {ch.logo_url ? (
                            <a
                              href={ch.logo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={ch.logo_url}
                              style={{
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: '#d4d4d8',
                                fontSize: 12,
                                textDecoration: 'none',
                              }}
                            >
                              {ch.logo_url}
                            </a>
                          ) : (
                            <span style={{ fontSize: 12, color: '#52525b' }}>—</span>
                          )}
                        </Table.Td>
                        <Table.Td c="#d4d4d8">{ch.group || '-'}</Table.Td>
                        <Table.Td ta="center">
                          <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 4,
                            backgroundColor: ch.logo_url ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: ch.logo_url ? '#4ade80' : '#f87171',
                          }}>
                            {ch.logo_url ? 'Has Logo' : 'Missing'}
                          </span>
                        </Table.Td>
                        <Table.Td ta="center">
                          <button
                            onClick={() =>
                              navigate(
                                `/search?channel=${ch.id}&q=${encodeURIComponent(ch.name)}`
                              )
                            }
                            title="Find Logo"
                            style={{
                              background: 'rgba(20, 145, 126, 0.15)',
                              border: 'none',
                              borderRadius: 4,
                              padding: '4px 6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Search size={14} color="#14b8a6" />
                          </button>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>

            <Group justify="space-between" align="center">
              <Group gap="sm" align="center">
                <Text size="sm" c="#a1a1aa">
                  Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
                </Text>
                <Select
                  data={PAGE_SIZE_OPTIONS}
                  value={String(pageSize)}
                  onChange={(val) => setPageSize(Number(val))}
                  size="xs"
                  w={80}
                  label="Page Size"
                  styles={{ label: { color: '#a1a1aa', fontSize: 10, marginBottom: 2 } }}
                />
              </Group>
              {totalPages > 1 && (
                <Group gap="xs">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft size={16} />
                  </ActionIcon>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Button
                      key={i}
                      size="xs"
                      variant={i === page ? 'filled' : 'subtle'}
                      color={i === page ? 'teal' : 'gray'}
                      onClick={() => setPage(i)}
                      style={{ minWidth: 32 }}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight size={16} />
                  </ActionIcon>
                </Group>
              )}
            </Group>
          </Stack>
        )}
      </Paper>

      <Affix position={{ bottom: 0, left: 0, right: 0 }}>
        <Transition mounted={selected.length > 0} transition="slide-up">
          {(styles) => (
            <Paper
              style={{
                ...styles,
                borderTop: '1px solid #3f3f46',
                borderRadius: 0,
              }}
              bg="#27272a"
              p="md"
            >
              <Group justify="center" gap="md">
                <Text size="sm" c="#a1a1aa">
                  {selected.length} channel{selected.length !== 1 ? 's' : ''} selected:
                </Text>
                <Group gap="xs">
                  {selected.map((ch) => (
                    <Badge
                      key={ch.id}
                      color="teal"
                      variant="light"
                      rightSection={
                        <ActionIcon
                          size={14}
                          variant="transparent"
                          color="teal"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(ch);
                          }}
                        >
                          <X size={10} />
                        </ActionIcon>
                      }
                    >
                      {ch.name}
                    </Badge>
                  ))}
                </Group>
                <Button
                  color="teal"
                  leftSection={<Search size={16} />}
                  onClick={handleSearchSelected}
                >
                  Search Logos for Selected
                </Button>
                <Button
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={() => setSelected([])}
                >
                  Clear
                </Button>
              </Group>
            </Paper>
          )}
        </Transition>
      </Affix>
    </Stack>
  );
}
