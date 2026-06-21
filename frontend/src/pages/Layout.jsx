import { useState } from 'react';
import { Outlet, NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import {
  AppShell,
  Group,
  Title,
  NavLink,
  Menu,
  UnstyledButton,
  Text,
  Box,
  Burger,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  Monitor,
  LayoutDashboard,
  Search,
  Settings,
  LogOut,
  User,
  ChevronDown,
} from 'lucide-react';
import useAuthStore from '../store/auth';

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
            <Monitor size={24} color="#14917e" />
            <Title order={4} c="white" fw={600}>
              TV Logo Finder
            </Title>
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
        style={{ borderRight: '1px solid #3f3f46' }}
        p="sm"
      >
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
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
