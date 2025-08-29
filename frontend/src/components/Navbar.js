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
  Badge,
} from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import { FiSettings, FiUsers, FiDownload } from 'react-icons/fi';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Import the modal components
import SettingsModal from './SettingsModal';
import UserManagementModal from './UserManagementModal';

// Modern Tab Component
const ModernTab = ({ isActive, onClick, children, badge }) => {
  return (
    <Button
      variant="ghost"
      px={4}
      py={2}
      h="auto"
      minH="40px"
      position="relative"
      rounded="lg"
      transition="all 0.2s"
      _hover={{
        bg: isActive ? 'blue.100' : 'gray.100',
        transform: 'translateY(-1px)',
      }}
      _active={{
        transform: 'translateY(0px)',
      }}
      color={isActive ? 'blue.600' : 'gray.600'}
      fontWeight={isActive ? "semibold" : "medium"}
      onClick={onClick}
      bg={isActive ? 'blue.50' : 'transparent'}
      borderBottom={isActive ? '2px solid' : '2px solid transparent'}
      borderBottomColor={isActive ? 'blue.500' : 'transparent'}
      borderRadius="lg lg 0 0"
    >
      <HStack spacing={2}>
        <Text>{children}</Text>
        {badge && (
          <Badge
            colorScheme={isActive ? 'blue' : 'gray'}
            size="sm"
            variant={isActive ? 'solid' : 'subtle'}
          >
            {badge}
          </Badge>
        )}
      </HStack>
    </Button>
  );
};

export default function Navbar({ activeTab = 0, onTabChange, tabs = [] }) {
  const { user, loading, logout } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);
  const toast = useToast();
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Modal states
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isSettingsOpen,
    onOpen: onSettingsOpen,
    onClose: onSettingsClose
  } = useDisclosure();
  const {
    isOpen: isUsersOpen,
    onOpen: onUsersOpen,
    onClose: onUsersClose
  } = useDisclosure();

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
    };
  };

  return (
    <>
      {/* Main Navbar */}
      <Box
        bg="white"
        borderBottom="1px"
        borderColor="gray.200"
        shadow="sm"
        position="sticky"
        top="0"
        zIndex="1000"
      >
        <Flex
          h="60px"
          alignItems="center"
          justifyContent="space-between"
          px={4}
          maxW="container.xl"
          mx="auto"
        >
          {/* Left side - Logo and Tabs */}
          <HStack spacing={6} alignItems="center" flex="1">
            <Text
              fontSize="lg"
              fontWeight="bold"
              color="gray.800"
              letterSpacing="tight"
              flexShrink={0}
            >
              JuanPiece
            </Text>

            {/* Navigation Tabs - Hidden on small screens */}
            <HStack spacing={2} display={{ base: 'none', md: 'flex' }}>
              {tabs.map((tab, index) => (
                <ModernTab
                  key={index}
                  isActive={activeTab === index}
                  onClick={() => onTabChange?.(index)}
                  badge={tab.badge}
                >
                  {tab.label}
                </ModernTab>
              ))}
            </HStack>
          </HStack>

          {/* Right side - User Menu */}
          <Flex alignItems="center">
            {loading ? (
              <Spinner size="sm" color="gray.500" />
            ) : user ? (
              <Menu>
                <MenuButton
                  as={IconButton}
                  aria-label="User menu"
                  icon={<HamburgerIcon />}
                  variant="ghost"
                  size="sm"
                  color="gray.600"
                  _hover={{ bg: 'gray.100' }}
                  _active={{ bg: 'gray.200' }}
                />
                <MenuList shadow="lg" border="1px" borderColor="gray.200">
                  {/* User Info Header */}
                  <Box px={4} py={3} bg="gray.50">
                    <Text fontWeight="semibold" fontSize="sm" color="gray.800">
                      {user.name}
                    </Text>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      {user.email}
                    </Text>
                  </Box>

                  <MenuDivider m={0} />

                  {/* Mobile Navigation - Only show on small screens */}
                  <Box display={{ base: 'block', md: 'none' }}>
                    {tabs.map((tab, index) => (
                      <MenuItem
                        key={index}
                        onClick={() => onTabChange?.(index)}
                        bg={activeTab === index ? 'blue.50' : 'transparent'}
                        color={activeTab === index ? 'blue.600' : 'gray.700'}
                        fontWeight={activeTab === index ? 'semibold' : 'normal'}
                      >
                        <HStack spacing={2}>
                          <Text>{tab.label}</Text>
                          {tab.badge && (
                            <Badge
                              colorScheme={activeTab === index ? 'blue' : 'gray'}
                              size="sm"
                            >
                              {tab.badge}
                            </Badge>
                          )}
                        </HStack>
                      </MenuItem>
                    ))}
                    <MenuDivider />
                  </Box>

                  {/* Settings and Admin - Now opens modals instead of navigation */}
                  <MenuItem
                    onClick={onSettingsOpen}
                    icon={<FiSettings />}
                  >
                    Settings
                  </MenuItem>

                  {user.role === 'Admin' && (
                    <>
                      <MenuItem
                        onClick={onUsersOpen}
                        icon={<FiUsers />}
                      >
                        Manage Users
                      </MenuItem>
                      <MenuItem
                        onClick={handleSync}
                        isDisabled={isSyncing}
                        icon={<FiDownload />}
                      >
                        <HStack spacing={2} w="full" justify="space-between">
                          <Text>Sync CardList</Text>
                          {isSyncing && <Spinner size="xs" />}
                        </HStack>
                      </MenuItem>
                    </>
                  )}

                  <MenuDivider />
                  <MenuItem onClick={logout} color="red.600">
                    Logout
                  </MenuItem>
                </MenuList>
              </Menu>
            ) : (
              <Link href="/login" passHref>
                <Button colorScheme="blue" size="sm">
                  Login
                </Button>
              </Link>
            )}
          </Flex>
        </Flex>
      </Box>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={onSettingsClose}
      />

      {/* User Management Modal */}
      {user?.role === 'Admin' && (
        <UserManagementModal
          isOpen={isUsersOpen}
          onClose={onUsersClose}
        />
      )}

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
    </>
  );
}
