import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  Tabs,
  Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Search, Check, X, Image as ImageIcon, ExternalLink } from 'lucide-react';
import api from '../api';
import useChannelStore from '../store/channels';

function LogoCard({ logo, selected, onSelect, isPoster }) {
  const [imgError, setImgError] = useState(false);
  const isSelected = selected?.filename === logo.filename && selected?.source_id === logo.source_id;
  const boxH = isPoster ? 168 : 120;

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
          h={boxH}
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
              w={isPoster ? 120 : 110}
              h={isPoster ? boxH : 110}
              fit={isPoster ? 'cover' : 'contain'}
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
        {isPoster && logo.premiered && (
          <Text size="xs" c="dimmed">{logo.premiered.slice(0, 4)}</Text>
        )}
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

function ChannelSearchPanel({ channel, channelOptions, allChannels, onLogoApplied, defaultQuery, isBatch }) {
  const navigate = useNavigate();
  const { updateChannelLogo } = useChannelStore();
  const [query, setQuery] = useState(defaultQuery || channel?.name || '');
  const [channelResults, setChannelResults] = useState([]);
  const [showResults, setShowResults] = useState([]);
  const [mediaType, setMediaType] = useState('channel');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [selectedChannelId, setSelectedChannelId] = useState(channel?.id?.toString() || '');
  const [applying, setApplying] = useState(false);
  const [sources, setSources] = useState([]);
  const [activeSource, setActiveSource] = useState('all');

  useEffect(() => {
    setActiveSource('all');
    api.get(`/api/logos/sources?media_type=channel`).then(setSources).catch(() => {});
  }, []);

  const doSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    setActiveSource('all');
    try {
      const limit = 30;
      const url = `/api/logos/search/all?q=${encodeURIComponent(searchQuery)}&limit=${limit}`;
      const combined = await api.get(url);
      const channelLogos = combined.channel || [];
      const posters = combined.show || [];
      setChannelResults(channelLogos);
      setShowResults(posters);
      setMediaType((prev) => {
        if (channelLogos.length > 0 && posters.length === 0) return 'channel';
        if (posters.length > 0 && channelLogos.length === 0) return 'show';
        return prev;
      });
    } catch (err) {
      notifications.show({
        title: 'Search failed',
        message: err.message,
        color: 'red',
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const initialQuery = defaultQuery || channel?.name;
    if (initialQuery) {
      doSearch(initialQuery);
    }
  }, [channel?.id]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSelectedLogo(null);
    doSearch(query);
  };

  const handleSourceChange = (val) => {
    setActiveSource(val);
    setSelectedLogo(null);
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
      if (!isBatch) {
        navigate('/dashboard');
      }
    } catch (err) {
      notifications.show({
        title: 'Failed to apply logo',
        message: err.message,
        color: 'red',
      });
    }
    setApplying(false);
  };

  const isShowMode = mediaType === 'show';
  const enabledSources = sources.filter((s) => s.enabled);

  const activeResults = isShowMode ? showResults : channelResults;
  const visibleResults = !isShowMode && activeSource !== 'all'
    ? activeResults.filter((logo) => String(logo.source_id) === activeSource)
    : activeResults;

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
            placeholder="Search for a channel or TV show..."
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

      <Tabs value={mediaType} onChange={(val) => { setMediaType(val); setSelectedLogo(null); }} color="teal">
        <Tabs.List>
          <Tabs.Tab value="channel" rightSection={
            searched ? <Badge size="xs" variant="light" color="gray">{channelResults.length}</Badge> : null
          }>
            Channel Logos
          </Tabs.Tab>
          <Tabs.Tab value="show" rightSection={
            searched ? <Badge size="xs" variant="light" color="gray">{showResults.length}</Badge> : null
          }>
            TV Show Posters
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {!isShowMode && enabledSources.length > 1 && (
        <Tabs value={activeSource} onChange={handleSourceChange} color="teal">
          <Tabs.List>
            <Tabs.Tab value="all">
              All Sources
            </Tabs.Tab>
            {enabledSources.map((s) => (
              <Tabs.Tab key={s.id} value={String(s.id)} rightSection={
                s.logo_count > 0 ? (
                  <Badge size="xs" variant="light" color="gray">{s.logo_count.toLocaleString()}</Badge>
                ) : null
              }>
                {s.name}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      )}

      {loading && visibleResults.length === 0 ? (
        <Center py="xl">
          <Loader color="teal" />
        </Center>
      ) : searched && visibleResults.length === 0 && !loading ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <ImageIcon size={48} color="#3f3f46" />
            <Text c="dimmed">No {isShowMode ? 'posters' : 'logos'} found for "{query}"</Text>
            <Text size="sm" c="dimmed">Try a different search term or a shorter name</Text>
          </Stack>
        </Center>
      ) : visibleResults.length > 0 ? (
        <Stack gap="md">
          <Text size="sm" c="#a1a1aa">
            {visibleResults.length} result{visibleResults.length !== 1 ? 's' : ''}
          </Text>
          <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 5, lg: 6 }}>
            {visibleResults.map((logo, idx) => (
              <LogoCard
                key={`${logo.source_id}-${logo.filename}-${idx}`}
                logo={logo}
                selected={selectedLogo}
                onSelect={setSelectedLogo}
                isPoster={isShowMode}
              />
            ))}
          </SimpleGrid>
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
                          {selectedLogo.filename}
                        </Text>
                        <Text size="xs" c="dimmed">{selectedLogo.source_name}</Text>
                      </Stack>
                    </>
                  )}
                </Group>

                <Group gap="sm" wrap="nowrap">
                  {isShowMode && (
                    <Button
                      variant="subtle"
                      color="gray"
                      leftSection={<ExternalLink size={16} />}
                      component="a"
                      href={selectedLogo?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Full Size
                    </Button>
                  )}
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
                    {isShowMode ? 'Apply Poster' : 'Apply Logo'}
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
                isBatch
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
        isBatch={!singleChannel}
        defaultQuery={queryParam}
      />
    </Stack>
  );
}
