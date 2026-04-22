import { Box, Text, HStack, VStack, Image } from '@chakra-ui/react';

const Footer = () => {
  const handleDonationClick = () => {
    const paypalUrl = `https://www.paypal.com/ncp/payment/WGP5P2UEDDSBE`;
    window.open(paypalUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box
      as="footer"
      bg="gray.50"
      borderTop="1px"
      borderColor="gray.200"
      py={4}
      px={4}
      mt={8}
    >
      <HStack spacing={8} align="center" maxW="container.xl" mx="auto">
        {/* Left side - Copyright text */}
        <Box flex="1">
          <Text
            fontSize="xs"
            color="gray.500"
            lineHeight="1.4"
          >
            This is a fan website for the One Piece Trading Card Game and not affiliated with Toei Animation or Bandai. All card images and card text is copyright ©BANDAI ©Eiichiro Oda/Shueisha ©Eiichiro Oda/Shueisha, Toei Animation.
          </Text>
        </Box>

        {/* Right side - Buy Me Coffee */}
        <Box flexShrink={0}>
          <Box
            as="button"
            onClick={handleDonationClick}
            cursor="pointer"
            transition="all 0.2s"
            _hover={{
              transform: 'translateY(-1px)',
              shadow: 'md',
              opacity: 0.9
            }}
            _active={{
              transform: 'translateY(0)'
            }}
            borderRadius="md"
            overflow="hidden"
            border="2px solid transparent"
            _focusVisible={{
              borderColor: 'blue.500',
              outline: 'none'
            }}
          >
            <Image
              src="/coffee.png"
              alt="Buy me a coffee"
              width="auto"
              height="136px"
              maxWidth="425px"
              objectFit="contain"
              borderRadius="sm"
            />
          </Box>
        </Box>
      </HStack>
    </Box>
  );
};

export default Footer;
