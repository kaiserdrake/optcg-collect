'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Box,
  Button,
  Flex,
  Text,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Spinner,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Updated NavTab component for tab-based navigation instead of routing
const NavTab = ({ isActive, onClick, children }) => {
  return (
    <Button
      variant="ghost"
      px={3}
      py={2}
      rounded={'md'}
      _hover={{
        bg: 'gray.200',
      }}
      color={isActive ? 'gray.800' : 'gray.400'}
      fontWeight="medium"
      onClick={onClick}
      bg={isActive ? 'gray.100' : 'transparent'}
    >
      {children}
    </Button>
  );
};

// Keep original NavLink for other navigation (like Settings, Admin)
const NavLink = ({ href, children }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link href={href} passHref>
      <ChakraLink
        px={3}
        py={2}
        rounded={'md'}
        _hover={{
          textDecoration: 'none',
          bg: 'gray.200',
        }}
        color={isActive ? 'gray.800' : 'gray.400'}
        fontWeight="medium"
      >
        {children}
      </ChakraLink>
    </Link>
  );
};

export default function Navbar({ activeTab = 0, onTabChange }) {
  const { user, loading, logout } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);
  const toast = useToast();
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const { isOpen, onOpen, onClose } = useDisclosure();
  const logContainerRef = useRef(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [syncLogs]);

  const handleSync = () => {
    onOpen();
    setIsSyncing(true);
    setSyncLogs([]);

    const eventSource = new EventSource(`${api}/api/sync/stream`, { withCredentials: true });

    eventSource.onmessage = (event) => {
      const logLine = event.data;
      if (logLine.startsWith('SYNC_END')) {
        eventSource.close();
        setIsSyncing(false);
        toast({ title: "Sync Complete", status: 'success', isClosable: true });
      }
      setSyncLogs(prevLogs => [...prevLogs, logLine]);
    };

    eventSource.onerror = () => {
      toast({
        title: "Connection Error",
        description: "Could not connect to the sync service.",
        status: "error",
        isClosable: true,
      });
      eventSource.close();
      setIsSyncing(false);
    }
  };

  return (
    <Box bg="gray.100" px={4} shadow="sm">
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <HStack spacing={8} alignItems="center">
          <Text fontSize="xl" fontWeight="bold">OPTCG Manager</Text>
        </HStack>

        <Flex alignItems="center">
          {loading ? (
            <Spinner />
          ) : user ? (
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label="Options"
                icon={<HamburgerIcon />}
                variant="outline"
              />
              <MenuList>
                <Box px={4} py={2}>
                  <Text fontWeight="bold">{user.name}</Text>
                  <Text fontSize="sm" color="gray.500">{user.email}</Text>
                </Box>
                <MenuDivider />
                <MenuItem as={Link} href="/settings">
                  Settings
                </MenuItem>

                {user.role === 'Admin' && (
                  <>
                    <MenuItem as={Link} href="/admin/users">
                      Manage Users
                    </MenuItem>
                    <MenuItem onClick={handleSync} isDisabled={isSyncing}>
                      Sync CardList
                    </MenuItem>
                  </>
                )}

                <MenuDivider />
                <MenuItem onClick={logout}>Logout</MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <Link href="/login" passHref>
              <Button colorScheme="blue" size="sm">Login</Button>
            </Link>
          )}
        </Flex>
      </Flex>

      {/* Sync Log Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>CardList Sync Progress</ModalHeader>
          <ModalCloseButton isDisabled={isSyncing} />
          <ModalBody>
            <Box
              ref={logContainerRef}
              fontFamily="monospace"
              whiteSpace="pre-wrap"
              bg="gray.800"
              color="white"
              p={4}
              borderRadius="md"
              maxH="60vh"
              overflowY="auto"
            >
              {syncLogs.join('\n')}
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
