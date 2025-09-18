'use client';

import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Box,
  Divider,
  Badge,
  Icon,
  Flex
} from '@chakra-ui/react';
import { FiGlobe, FiUser, FiCalendar, FiBook } from 'react-icons/fi';

const PublishConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  deckName,
  userAlias,
  isLoading = false
}) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
      <ModalContent>
        <ModalHeader>
          <HStack spacing={2}>
            <Icon as={FiGlobe} color="green.500" />
            <Text>Publish Deck</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text color="gray.600" fontSize="sm">
              Your deck will be published to the public gallery and visible to all users.
            </Text>

            <Divider />

            <VStack spacing={3} align="stretch">
              {/* Deck Name */}
              <Flex justify="space-between" align="center">
                <HStack spacing={2}>
                  <Icon as={FiBook} color="blue.500" fontSize="sm" />
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    Deck Name:
                  </Text>
                </HStack>
                <Text fontSize="sm" fontWeight="semibold" color="gray.900">
                  {deckName}
                </Text>
              </Flex>

              {/* Publisher */}
              <Flex justify="space-between" align="center">
                <HStack spacing={2}>
                  <Icon as={FiUser} color="purple.500" fontSize="sm" />
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    Publisher:
                  </Text>
                </HStack>
                <Badge colorScheme="purple" variant="subtle">
                  {userAlias || 'Anonymous'}
                </Badge>
              </Flex>

              {/* Publish Date */}
              <Flex justify="space-between" align="center">
                <HStack spacing={2}>
                  <Icon as={FiCalendar} color="orange.500" fontSize="sm" />
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    Publish Date:
                  </Text>
                </HStack>
                <Text fontSize="sm" color="gray.600">
                  {currentDate}
                </Text>
              </Flex>
            </VStack>

            <Divider />

            <Box bg="blue.50" p={3} borderRadius="md" border="1px" borderColor="blue.200">
              <Text fontSize="xs" color="blue.700">
                <strong>Note:</strong> Once published, your deck will be available in the public gallery.
                You can publish updated versions anytime by making changes and publishing again.
              </Text>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button
              variant="ghost"
              onClick={onClose}
              isDisabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              colorScheme="green"
              onClick={onConfirm}
              isLoading={isLoading}
              loadingText="Publishing..."
              leftIcon={<Icon as={FiGlobe} />}
            >
              Publish Deck
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PublishConfirmationModal;
