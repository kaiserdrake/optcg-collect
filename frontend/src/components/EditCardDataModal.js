'use client';

import { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  FormControl,
  FormLabel,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Box,
  Divider,
  Textarea,
  Select,
  NumberInput,
  NumberInputField,
  Grid,
  GridItem,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  Spinner,
} from '@chakra-ui/react';
import { FiPlus, FiEdit, FiSave } from 'react-icons/fi';

const EditCardDataModal = ({ isOpen, onClose }) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [searchCardId, setSearchCardId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [cardFound, setCardFound] = useState(false);
  const toast = useToast();
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Form state for new/edit card
  const [cardData, setCardData] = useState({
    id: '',
    card_code: '',
    name: '',
    rarity: '',
    category: '',
    color: '',
    cost: '',
    power: '',
    counter: '',
    effect: '',
    trigger_effect: '',
    img_url: '',
    block: '',
    attributes: [],
    types: [],
  });

  // Temporary inputs for adding attributes and types
  const [newAttribute, setNewAttribute] = useState('');
  const [newType, setNewType] = useState('');

  const handleInputChange = (field, value) => {
    setCardData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddAttribute = () => {
    if (newAttribute.trim() && !cardData.attributes.includes(newAttribute.trim())) {
      setCardData(prev => ({
        ...prev,
        attributes: [...prev.attributes, newAttribute.trim()]
      }));
      setNewAttribute('');
    }
  };

  const handleRemoveAttribute = (attr) => {
    setCardData(prev => ({
      ...prev,
      attributes: prev.attributes.filter(a => a !== attr)
    }));
  };

  const handleAddType = () => {
    if (newType.trim() && !cardData.types.includes(newType.trim())) {
      setCardData(prev => ({
        ...prev,
        types: [...prev.types, newType.trim()]
      }));
      setNewType('');
    }
  };

  const handleRemoveType = (type) => {
    setCardData(prev => ({
      ...prev,
      types: prev.types.filter(t => t !== type)
    }));
  };

  const resetForm = () => {
    setCardData({
      id: '',
      card_code: '',
      name: '',
      rarity: '',
      category: '',
      color: '',
      cost: '',
      power: '',
      counter: '',
      effect: '',
      trigger_effect: '',
      img_url: '',
      block: '',
      attributes: [],
      types: [],
    });
    setNewAttribute('');
    setNewType('');
    setCardFound(false);
  };

  const handleCreateNewCard = async () => {
    // Validation
    if (!cardData.id.trim() || !cardData.name.trim()) {
      toast({
        title: 'Required Fields Missing',
        description: 'Card ID and Name are required',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${api}/api/cards/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...cardData,
          cost: cardData.cost ? parseInt(cardData.cost) : null,
          power: cardData.power ? parseInt(cardData.power) : null,
          counter: cardData.counter ? parseInt(cardData.counter) : null,
          block: cardData.block ? parseInt(cardData.block) : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create card');
      }

      toast({
        title: 'Card Created',
        description: `Card "${cardData.name}" has been created successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error creating card:', error);
      toast({
        title: 'Create Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchCard = async () => {
    if (!searchCardId.trim()) {
      toast({
        title: 'Card ID Required',
        description: 'Please enter a card ID to search',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSearching(true);
    setCardFound(false);

    try {
      const response = await fetch(`${api}/api/cards/${encodeURIComponent(searchCardId.trim())}/edit`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Card not found');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch card');
      }

      const card = await response.json();

      // Populate form with card data
      setCardData({
        id: card.id || '',
        card_code: card.card_code || '',
        name: card.name || '',
        rarity: card.rarity || '',
        category: card.category || '',
        color: card.color || '',
        cost: card.cost !== null ? card.cost.toString() : '',
        power: card.power !== null ? card.power.toString() : '',
        counter: card.counter !== null ? card.counter.toString() : '',
        effect: card.effect || '',
        trigger_effect: card.trigger_effect || '',
        img_url: card.img_url || '',
        block: card.block !== null ? card.block.toString() : '',
        attributes: card.attributes || [],
        types: card.types || [],
      });

      setCardFound(true);

      toast({
        title: 'Card Found',
        description: `Loaded card: ${card.name}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

    } catch (error) {
      console.error('Error searching card:', error);
      toast({
        title: 'Search Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      resetForm();
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpdateCard = async () => {
    // Validation
    if (!cardData.id.trim() || !cardData.name.trim()) {
      toast({
        title: 'Required Fields Missing',
        description: 'Card ID and Name are required',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${api}/api/cards/${encodeURIComponent(cardData.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          card_code: cardData.card_code,
          name: cardData.name,
          rarity: cardData.rarity,
          category: cardData.category,
          color: cardData.color,
          cost: cardData.cost ? parseInt(cardData.cost) : null,
          power: cardData.power ? parseInt(cardData.power) : null,
          counter: cardData.counter ? parseInt(cardData.counter) : null,
          block: cardData.block ? parseInt(cardData.block) : null,
          effect: cardData.effect,
          trigger_effect: cardData.trigger_effect,
          img_url: cardData.img_url,
          attributes: cardData.attributes,
          types: cardData.types,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update card');
      }

      toast({
        title: 'Card Updated',
        description: `Card "${cardData.name}" has been updated successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

    } catch (error) {
      console.error('Error updating card:', error);
      toast({
        title: 'Update Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSearchCardId('');
    setTabIndex(0);
    resetForm();
    onClose();
  };

  // Render card form fields
  const renderCardForm = (isEditMode = false) => (
    <Grid templateColumns="repeat(2, 1fr)" gap={4}>
      {/* Card ID - Required (Read-only in edit mode) */}
      <GridItem>
        <FormControl isRequired>
          <FormLabel>Card ID</FormLabel>
          <Input
            placeholder="e.g., OP01-001"
            value={cardData.id}
            onChange={(e) => handleInputChange('id', e.target.value)}
            isReadOnly={isEditMode}
            bg={isEditMode ? 'gray.100' : 'white'}
          />
        </FormControl>
      </GridItem>

      {/* Card Code */}
      <GridItem>
        <FormControl>
          <FormLabel>Card Code</FormLabel>
          <Input
            placeholder="e.g., OP01-001"
            value={cardData.card_code}
            onChange={(e) => handleInputChange('card_code', e.target.value)}
          />
        </FormControl>
      </GridItem>

      {/* Name - Required */}
      <GridItem colSpan={2}>
        <FormControl isRequired>
          <FormLabel>Name</FormLabel>
          <Input
            placeholder="Card name"
            value={cardData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
        </FormControl>
      </GridItem>

      {/* Rarity */}
      <GridItem>
        <FormControl>
          <FormLabel>Rarity</FormLabel>
          <Select
            placeholder="Select rarity"
            value={cardData.rarity}
            onChange={(e) => handleInputChange('rarity', e.target.value)}
          >
            <option value="Common">Common</option>
            <option value="Uncommon">Uncommon</option>
            <option value="Rare">Rare</option>
            <option value="Super Rare">Super Rare</option>
            <option value="Secret Rare">Secret Rare</option>
            <option value="Leader">Leader</option>
            <option value="Promo">Promo</option>
          </Select>
        </FormControl>
      </GridItem>

      {/* Category */}
      <GridItem>
        <FormControl>
          <FormLabel>Category</FormLabel>
          <Select
            placeholder="Select category"
            value={cardData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
          >
            <option value="Leader">Leader</option>
            <option value="Character">Character</option>
            <option value="Event">Event</option>
            <option value="Stage">Stage</option>
          </Select>
        </FormControl>
      </GridItem>

      {/* Color */}
      <GridItem>
        <FormControl>
          <FormLabel>Color</FormLabel>
          <Select
            placeholder="Select color"
            value={cardData.color}
            onChange={(e) => handleInputChange('color', e.target.value)}
          >
            <option value="Red">Red</option>
            <option value="Green">Green</option>
            <option value="Blue">Blue</option>
            <option value="Purple">Purple</option>
            <option value="Black">Black</option>
            <option value="Yellow">Yellow</option>
            <option value="Red/Green">Red/Green</option>
            <option value="Red/Blue">Red/Blue</option>
            <option value="Red/Purple">Red/Purple</option>
            <option value="Red/Black">Red/Black</option>
            <option value="Red/Yellow">Red/Yellow</option>
            <option value="Green/Blue">Green/Blue</option>
            <option value="Green/Purple">Green/Purple</option>
            <option value="Green/Black">Green/Black</option>
            <option value="Green/Yellow">Green/Yellow</option>
            <option value="Blue/Purple">Blue/Purple</option>
            <option value="Blue/Black">Blue/Black</option>
            <option value="Blue/Yellow">Blue/Yellow</option>
            <option value="Purple/Black">Purple/Black</option>
            <option value="Purple/Yellow">Purple/Yellow</option>
            <option value="Black/Yellow">Black/Yellow</option>
          </Select>
        </FormControl>
      </GridItem>

      {/* Cost */}
      <GridItem>
        <FormControl>
          <FormLabel>Cost</FormLabel>
          <NumberInput
            min={0}
            value={cardData.cost}
            onChange={(value) => handleInputChange('cost', value)}
          >
            <NumberInputField placeholder="0" />
          </NumberInput>
        </FormControl>
      </GridItem>

      {/* Power */}
      <GridItem>
        <FormControl>
          <FormLabel>Power</FormLabel>
          <NumberInput
            min={0}
            value={cardData.power}
            onChange={(value) => handleInputChange('power', value)}
          >
            <NumberInputField placeholder="0" />
          </NumberInput>
        </FormControl>
      </GridItem>

      {/* Counter */}
      <GridItem>
        <FormControl>
          <FormLabel>Counter</FormLabel>
          <NumberInput
            min={0}
            value={cardData.counter}
            onChange={(value) => handleInputChange('counter', value)}
          >
            <NumberInputField placeholder="0" />
          </NumberInput>
        </FormControl>
      </GridItem>

      {/* Block */}
      <GridItem>
        <FormControl>
          <FormLabel>Block</FormLabel>
          <NumberInput
            min={0}
            value={cardData.block}
            onChange={(value) => handleInputChange('block', value)}
          >
            <NumberInputField placeholder="0" />
          </NumberInput>
        </FormControl>
      </GridItem>

      {/* Effect */}
      <GridItem colSpan={2}>
        <FormControl>
          <FormLabel>Effect</FormLabel>
          <Textarea
            placeholder="Card effect text"
            value={cardData.effect}
            onChange={(e) => handleInputChange('effect', e.target.value)}
            rows={3}
          />
        </FormControl>
      </GridItem>

      {/* Trigger Effect */}
      <GridItem colSpan={2}>
        <FormControl>
          <FormLabel>Trigger Effect</FormLabel>
          <Textarea
            placeholder="Trigger effect text"
            value={cardData.trigger_effect}
            onChange={(e) => handleInputChange('trigger_effect', e.target.value)}
            rows={2}
          />
        </FormControl>
      </GridItem>

      {/* Image URL */}
      <GridItem colSpan={2}>
        <FormControl>
          <FormLabel>Image URL</FormLabel>
          <Input
            placeholder="https://..."
            value={cardData.img_url}
            onChange={(e) => handleInputChange('img_url', e.target.value)}
          />
        </FormControl>
      </GridItem>

      {/* Attributes */}
      <GridItem colSpan={2}>
        <FormControl>
          <FormLabel>Attributes</FormLabel>
          <HStack>
            <Input
              placeholder="Add attribute (e.g., Slash, Ranged)"
              value={newAttribute}
              onChange={(e) => setNewAttribute(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddAttribute();
                }
              }}
            />
            <Button onClick={handleAddAttribute} colorScheme="blue" size="sm">
              Add
            </Button>
          </HStack>
          <Wrap mt={2}>
            {cardData.attributes.map((attr, index) => (
              <WrapItem key={index}>
                <Tag size="md" colorScheme="blue" borderRadius="full">
                  <TagLabel>{attr}</TagLabel>
                  <TagCloseButton onClick={() => handleRemoveAttribute(attr)} />
                </Tag>
              </WrapItem>
            ))}
          </Wrap>
        </FormControl>
      </GridItem>

      {/* Types */}
      <GridItem colSpan={2}>
        <FormControl>
          <FormLabel>Types</FormLabel>
          <HStack>
            <Input
              placeholder="Add type (e.g., Straw Hat Crew, Supernovas)"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddType();
                }
              }}
            />
            <Button onClick={handleAddType} colorScheme="blue" size="sm">
              Add
            </Button>
          </HStack>
          <Wrap mt={2}>
            {cardData.types.map((type, index) => (
              <WrapItem key={index}>
                <Tag size="md" colorScheme="purple" borderRadius="full">
                  <TagLabel>{type}</TagLabel>
                  <TagCloseButton onClick={() => handleRemoveType(type)} />
                </Tag>
              </WrapItem>
            ))}
          </Wrap>
        </FormControl>
      </GridItem>
    </Grid>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
      <ModalContent maxH="90vh">
        <ModalHeader>Edit Card Data</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Tabs index={tabIndex} onChange={setTabIndex} colorScheme="blue">
            <TabList>
              <Tab>
                <HStack spacing={2}>
                  <FiPlus />
                  <Text>Create New Card</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <FiEdit />
                  <Text>Edit Existing Card</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* Create New Card Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Box
                    p={4}
                    borderRadius="md"
                    bg="blue.50"
                    borderWidth="1px"
                    borderColor="blue.200"
                  >
                    <Text fontSize="sm" color="blue.700">
                      Create a new card entry in the database. All fields except ID and Name are optional.
                    </Text>
                  </Box>

                  <Divider />

                  {renderCardForm(false)}

                  <Divider />

                  <Button
                    leftIcon={<FiPlus />}
                    colorScheme="blue"
                    onClick={handleCreateNewCard}
                    isLoading={isLoading}
                    size="lg"
                  >
                    Create New Card
                  </Button>
                </VStack>
              </TabPanel>

              {/* Edit Existing Card Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Box
                    p={4}
                    borderRadius="md"
                    bg="orange.50"
                    borderWidth="1px"
                    borderColor="orange.200"
                  >
                    <Text fontSize="sm" color="orange.700">
                      Edit an existing card's data. Enter the card ID to load and modify the card details.
                    </Text>
                  </Box>

                  <Divider />

                  {/* Search Section */}
                  <FormControl>
                    <FormLabel>Search Card by ID</FormLabel>
                    <HStack>
                      <Input
                        placeholder="Enter card ID (e.g., OP01-001)"
                        value={searchCardId}
                        onChange={(e) => setSearchCardId(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSearchCard();
                          }
                        }}
                      />
                      <Button
                        leftIcon={isSearching ? <Spinner size="sm" /> : <FiEdit />}
                        colorScheme="orange"
                        onClick={handleSearchCard}
                        isLoading={isSearching}
                        isDisabled={!searchCardId.trim()}
                      >
                        Search
                      </Button>
                    </HStack>
                  </FormControl>

                  {/* Edit Form - Only shown after card is found */}
                  {cardFound && (
                    <>
                      <Divider />

                      <Box
                        p={3}
                        borderRadius="md"
                        bg="green.50"
                        borderWidth="1px"
                        borderColor="green.200"
                      >
                        <Text fontSize="sm" color="green.700" fontWeight="semibold">
                          Editing: {cardData.name} ({cardData.id})
                        </Text>
                      </Box>

                      {renderCardForm(true)}

                      <Divider />

                      <HStack justify="flex-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            resetForm();
                            setSearchCardId('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          leftIcon={<FiSave />}
                          colorScheme="orange"
                          onClick={handleUpdateCard}
                          isLoading={isLoading}
                        >
                          Update Card
                        </Button>
                      </HStack>
                    </>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" onClick={handleClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditCardDataModal;
