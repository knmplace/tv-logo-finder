import { useState } from 'react';
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
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  LayoutDashboard,
  Search,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Github,
} from 'lucide-react';
import useAuthStore from '../store/auth';
import { APP_VERSION } from '../version';

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [opened, { toggle, close }] = useDisclosure(false);

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
        collapsed: { mobile: !opened },
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
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              color="white"
            />
            <img src="/logo.jpg" alt="TV Logo Finder" style={{ width: 32, height: 32, borderRadius: 6 }} />
            <Title order={4} c="white" fw={600}>
              TV Logo Finder
            </Title>
            <Text size="xs" c="dimmed" style={{ opacity: 0.6 }}>
              beta
            </Text>
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
                onClick={close}
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
        <Text size="xs" c="dimmed" ta="center" pb="xs">
          v{APP_VERSION}
        </Text>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer
        bg="#1c1c1e"
        style={{ borderTop: '1px solid #3f3f46' }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Text size="xs" c="dimmed">
            {APP_VERSION}
          </Text>
          <Group gap="xs">
            <Anchor
              href="https://github.com/knmplace/tv-logo-finder"
              target="_blank"
              rel="noopener"
              c="dimmed"
              size="xs"
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Github size={12} />
              GitHub
            </Anchor>
            <Text size="xs" c="dimmed">·</Text>
            <Text size="xs" c="dimmed">
              Logo data by jesmannstl/tvlogos
            </Text>
          </Group>
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}
