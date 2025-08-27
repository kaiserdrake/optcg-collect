'use client';
import { Container, Heading, Text } from '@chakra-ui/react';
import Navbar from '@/components/Navbar';

export default function DeckBuilderPage() {
    return (
        <>
            <Navbar />
            <Container py={8}>
                <Heading>Deck Builder</Heading>
                <Text mt={4}>This feature is coming soon!</Text>
            </Container>
        </>
    );
}
