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
  Image,
  Loader,
  Center,
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
} from 'lucide-react';
import useChannelStore from '../store/channels';

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

export default function DashboardPage() {
  const navigate = useNavigate();
  const { channels, loading, syncing, lastSynced, fetchChannels, syncChannels } =
    useChannelStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

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

  return (
    <Stack gap="lg">
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

      <Paper p="md" radius="md" withBorder style={{ borderColor: '#3f3f46' }}>
        <Stack gap="md">
          <Group justify="space-between">
            <TextInput
              placeholder="Search channels..."
              leftSection={<Search size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              w={300}
            />
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
            <Table.ScrollContainer minWidth={600}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th c="#a1a1aa">#</Table.Th>
                    <Table.Th c="#a1a1aa">Logo</Table.Th>
                    <Table.Th c="#a1a1aa">Channel Name</Table.Th>
                    <Table.Th c="#a1a1aa">Group</Table.Th>
                    <Table.Th c="#a1a1aa">Status</Table.Th>
                    <Table.Th c="#a1a1aa">Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filtered.map((ch) => (
                    <Table.Tr key={ch.id}>
                      <Table.Td c="white">{ch.channel_number}</Table.Td>
                      <Table.Td>
                        {ch.logo_url ? (
                          <Image
                            src={ch.logo_url}
                            w={32}
                            h={32}
                            fit="contain"
                            fallbackSrc=""
                            style={{ borderRadius: 4 }}
                          />
                        ) : (
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
                        )}
                      </Table.Td>
                      <Table.Td c="white">{ch.name}</Table.Td>
                      <Table.Td c="#d4d4d8">{ch.group || '-'}</Table.Td>
                      <Table.Td>
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
                      <Table.Td>
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
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
