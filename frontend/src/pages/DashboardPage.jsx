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
  Anchor,
  Checkbox,
  Affix,
  Transition,
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
} from 'lucide-react';
import useChannelStore from '../store/channels';

const MAX_SELECTED = 5;
const PAGE_SIZE = 25;

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

export default function DashboardPage() {
  const navigate = useNavigate();
  const { channels, loading, syncing, lastSynced, fetchChannels, syncChannels } =
    useChannelStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(0);

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
  }, [filter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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
                          <Checkbox
                            size="xs"
                            color="teal"
                            checked={isSelected}
                            onChange={() => toggleSelect(ch)}
                          />
                        </Table.Td>
                        <Table.Td c="white">{ch.channel_number}</Table.Td>
                        <Table.Td>
                          <LogoThumbnail src={ch.logo_url ? (ch.cache_logo_url || ch.logo_url) : null} />
                        </Table.Td>
                        <Table.Td c="white">{ch.name}</Table.Td>
                        <Table.Td>
                          {ch.logo_url ? (
                            <Tooltip label={ch.logo_url} multiline w={400} withArrow>
                              <Anchor
                                href={ch.logo_url}
                                target="_blank"
                                size="xs"
                                c="#d4d4d8"
                                style={{
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {ch.logo_url}
                              </Anchor>
                            </Tooltip>
                          ) : (
                            <Text size="xs" c="#52525b">—</Text>
                          )}
                        </Table.Td>
                        <Table.Td c="#d4d4d8">{ch.group || '-'}</Table.Td>
                        <Table.Td ta="center">
                          {ch.logo_url ? (
                            <Badge color="green" variant="light" size="sm">
                              Has Logo
                            </Badge>
                          ) : (
                            <Badge color="red" variant="light" size="sm">
                              Missing
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td ta="center">
                          <ActionIcon
                            variant="light"
                            color="teal"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/search?channel=${ch.id}&q=${encodeURIComponent(ch.name)}`
                              )
                            }
                            title="Find Logo"
                          >
                            <Search size={14} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>

            {totalPages > 1 && (
              <Group justify="space-between" align="center">
                <Text size="sm" c="#a1a1aa">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                </Text>
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
              </Group>
            )}
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
