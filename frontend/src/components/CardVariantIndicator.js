'use client';

import { HStack, Icon, Text, Tooltip } from '@chakra-ui/react'
import { PiParallelogram } from 'react-icons/pi';
import { LuBookCopy } from 'react-icons/lu';

const CardVariantIndicator = ({ cardId }) => {
    // Regex to find a suffix like _p1 or _r2 at the end of the ID
    const match = cardId.match(/_([pr])(\d+)$/);

    if (!match) {
        return null; // This is not a variant card, render nothing
    }

    const type = match[1];   // 'p' or 'r'
    const number = match[2]; // '1', '2', etc.

    const isParallel = type === 'p';
    const label = isParallel ? `Alternate Art #${number}` : `Reprint #${number}`;
    const icon = isParallel ? PiParallelogram : LuBookCopy;
    const color = 'gray.300';

    return (
        <Tooltip label={label} fontSize="sm" hasArrow placement="top">
            <HStack spacing={1} align="center">
                <Icon as={icon} color={color} boxSize={4} />
            </HStack>
        </Tooltip>
    );
};

export default CardVariantIndicator;
