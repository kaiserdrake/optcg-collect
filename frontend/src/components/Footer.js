import { Box, Text } from '@chakra-ui/react';

const Footer = () => {
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
      <Text
        fontSize="xs"
        color="gray.500"
        textAlign="center"
        maxW="50%"
        mx="auto"
        lineHeight="1.4"
      >
        This is a fan website for the One Piece Trading Card Game and not affiliated with Toei Animation or Bandai. All card images and card text is copyright ©BANDAI ©Eiichiro Oda/Shueisha ©Eiichiro Oda/Shueisha, Toei Animation.
      </Text>
    </Box>
  );
};

export default Footer;
