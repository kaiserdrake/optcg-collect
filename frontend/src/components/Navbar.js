'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
  HStack,
  VStack,
  IconButton,
  Menu,
  MenuButton,
  MenuList,

  MenuItem,
  MenuDivider,
  Spinner,
  useToast,
  useDisclosure,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Image,
} from '@chakra-ui/react';

import { HamburgerIcon } from '@chakra-ui/icons';
import { FiSettings, FiUsers, FiDownload, FiMapPin, FiDatabase, FiLayers } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import LoginModal from './LoginModal';

// Import the modal components
import SettingsModal from './SettingsModal';
import UserManagementModal from './UserManagementModal';
import LocationManagementModal from './LocationManagementModal';
import CollectionManagementModal from './CollectionManagementModal';
import DeckManagementModal from './DeckManagementModal';

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
  const authContext = useAuth();

  // Add defensive check and force re-render tracking
  if (!authContext) {
    console.error('[Navbar] AuthContext is null - component is outside AuthProvider');
    return null;
  }

  const { user, loading, logout } = authContext;
  const toast = useToast();

  // Force re-render counter to debug React optimization issues
  const [renderCounter, setRenderCounter] = useState(0);

  // State for sync functionality
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);

  // Modal states - ALL DEFINED HERE
  const { isOpen: isLoginOpen, onOpen: onLoginOpen, onClose: onLoginClose } = useDisclosure();
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();
  const { isOpen: isUsersOpen, onOpen: onUsersOpen, onClose: onUsersClose } = useDisclosure();
  const { isOpen: isLocationsOpen, onOpen: onLocationsOpen, onClose: onLocationsClose } = useDisclosure();
  const { isOpen: isCollectionOpen, onOpen: onCollectionOpen, onClose: onCollectionClose } = useDisclosure();
  const { isOpen: isDeckManagementOpen, onOpen: onDeckManagementOpen, onClose: onDeckManagementClose } = useDisclosure();
  const { isOpen: isSyncOpen, onOpen: onSyncOpen, onClose: onSyncClose } = useDisclosure();

  const logContainerRef = useRef(null);
  const syncConfirmCancelRef = useRef();
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    setRenderCounter(prev => prev + 1);
    // Force component to re-render if we detect a state change
    // This helps with React optimization issues that might prevent re-renders
  }, [user, loading]); // Dependencies ensure this runs on auth state changes

  // Automatically close Login Modal if logged in
  useEffect(() => {
    if (user && isLoginOpen) {
      onLoginClose();
    }
  }, [user, isLoginOpen, onLoginClose]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [syncLogs]);

  const handleTabChange = (index) => {
    const tab = tabs[index];

    // If tab requires auth and user is not logged in, show login modal
    if (tab.requiresAuth && !user) {
      onLoginOpen();
      return;
    }

    // Otherwise change tab normally
    onTabChange?.(index);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout error',
        description: 'Failed to log out properly.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Sync functionality
  const handleSync = () => {
    setIsSyncConfirmOpen(true);
  };

  const handleSyncConfirm = () => {
    setIsSyncConfirmOpen(false);
    onSyncOpen();
    setIsSyncing(true);
    setSyncLogs([]);

    const eventSource = new EventSource(`${api}/api/sync/stream`, { withCredentials: true });

    eventSource.onmessage = (event) => {
      const logLine = event.data;
      if (logLine.startsWith('SYNC_END')) {
        eventSource.close();
        setIsSyncing(false);
        toast({
          title: "Sync Complete",
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      }

      setSyncLogs(prevLogs => [...prevLogs, logLine]);
    };

    eventSource.onerror = () => {
      toast({
        title: "Connection Error",
        description: "Could not connect to the sync service.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      eventSource.close();
      setIsSyncing(false);
    };
  };

  // Called if user cancels sync
  const handleSyncCancel = () => {
    setIsSyncConfirmOpen(false);
  };

  const handleLocationChange = (action, locationData) => {
    // Dispatch a custom event to notify CardSearch and other components
    const event = new CustomEvent('locationChanged', {
      detail: { action, locationData }
    });
    window.dispatchEvent(event);
  };

  return (
    <>
      {/* Main Navbar - Always Visible */}
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
            <HStack spacing={3} alignItems="center" flexShrink={0}>
              <Image
                src="/1pc_logo.png"
                alt="1pc Manager Logo"
                height="42"
                width="auto"
                fallback={<Box />}
              />
              <Text
                fontSize="lg"
                fontWeight="bold"
                color="gray.800"
                letterSpacing="tight"
              >
                1pc Manager
              </Text>
            </HStack>

            {/* Navigation Tabs - Hidden on small screens */}
            <HStack spacing={2} display={{ base: 'none', md: 'flex' }}>
              {tabs.map((tab, index) => (
                <ModernTab
                  key={index}
                  isActive={activeTab === index}
                  onClick={() => handleTabChange(index)}
                  badge={tab.badge}
                >
                  {tab.label}
                </ModernTab>
              ))}
            </HStack>
          </HStack>

          {/* Right side - User Menu or Sign In */}
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
                      {user.name}{user.alias ? ` | ${user.alias}` : ''}
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
                        onClick={() => handleTabChange(index)}
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
                              variant={activeTab === index ? 'solid' : 'subtle'}
                            >
                              {tab.badge}
                            </Badge>
                          )}
                        </HStack>
                      </MenuItem>
                    ))}
                    <MenuDivider />
                  </Box>

                  {/* Features available to ALL logged-in users (Normal User + Admin) */}
                  <MenuItem icon={<FiLayers />} onClick={onDeckManagementOpen}>
                    Deck Management
                  </MenuItem>
                  <MenuItem icon={<FiMapPin />} onClick={onLocationsOpen}>
                    Location Management
                  </MenuItem>
                  <MenuItem icon={<FiDatabase />} onClick={onCollectionOpen}>
                    Collection Management
                  </MenuItem>
                  <MenuItem icon={<FiSettings />} onClick={onSettingsOpen}>
                    Settings
                  </MenuItem>

                  {/* Admin-only features */}
                  {user.role === 'Admin' && (
                    <>
                      <MenuDivider />
                      <MenuItem icon={<FiUsers />} onClick={onUsersOpen}>
                        User Management
                      </MenuItem>
                      <MenuItem
                        icon={<FiDownload />}
                        onClick={handleSync}
                        isDisabled={isSyncing}
                      >
                        {isSyncing ? 'Syncing...' : 'Sync Cards'}
                      </MenuItem>
                    </>
                  )}

                  <MenuDivider />
                  <MenuItem onClick={handleLogout} color="red.600">
                    Sign Out
                  </MenuItem>
                </MenuList>
              </Menu>
            ) : (
              <Button
                colorScheme="blue"
                size="sm"
                onClick={onLoginOpen}
              >
                Sign In
              </Button>
            )}
          </Flex>
        </Flex>
      </Box>

      {/* Login Modal */}
      <LoginModal isOpen={isLoginOpen} onClose={onLoginClose} />

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={onSettingsClose} />

      {/* User Management Modal (Admin only) */}
      {user?.role === 'Admin' && (
        <UserManagementModal isOpen={isUsersOpen} onClose={onUsersClose} />
      )}

      {/* Location Management Modal */}
      <LocationManagementModal
        isOpen={isLocationsOpen}
        onClose={onLocationsClose}
        onLocationChange={handleLocationChange}
      />

      {/* Collection Management Modal */}
      <CollectionManagementModal
        isOpen={isCollectionOpen}
        onClose={onCollectionClose}
      />

      {/* Deck Management Modal */}
      <DeckManagementModal
        isOpen={isDeckManagementOpen}
        onClose={onDeckManagementClose}
      />


      {/* Sync Modal (Admin only) */}
      {user?.role === 'Admin' && (
        <Modal isOpen={isSyncOpen} onClose={onSyncClose} size="xl" closeOnOverlayClick={false}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Card Database Sync</ModalHeader>
            <ModalCloseButton isDisabled={isSyncing} />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <Text fontSize="sm" color="gray.600">
                  Synchronizing card database with latest data...
                </Text>
                <Box
                  ref={logContainerRef}
                  maxH="300px"
                  overflowY="auto"
                  bg="gray.50"
                  p={3}
                  borderRadius="md"
                  border="1px"
                  borderColor="gray.200"
                >
                  {syncLogs.length === 0 ? (
                    <Text fontSize="sm" color="gray.500" textAlign="center">
                      Starting sync...
                    </Text>
                  ) : (
                    <VStack spacing={1} align="stretch">
                      {syncLogs.map((log, index) => (
                        <Text
                          key={index}
                          fontSize="xs"
                          fontFamily="mono"
                          color="gray.700"
                        >
                          {log}
                        </Text>
                      ))}
                    </VStack>
                  )}
                </Box>
                {isSyncing && (
                  <HStack justify="center">
                    <Spinner size="sm" color="blue.500" />
                    <Text fontSize="sm" color="gray.600">
                      Sync in progress...
                    </Text>
                  </HStack>
                )}
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}

      {/* Sync Confirmation Dialog (Admin only) */}
      {user?.role === 'Admin' && (
        <AlertDialog
          isOpen={isSyncConfirmOpen}
          leastDestructiveRef={syncConfirmCancelRef}
          onClose={handleSyncCancel}
          isCentered
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                Sync Card Database
              </AlertDialogHeader>
              <AlertDialogBody>
                This will update the card database with the latest information from the scraper API.
                This process may take several minutes. Are you sure you want to continue?
              </AlertDialogBody>
              <AlertDialogFooter>
                <Button ref={syncConfirmCancelRef} onClick={handleSyncCancel}>
                  Cancel
                </Button>
                <Button colorScheme="blue" onClick={handleSyncConfirm} ml={3}>
                  Start Sync
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      )}
    </>
  );
}
