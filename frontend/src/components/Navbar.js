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
import { FiSettings, FiUsers, FiDownload, FiMapPin, FiDatabase, FiLayers, FiHeart } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import LoginModal from './LoginModal';

// Import the modal components
import SettingsModal from './SettingsModal';
import UserManagementModal from './UserManagementModal';
import LocationManagementModal from './LocationManagementModal';
import CollectionManagementModal from './CollectionManagementModal';
import UnifiedDeckModal from './UnifiedDeckModal';

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
        title: 'Signed out successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Sign out failed',
        description: 'Please try again',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Buy Me Coffee handler
  const handleDonationClick = () => {
    // Replace 'YOUR_PAYPAL_EMAIL' with the actual PayPal email
    const paypalUrl = `https://www.paypal.com/ncp/payment/WGP5P2UEDDSBE`;
    window.open(paypalUrl, '_blank', 'noopener,noreferrer');
  };

  // Sync functionality (keeping existing code)
  const handleSync = async () => {
    setIsSyncConfirmOpen(true);
  };

  const handleSyncConfirm = async () => {
    setIsSyncConfirmOpen(false);
    setIsSyncing(true);
    setSyncLogs([]);
    onSyncOpen();

    try {
      // Use the correct endpoint that exists in the backend
      const response = await fetch(`${api}/api/sync/stream`, {
        method: 'GET', // Changed from POST to GET
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.trim()) {
            // The backend sends Server-Sent Events in format "data: <message>"
            if (line.startsWith('data: ')) {
              const logMessage = line.substring(6); // Remove "data: " prefix
              setSyncLogs(prev => [...prev, logMessage]);

              // Check for sync completion
              if (logMessage.startsWith('SYNC_END:')) {
                toast({
                  title: 'Sync Complete',
                  description: 'Card database sync completed successfully',
                  status: 'success',
                  duration: 5000,
                  isClosable: true,
                });
                setIsSyncing(false);
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncLogs(prev => [...prev, `Connection error: ${error.message}`]);
      toast({
        title: "Sync Failed",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSyncing(false);
    }
  };

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

          {/* Right side User Menu or Sign In */}
          <Flex alignItems="center" spacing={3}>
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
                  {/* Buy Me Coffee in Mobile Menu */}
                  <MenuItem icon={<FiHeart />} onClick={handleDonationClick} color="pink.600">
                    Buy me a coffee
                  </MenuItem>
                  <MenuDivider />
                  <MenuItem onClick={handleLogout} color="red.600">
                    Sign Out
                  </MenuItem>
                </MenuList>
              </Menu>
            ) : (
              <HStack spacing={2}>
                {/* Buy Me Coffee for non-logged users on mobile - compact version */}
                <IconButton
                  icon={<FiHeart />}
                  size="sm"
                  variant="outline"
                  colorScheme="pink"
                  aria-label="Buy me a coffee"
                  onClick={handleDonationClick}
                  display={{ base: 'flex', sm: 'none' }}
                  _hover={{
                    bg: 'pink.50',
                    borderColor: 'pink.300',
                    transform: 'translateY(-1px)'
                  }}
                  transition="all 0.2s"
                />
                <Button
                  colorScheme="blue"
                  size="sm"
                  onClick={onLoginOpen}
                >
                  Sign In
                </Button>
              </HStack>
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
      <UnifiedDeckModal
        isOpen={isDeckManagementOpen}
        onClose={onDeckManagementClose}
        onSelect={(selectedDeck) => {
          // For navbar context, the deck selection just highlights the deck
          // The actual navigation happens via the "To MatchUp" and "To Builder" buttons
        }}
        context="navbar"
        title="Deck Management"
      />

      {/* Sync Modal (Admin only) */}
      {user?.role === 'Admin' && (
        <Modal isOpen={isSyncOpen} onClose={onSyncClose} size="xl" closeOnOverlayClick={false}>
          <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
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
                    <Text fontSize="sm" color="gray.500">
                      Waiting for sync to start...
                    </Text>
                  ) : (
                    syncLogs.map((log, index) => (
                      <Text key={index} fontSize="sm" fontFamily="mono">
                        {log}
                      </Text>
                    ))
                  )}
                </Box>
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
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                Sync Card Database
              </AlertDialogHeader>

              <AlertDialogBody>
                This will download the latest card data from the official One Piece TCG database and update your local database. This process may take several minutes.
                <br /><br />
                Are you sure you want to continue?
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
};
