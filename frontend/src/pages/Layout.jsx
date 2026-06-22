import { useState, useEffect } from 'react';
import { Outlet, NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import {
  AppShell,
  Anchor,
  Group,
  Title,
  NavLink,
  Menu,
  UnstyledButton,
  Text,
  Box,
  Burger,
  Divider,
  ActionIcon,
  Tooltip,
  CloseButton,
  Badge,
  Affix,
  Transition,
} from '@mantine/core';
import { useWindowScroll } from '@mantine/hooks';
import { useDisclosure } from '@mantine/hooks';
import {
  LayoutDashboard,
  Search,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Github,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpCircle,
  ChevronUp,
} from 'lucide-react';
import useAuthStore from '../store/auth';
import useUpdateStore from '../store/updates';
import { APP_VERSION, DISPLAY_VERSION, IS_BETA } from '../version';

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { updateInfo, dismissed, checkForUpdates, dismiss } = useUpdateStore();
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [scroll, scrollTo] = useWindowScroll();

  useEffect(() => {
    if (user) checkForUpdates();
  }, [user, checkForUpdates]);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/search', label: 'Logo Search', icon: Search },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: 240,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: desktopCollapsed },
      }}
      footer={{ height: 40 }}
      padding="md"
    >
      <AppShell.Header
        bg="#27272a"
        style={{ borderBottom: '1px solid #3f3f46' }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger
              opened={mobileOpened}
              onClick={toggleMobile}
              hiddenFrom="sm"
              size="sm"
              color="white"
            />
            <Tooltip label={desktopCollapsed ? 'Show sidebar' : 'Hide sidebar'} position="right">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => setDesktopCollapsed((v) => !v)}
                visibleFrom="sm"
                size="sm"
              >
                {desktopCollapsed ? <PanelLeftOpen size={18} color="#a1a1aa" /> : <PanelLeftClose size={18} color="#a1a1aa" />}
              </ActionIcon>
            </Tooltip>
            <img src="/logo.jpg" alt="TV Logo Finder" style={{ width: 32, height: 32, borderRadius: 6 }} />
            <Title order={4} c="white" fw={600}>
              TV Logo Finder
            </Title>
            {IS_BETA && (
              <Badge color="orange" variant="filled" size="sm">
                BETA
              </Badge>
            )}
          </Group>

          <Menu shadow="md" width={180} position="bottom-end">
            <Menu.Target>
              <UnstyledButton>
                <Group gap="xs">
                  <User size={18} color="#d4d4d8" />
                  <Text size="sm" c="dimmed">
                    {user?.username || 'User'}
                  </Text>
                  <ChevronDown size={14} color="#a1a1aa" />
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown bg="#27272a" style={{ borderColor: '#3f3f46' }}>
              <Menu.Item
                leftSection={<LogOut size={14} />}
                onClick={logout}
                color="red"
              >
                Sign Out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        bg="#27272a"
        style={{ borderRight: '1px solid #3f3f46', display: 'flex', flexDirection: 'column' }}
        p="sm"
      >
        <Box style={{ flex: 1 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                component={RouterNavLink}
                to={item.to}
                label={item.label}
                leftSection={<Icon size={18} />}
                active={active}
                onClick={closeMobile}
                color="teal"
                variant="light"
                style={{
                  borderRadius: 6,
                  marginBottom: 4,
                }}
              />
            );
          })}
        </Box>
        <Divider color="#3f3f46" mb="xs" />
        <Text size="xs" c="#a1a1aa" ta="center" pb="xs">
          v{DISPLAY_VERSION}
        </Text>
      </AppShell.Navbar>

      {updateInfo?.update_available && !dismissed && (
        <Box
          bg="#14532d"
          px="md"
          py={6}
          style={{ borderBottom: '1px solid #166534', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        >
          <ArrowUpCircle size={16} color="#4ade80" />
          <Text size="sm" c="#4ade80" fw={500}>
            Update available: v{updateInfo.latest_stable || updateInfo.latest_beta}
          </Text>
          {(updateInfo.stable_url || updateInfo.beta_url) && (
            <Anchor
              href={updateInfo.stable_url || updateInfo.beta_url}
              target="_blank"
              rel="noopener"
              size="sm"
              c="#86efac"
              underline="always"
            >
              View release
            </Anchor>
          )}
          <CloseButton size="sm" color="green" variant="subtle" onClick={dismiss} />
        </Box>
      )}

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer
        bg="#1c1c1e"
        style={{ borderTop: '1px solid #3f3f46' }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Text size="xs" c="#a1a1aa">
            {DISPLAY_VERSION}
          </Text>
          <Group gap="xs">
            <Anchor
              href="https://github.com/knmplace/tv-logo-finder"
              target="_blank"
              rel="noopener"
              c="#a1a1aa"
              size="xs"
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Github size={12} />
              GitHub
            </Anchor>
            <Text size="xs" c="#a1a1aa">·</Text>
            <Text size="xs" c="#a1a1aa">
              Logo data by jesmannstl/tvlogos
            </Text>
          </Group>
        </Group>
      </AppShell.Footer>

      <Affix position={{ bottom: 60, right: 20 }}>
        <Transition mounted={scroll.y > 300} transition="slide-up">
          {(styles) => (
            <ActionIcon
              style={styles}
              size="xl"
              radius="xl"
              color="teal"
              variant="filled"
              onClick={() => scrollTo({ y: 0 })}
              title="Back to top"
            >
              <ChevronUp size={20} />
            </ActionIcon>
          )}
        </Transition>
      </Affix>
    </AppShell>
  );
}
