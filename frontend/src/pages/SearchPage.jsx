import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Paper,
  Title,
  Text,
  Group,
  Stack,
  Button,
  TextInput,
  SimpleGrid,
  Box,
  Image,
  Loader,
  Center,
  Select,
  Affix,
  Transition,
  ActionIcon,
  Alert,
  Tabs,
  Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Search, Check, X, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import api from '../api';
import useChannelStore from '../store/channels';

function LogoCard({ logo, selected, onSelect }) {
  const [imgError, setImgError] = useState(false);
  const isSelected = selected?.filename === logo.filename;

  return (
    <Paper
      p="xs"
      radius="md"
      withBorder
      style={{
        borderColor: isSelected ? '#14917e' : '#3f3f46',
        borderWidth: isSelected ? 2 : 1,
        cursor: 'pointer',
        transition: 'border-color 150ms ease',
        position: 'relative',
      }}
      onClick={() => onSelect(logo)}
    >
      <Stack gap="xs" align="center">
        <Box
          w={120}
          h={120}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#18181b',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {imgError ? (
            <ImageIcon size={32} color="#3f3f46" />
          ) : (
            <Image
              src={logo.url}
              w={110}
              h={110}
              fit="contain"
              onError={() => setImgError(true)}
            />
          )}
        </Box>
        <Text
          size="xs"
          c="#d4d4d8"
          ta="center"
          lineClamp={2}
          style={{ wordBreak: 'break-all' }}
        >
          {logo.filename}
        </Text>
      </Stack>
      {isSelected && (
        <Box
          pos="absolute"
          top={6}
          right={6}
          p={2}
          style={{
            borderRadius: '50%',
            backgroundColor: '#14917e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={12} color="white" />
        </Box>
      )}
    </Paper>
  );
}

