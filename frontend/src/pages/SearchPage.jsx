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
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Search, Check, X, Image as ImageIcon } from 'lucide-react';
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

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const channelIdParam = searchParams.get('channel');
  const queryParam = searchParams.get('q') || '';

  const { channels, updateChannelLogo } = useChannelStore();
  const [query, setQuery] = useState(queryParam);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [selectedChannelId, setSelectedChannelId] = useState(channelIdParam || '');
  const [applying, setApplying] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const channelFromParam = channels.find(
    (ch) => ch.id?.toString() === channelIdParam
  );

  const channelOptions = channels.map((ch) => ({
    value: ch.id.toString(),
    label: `${ch.channel_number ? ch.channel_number + ' - ' : ''}${ch.name}`,
  }));

  const doSearch = useCallback(
    async (searchQuery, pageNum = 1, append = false) => {
      if (!searchQuery.trim()) return;
      setLoading(true);
      setSearched(true);
      try {
        const limit = 30;
        const offset = (pageNum - 1) * limit;
        const logos = await api.get(
          `/api/logos/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`
        );
        if (append) {
          setResults((prev) => [...prev, ...logos]);
        } else {
          setResults(logos);
        }
        setHasMore(logos.length === limit);
        setPage(pageNum);
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
    if (queryParam) {
      doSearch(queryParam);
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setSelectedLogo(null);
    doSearch(query, 1, false);
  };

  const handleLoadMore = () => {
    doSearch(query, page + 1, true);
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
      const ch = channels.find(
        (c) => c.id.toString() === selectedChannelId
      );
      notifications.show({
        title: 'Logo applied',
        message: `Logo set for ${ch?.name || 'channel'}`,
        color: 'teal',
      });
      setSelectedLogo(null);
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
    <Stack gap="lg" pb={selectedLogo ? 100 : 0}>
      <Title order={3} c="white">
        Logo Search
      </Title>

      {channelFromParam && (
        <Paper
          p="sm"
          radius="md"
          withBorder
          style={{ borderColor: '#3f3f46' }}
        >
          <Group gap="sm">
            <Text size="sm" c="dimmed">
              Searching for:
            </Text>
            <Text size="sm" c="white" fw={600}>
              {channelFromParam.channel_number
                ? `#${channelFromParam.channel_number} - `
                : ''}
              {channelFromParam.name}
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
            <Text size="sm" c="dimmed">
              Try a different search term or a shorter name
            </Text>
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
                        <Text size="xs" c="dimmed">
                          Selected logo
                        </Text>
                      </Stack>
                    </>
                  )}
                </Group>

                <Group gap="sm" wrap="nowrap">
                  <Select
                    placeholder="Select channel"
                    data={channelOptions}
                    value={selectedChannelId}
                    onChange={(val) => setSelectedChannelId(val || '')}
                    searchable
                    w={280}
                    size="sm"
                  />
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
