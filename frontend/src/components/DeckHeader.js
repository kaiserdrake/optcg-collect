'use client';

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Input,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Badge,
  Flex,
  Text
} from '@chakra-ui/react';
import {
  ChevronDownIcon,
  RepeatIcon
} from '@chakra-ui/icons';
import {
  FiSettings,
  FiShare2,
  FiUpload,
  FiSave,
  FiTrash2,
  FiDownload,
  FiCopy,
  FiGlobe,
  FiMapPin
} from 'react-icons/fi';
import CardImage from './CardImage';

const DeckHeader = ({
  deck,
  stats,
  onThumbnailClick,
  onNameChange,
  onClearDeck,
  onLoadDeck,
  onSaveDeck,
  onDeleteDeck,
  onShareDeckList,
  onImportDeck,
  onPublishDeck,
  onLocateDeck

}) => {
  return (
    <Box bg="white" p={4} borderRadius="lg" shadow="sm" border="1px" borderColor="gray.200">
      <Flex justify="space-between" align="center">
        {/* Left: Thumbnail and Name */}
        <HStack spacing={4}>
          {/* Deck Thumbnail - Updated to crop square from upper center */}
          <Box
            onClick={onThumbnailClick}
            cursor="pointer"
            _hover={{ opacity: 0.8 }}
            transition="opacity 0.2s"
          >
            {deck.thumbnail ? (
              <Box
                width="80px"
                height="80px"
                borderRadius="md"
                border="2px"
                borderColor="transparent"
                _hover={{ borderColor: 'blue.400' }}
                transition="border-color 0.2s"
                overflow="hidden"
                position="relative"
                bg="white"
              >
                <CardImage
                  src={deck.thumbnail}
                  alt="Deck thumbnail"
                  width="160px"  // 2x the container width for zoom
                  height="224px" // 2x the proportional height (80px * 2.8 aspect ratio)
                  objectFit="cover"
                  position="absolute"
                  top="-20px"    // Focus on middle-top portion
                  left="-40px"   // Center horizontally
                />
              </Box>
            ) : (
              <Box
                width="80px"
                height="80px"
                bg="gray.200"
                borderRadius="md"
                border="2px"
                borderColor="gray.300"
                display="flex"
                alignItems="center"
                justifyContent="center"
                _hover={{ bg: 'gray.300' }}
                transition="background-color 0.2s"
              >
                <Text fontSize="xs" color="gray.600" textAlign="center" px={2}>
                  Click to select thumbnail
                </Text>
              </Box>
            )}
          </Box>

          <VStack align="start" spacing={2}>
            <Input
              value={deck.name}
              onChange={(e) => onNameChange(e.target.value)}
              fontWeight="bold"
              fontSize="lg"
              variant="unstyled"
              placeholder="Deck Name"
              _placeholder={{ color: 'gray.400' }}
            />
            <HStack spacing={4}>
              <Text fontSize="sm" color="gray.600">
                {stats.cardCount}/50 cards
              </Text>
              {!stats.hasLeader && (
                <Badge colorScheme="red" variant="subtle">
                  No Leader
                </Badge>
              )}
              {stats.hasColorMismatch && (
                <Badge colorScheme="orange" variant="subtle">
                  Color Mismatch
                </Badge>
              )}
              {stats.hasBannedCard && (
                <Badge colorScheme="red" variant="solid">
                  Banned
                </Badge>
              )}
            </HStack>
          </VStack>
        </HStack>

        {/* Right: Actions */}
        <HStack spacing={2}>
          {/* Clear - Standalone */}
          <Button

            leftIcon={<RepeatIcon />}
            size="sm"
            variant="outline"
            onClick={onClearDeck}
            colorScheme="gray"
          >
            Clear
          </Button>

          {/* Tools Menu */}
          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<ChevronDownIcon />}
              leftIcon={<FiSettings />}
              size="sm"
              variant="outline"
            >
              Tools
            </MenuButton>
            <MenuList>
              <MenuItem onClick={onLoadDeck} icon={<FiDownload />}>
                Load
              </MenuItem>
              <MenuItem onClick={onSaveDeck} icon={<FiSave />}>
                Save
              </MenuItem>
              <MenuDivider />
              <MenuItem onClick={onLocateDeck || (() => {})} icon={<FiMapPin />}>
                Locate
              </MenuItem>
              <MenuDivider />
              <MenuItem
                onClick={onImportDeck || (() => {})}
                icon={<FiUpload />}
                isDisabled={!onImportDeck}
              >
                Import
              </MenuItem>
              <MenuDivider />
              <MenuItem
                onClick={onDeleteDeck}
                icon={<FiTrash2 />}
                color="red.600"
                isDisabled={!deck.id}
              >
                Delete
              </MenuItem>
            </MenuList>
          </Menu>

          {/* Share Menu */}
          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<ChevronDownIcon />}
              leftIcon={<FiShare2 />}
              size="sm"
              variant="outline"
              colorScheme="blue"
              isDisabled={!deck.cards || deck.cards.length === 0}
            >
              Share
            </MenuButton>
            <MenuList>
              <MenuItem
                onClick={onPublishDeck || (() => {})}
                icon={<FiGlobe />}

                isDisabled={!stats.hasLeader}
              >
                Publish
              </MenuItem>
              <MenuDivider />
              <MenuItem
                onClick={onShareDeckList}
                icon={<FiCopy />}
                isDisabled={!deck.cards || deck.cards.length === 0}
              >
                Copy Deck List
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
    </Box>
  );
};

export default DeckHeader;