function ChannelSearchPanel({ channel, channelOptions, allChannels, onLogoApplied, defaultQuery }) {
  const { updateChannelLogo } = useChannelStore();
  const [query, setQuery] = useState(defaultQuery || channel?.name || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [selectedChannelId, setSelectedChannelId] = useState(channel?.id?.toString() || '');
  const [applying, setApplying] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const doSearch = useCallback(
    async (searchQuery, currentOffset = 0, append = false) => {
      if (!searchQuery.trim()) return;
      setLoading(true);
      setSearched(true);
      try {
        const limit = 30;
        const url = `/api/logos/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}&offset=${currentOffset}`;
        const logos = await api.get(url);
        if (append) {
          setResults((prev) => [...prev, ...logos]);
        } else {
          setResults(logos);
        }
        setHasMore(logos.length === limit);
        setPage(currentOffset + logos.length);
      } catch (err) {
        notifications.show({
          title: 'Search failed',
          message: err.message,
          color: 'red',
        });
      }
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    const initialQuery = defaultQuery || channel?.name;
    if (initialQuery) {
      doSearch(initialQuery);
    }
  }, [channel?.id]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSelectedLogo(null);
    doSearch(query, 1, false);
  };

  const handleLoadMore = () => {
    doSearch(query, page, true);
  };

  const handleApply = async () => {
    if (!selectedLogo || !selectedChannelId) return;
    setApplying(true);
    try {
      await api.post('/api/logos/apply', {
        channel_id: parseInt(selectedChannelId, 10),
        logo_url: selectedLogo.url,
        logo_name: selectedLogo.filename,
      });
      updateChannelLogo(parseInt(selectedChannelId, 10), selectedLogo.url, selectedLogo.filename);
      const ch = allChannels.find(
        (c) => c.id.toString() === selectedChannelId
      );
      notifications.show({
        title: 'Logo applied',
        message: `Logo set for ${ch?.name || 'channel'}`,
        color: 'teal',
      });
      setSelectedLogo(null);
      if (onLogoApplied) onLogoApplied(selectedChannelId);
    } catch (err) {
      notifications.show({
        title: 'Failed to apply logo',
        message: err.message,
        color: 'red',
      });
    }
    setApplying(false);
  };

  return (
    <Stack gap="md" pb={selectedLogo ? 100 : 0}>
      {channel && (
        <Paper p="sm" radius="md" withBorder style={{ borderColor: '#3f3f46' }}>
          <Group gap="sm">
            <Text size="sm" c="#a1a1aa">Applying to:</Text>
            <Text size="sm" c="white" fw={600}>
              {channel.channel_number ? `#${channel.channel_number} - ` : ''}
              {channel.name}
            </Text>
          </Group>
        </Paper>
      )}

      <form onSubmit={handleSearch}>
        <Group gap="sm">
          <TextInput
            placeholder="Search for a channel logo..."
            leftSection={<Search size={18} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="md"
            style={{ flex: 1 }}
          />
          <Button type="submit" color="teal" size="md" loading={loading}>
            Search
          </Button>
        </Group>
      </form>

      {loading && results.length === 0 ? (
        <Center py="xl">
          <Loader color="teal" />
        </Center>
      ) : searched && results.length === 0 && !loading ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <ImageIcon size={48} color="#3f3f46" />
            <Text c="dimmed">No logos found for "{query}"</Text>
            <Text size="sm" c="dimmed">Try a different search term or a shorter name</Text>
          </Stack>
        </Center>
      ) : results.length > 0 ? (
        <Stack gap="md">
          <Text size="sm" c="#a1a1aa">
            {results.length} result{results.length !== 1 ? 's' : ''}
            {hasMore ? '+' : ''}
          </Text>
          <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 5, lg: 6 }}>
            {results.map((logo) => (
              <LogoCard
                key={logo.filename}
                logo={logo}
                selected={selectedLogo}
                onSelect={setSelectedLogo}
              />
            ))}
          </SimpleGrid>
          {hasMore && (
            <Center>
              <Button
                variant="light"
                color="teal"
                onClick={handleLoadMore}
                loading={loading}
              >
                Load More
              </Button>
            </Center>
          )}
        </Stack>
      ) : null}

      <Affix position={{ bottom: 0, left: 0, right: 0 }}>
        <Transition mounted={!!selectedLogo} transition="slide-up">
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
              <Group justify="space-between" wrap="nowrap" maw={1200} mx="auto">
                <Group gap="md" wrap="nowrap">
                  {selectedLogo && (
                    <>
                      <Box
                        w={48}
                        h={48}
                        style={{
                          backgroundColor: '#18181b',
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        <Image
                          src={selectedLogo.url}
                          w={44}
                          h={44}
                          fit="contain"
                        />
                      </Box>
                      <Stack gap={2}>
                        <Text size="sm" c="white" fw={500} lineClamp={1}>
                          {selectedLogo.name}
                        </Text>
                        <Text size="xs" c="dimmed">Selected logo</Text>
                      </Stack>
                    </>
                  )}
                </Group>

                <Group gap="sm" wrap="nowrap">
                  {!channel && (
                    <Select
                      placeholder="Select channel"
                      data={channelOptions}
                      value={selectedChannelId}
                      onChange={(val) => setSelectedChannelId(val || '')}
                      searchable
                      w={280}
                      size="sm"
                    />
                  )}
                  <Button
                    color="teal"
                    onClick={handleApply}
                    loading={applying}
                    disabled={!selectedChannelId}
                  >
                    Apply Logo
                  </Button>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={() => setSelectedLogo(null)}
                  >
                    <X size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            </Paper>
          )}
        </Transition>
      </Affix>
    </Stack>
  );
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const { channels } = useChannelStore();

  const channelIds = searchParams.getAll('channels');
  const singleChannelId = searchParams.get('channel');
  const queryParam = searchParams.get('q') || '';

  const channelOptions = channels.map((ch) => ({
    value: ch.id.toString(),
    label: `${ch.channel_number ? ch.channel_number + ' - ' : ''}${ch.name}`,
  }));

  const [appliedChannels, setAppliedChannels] = useState(new Set());

  const handleLogoApplied = (channelId) => {
    setAppliedChannels((prev) => new Set([...prev, channelId]));
  };

  if (channelIds.length > 1) {
    const multiChannels = channelIds
      .map((id) => channels.find((ch) => ch.id.toString() === id))
      .filter(Boolean);

    if (multiChannels.length === 0) {
      return (
        <Center py="xl">
          <Text c="dimmed">No matching channels found. Sync channels first.</Text>
        </Center>
      );
    }

    return (
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={3} c="white">
            Batch Logo Search
          </Title>
          <Badge color="teal" variant="light" size="lg">
            {multiChannels.length} channels
          </Badge>
        </Group>

        <Tabs defaultValue={multiChannels[0]?.id.toString()} color="teal">
          <Tabs.List>
            {multiChannels.map((ch) => (
              <Tabs.Tab
                key={ch.id}
                value={ch.id.toString()}
                rightSection={
                  appliedChannels.has(ch.id.toString()) ? (
                    <Check size={14} color="#22c55e" />
                  ) : null
                }
              >
                {ch.channel_number ? `#${ch.channel_number} ` : ''}
                {ch.name}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          {multiChannels.map((ch) => (
            <Tabs.Panel key={ch.id} value={ch.id.toString()} pt="md">
              <ChannelSearchPanel
                channel={ch}
                channelOptions={channelOptions}
                allChannels={channels}
                onLogoApplied={handleLogoApplied}
              />
            </Tabs.Panel>
          ))}
        </Tabs>
      </Stack>
    );
  }

  const singleChannel = singleChannelId
    ? channels.find((ch) => ch.id.toString() === singleChannelId)
    : null;

  return (
    <Stack gap="lg">
      <Title order={3} c="white">
        Logo Search
      </Title>
      <ChannelSearchPanel
        channel={singleChannel}
        channelOptions={channelOptions}
        allChannels={channels}
        onLogoApplied={handleLogoApplied}
        defaultQuery={queryParam}
      />
    </Stack>
  );
}
