'use client';

import { HStack, Icon, Text, Tooltip } from '@chakra-ui/react'
import { PiParallelogram } from 'react-icons/pi';

const CardVariantIndicator = ({ cardId }) => {
    // Regex to find a suffix like _p1 or _p2 at the end of the ID
    // No longer checking for _r patterns since reprints are consolidated
    const match = cardId.match(/_p(\d+)$/);

    if (!match) {
        return null; // This is not a parallel card, render nothing
    }

    const number = match[1]; // '1', '2', etc.
    const label = `Alternate Art #${number}`;
    const color = 'gray.400';

    return (
        <Tooltip label={label} fontSize="sm" hasArrow placement="top">
            <HStack spacing={1} align="center">
                <Icon as={PiParallelogram} color={color} boxSize={4} />
            </HStack>
        </Tooltip>
    );
};

export default CardVariantIndicator;
