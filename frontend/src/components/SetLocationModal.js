'use client';
import { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  HStack, Text, Box, Select, Button, Square
} from '@chakra-ui/react';
import { FiMapPin } from 'react-icons/fi';

// Helper: Chakra color for marker
const markerColorToColor = (marker) => {
  switch (marker) {
    case 'red': return 'red.500';
    case 'orange': return 'orange.500';
    case 'yellow': return 'yellow.400';
    case 'green': return 'green.500';
    case 'blue': return 'blue.500';
    case 'purple': return 'purple.500';
    case 'pink': return 'pink.400';
    case 'gray': return 'gray.500';
    default: return 'blue.500';
  }
};

const SetLocationModal = ({ isOpen, onClose, card, onLocationSet, onManageLocations }) => {
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(card?.location?.id || '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (isOpen) {
      setSelectedLocationId(card?.location?.id || '');
      setLoading(true);
      fetch(`${api}/api/locations`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          setLocations(data);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, card, api]);

  const handleSave = () => {
    setSaving(true);
    fetch(`${api}/api/collection/location`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ cardId: card.id, locationId: selectedLocationId || null }),
    })
      .then(res => res.json())
      .then(() => {
        onLocationSet && onLocationSet();
        onClose();
      })
      .finally(() => setSaving(false));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack><FiMapPin /><Text>Set Card Location</Text></HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text mb={2} fontWeight="medium">
            Choose a location for <b>{card?.name || card?.card_code}</b>:
          </Text>
          <Box mb={2} position="relative">
            <Box position="relative">
              <Select
                value={selectedLocationId}
                onChange={e => setSelectedLocationId(e.target.value)}
                isDisabled={loading}
                placeholder="No location assigned"
                mb={0}
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.type})
                  </option>
                ))}
              </Select>
              <Box position="absolute" top={0} left={2} right={2} pointerEvents="none" zIndex={1} />
            </Box>
            {selectedLocationId && (() => {
              const loc = locations.find(l => String(l.id) === String(selectedLocationId));
              if (!loc) return null;
              return (
                <Box
                  position="absolute"
                  left={2}
                  top="50%"
                  transform="translateY(-50%)"
                  pointerEvents="none"
                  zIndex={2}
                  display="flex"
                  alignItems="center"
                  height="32px"
                >
                  <Square size="16px" bg={markerColorToColor(loc.marker)} borderRadius="sm" mr={2} />
                </Box>
              );
            })()}
          </Box>
          <Text fontSize="sm" color="gray.500" mt={2}>
            You can create locations in the "Manage Locations" menu in the top right.
          </Text>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onManageLocations} size="sm" variant="ghost" mr={4}>
            Manage Locations
          </Button>
          <Button onClick={onClose} mr={3} variant="ghost">Cancel</Button>
          <Button colorScheme="blue" onClick={handleSave} isLoading={saving}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SetLocationModal;
