// frontend/src/components/DiceAnimationModal.js
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, HStack, VStack, Button } from '@chakra-ui/react';

const DiceAnimationModal = ({ isOpen, onClose, onResult }) => {
  const dice1Ref = useRef(null);
  const dice2Ref = useRef(null);
  const [result1, setResult1] = useState(null);
  const [result2, setResult2] = useState(null);
  const [bothSettled, setBothSettled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBothSettled(false);
      setResult1(null);
      setResult2(null);

      // Roll dice 1
      if (dice1Ref.current && !dice1Ref.current.classList.contains('rolling')) {
        rollDice(dice1Ref.current, setResult1, false);
      }

      // Roll dice 2 with slight delay for visual effect
      setTimeout(() => {
        if (dice2Ref.current && !dice2Ref.current.classList.contains('rolling')) {
          rollDice(dice2Ref.current, setResult2, true);
        }
      }, 100);
    }
  }, [isOpen]);

  const rollDice = (diceElement, setResult, isSecondDice = false) => {
    const result = Math.floor(Math.random() * 6) + 1;
    setResult(result);

    // Simple, direct rotations for each face
    let finalTransform = '';

    switch(result) {
      case 1: // front face - 1 dot
        finalTransform = 'rotateY(1080deg) rotateX(1080deg)';
        break;
      case 2: // bottom face - 2 dots
        finalTransform = 'rotateY(1080deg) rotateX(1170deg)';
        break;
      case 3: // right face - 3 dots
        finalTransform = 'rotateY(990deg) rotateX(1080deg)';
        break;
      case 4: // left face - 4 dots
        finalTransform = 'rotateY(1170deg) rotateX(1080deg)';
        break;
      case 5: // top face - 5 dots
        finalTransform = 'rotateY(1080deg) rotateX(990deg)';
        break;
      case 6: // back face - 6 dots
        finalTransform = 'rotateY(900deg) rotateX(1080deg)';
        break;
    }

    diceElement.style.setProperty('--final-transform', finalTransform);

    // Use different animation for second dice
    if (isSecondDice) {
      diceElement.style.setProperty('--animation-name', 'roll2');
    } else {
      diceElement.style.setProperty('--animation-name', 'roll1');
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (diceElement) {
          diceElement.classList.add('rolling');
        }
      });
    });
  };

  const handleAnimationEnd = (diceRef) => {
    if (diceRef.current) {
      diceRef.current.classList.remove('rolling');
      diceRef.current.classList.add('settled');

      // Keep the final transform after animation ends
      const finalTransform = diceRef.current.style.getPropertyValue('--final-transform');
      diceRef.current.style.transform = finalTransform;

      // Check if both dice are settled
      if (dice1Ref.current?.classList.contains('settled') &&
          dice2Ref.current?.classList.contains('settled')) {
        setBothSettled(true);
        if (onResult && result1 && result2) {
          onResult({ player1: result1, player2: result2 });
        }
      }
    }
  };

  const handleClose = (e) => {
    if (e.target === e.currentTarget || e.target.closest('.close-area')) {
      onClose();
      // Reset the dice after closing
      if (dice1Ref.current) {
        dice1Ref.current.classList.remove('rolling', 'settled');
      }
      if (dice2Ref.current) {
        dice2Ref.current.classList.remove('rolling', 'settled');
      }
    }
  };

  const handleReroll = (e) => {
    // Prevent click from bubbling to the close handler
    e.stopPropagation();

    // Reset state
    setBothSettled(false);
    setResult1(null);
    setResult2(null);

    // Reset dice elements
    if (dice1Ref.current) {
      dice1Ref.current.classList.remove('rolling', 'settled');
      dice1Ref.current.style.transform = '';
    }
    if (dice2Ref.current) {
      dice2Ref.current.classList.remove('rolling', 'settled');
      dice2Ref.current.style.transform = '';
    }

    // Roll again with a slight delay
    setTimeout(() => {
      if (dice1Ref.current) {
        rollDice(dice1Ref.current, setResult1, false);
      }
      setTimeout(() => {
        if (dice2Ref.current) {
          rollDice(dice2Ref.current, setResult2, true);
        }
      }, 100);
    }, 50);
  };

  if (!isOpen) return null;

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      width="100vw"
      height="100vh"
      bg="rgba(0, 0, 0, 0.95)"
      zIndex="9999"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      onClick={handleClose}
      cursor="pointer"
      className="close-area"
    >
      <style>
        {`
          @keyframes roll1 {
            0% {
              transform: translate(0, 0) rotateY(0deg) rotateX(0deg) rotateZ(0deg);
            }
            20% {
              transform: translate(30vw, -15vh) rotateY(180deg) rotateX(90deg) rotateZ(45deg);
            }
            40% {
              transform: translate(-30vw, 10vh) rotateY(450deg) rotateX(270deg) rotateZ(90deg);
            }
            60% {
              transform: translate(20vw, -8vh) rotateY(630deg) rotateX(450deg) rotateZ(180deg);
            }
            80% {
              transform: translate(-10vw, 5vh) rotateY(900deg) rotateX(720deg) rotateZ(270deg);
            }
            95% {
              transform: translate(0, 0) var(--final-transform);
            }
            100% {
              transform: translate(0, 0) var(--final-transform);
            }
          }

          @keyframes roll2 {
            0% {
              transform: translate(0, 0) rotateY(0deg) rotateX(0deg) rotateZ(0deg);
            }
            20% {
              transform: translate(-25vw, 12vh) rotateY(270deg) rotateX(180deg) rotateZ(-45deg);
            }
            40% {
              transform: translate(35vw, -8vh) rotateY(540deg) rotateX(360deg) rotateZ(90deg);
            }
            60% {
              transform: translate(-15vw, 10vh) rotateY(720deg) rotateX(540deg) rotateZ(-90deg);
            }
            80% {
              transform: translate(10vw, -6vh) rotateY(990deg) rotateX(810deg) rotateZ(180deg);
            }
            95% {
              transform: translate(0, 0) var(--final-transform);
            }
            100% {
              transform: translate(0, 0) var(--final-transform);
            }
          }

          .dice-3d {
            position: relative;
            width: 100px;
            height: 100px;
            transform-style: preserve-3d;
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
            transition: transform 0.1s ease-out;
          }

          .dice-3d.rolling {
            animation: var(--animation-name, roll1) 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          }

          .dice-3d.settled {
            animation: none;
          }

          .dice-face {
            position: absolute;
            width: 100px;
            height: 100px;
            background: linear-gradient(to bottom right, #ffffff, #dddddd);
            border: 1px solid #333;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 50px;
            font-weight: bold;
            color: #333;
            backface-visibility: hidden;
            box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
          }

          .dice-dot {
            display: block;
            width: 15px;
            height: 15px;
            background-color: #333;
            border-radius: 50%;
            position: absolute;
          }

          .dice-face.front { transform: translateZ(50px); }
          .dice-face.back { transform: rotateY(180deg) translateZ(50px); }
          .dice-face.right { transform: rotateY(90deg) translateZ(50px); }
          .dice-face.left { transform: rotateY(-90deg) translateZ(50px); }
          .dice-face.top { transform: rotateX(90deg) translateZ(50px); }
          .dice-face.bottom { transform: rotateX(-90deg) translateZ(50px); }

          .dot-c { top: 50%; left: 50%; transform: translate(-50%, -50%); }
          .dot-tl { top: 13px; left: 13px; }
          .dot-tr { top: 13px; right: 13px; }
          .dot-bl { bottom: 13px; left: 13px; }
          .dot-br { bottom: 13px; right: 13px; }
          .dot-cl { top: 50%; left: 13px; transform: translateY(-50%); }
          .dot-cr { top: 50%; right: 13px; transform: translateY(-50%); }
        `}
      </style>

      <HStack spacing={20} alignItems="center">
        {/* Dice 1 - Player 1 */}
        <VStack spacing={4}>
          <Text color="white" fontSize="lg" fontWeight="semibold">
            Player 1
          </Text>
          <Box
            ref={dice1Ref}
            className="dice-3d"
            onAnimationEnd={() => handleAnimationEnd(dice1Ref)}
          >
            <Box className="dice-face front">
              <span className="dice-dot dot-c"></span>
            </Box>
            <Box className="dice-face back">
              <span className="dice-dot dot-tl"></span>
              <span className="dice-dot dot-tr"></span>
              <span className="dice-dot dot-cl"></span>
              <span className="dice-dot dot-cr"></span>
              <span className="dice-dot dot-bl"></span>
              <span className="dice-dot dot-br"></span>
            </Box>
            <Box className="dice-face right">
              <span className="dice-dot dot-tl"></span>
              <span className="dice-dot dot-c"></span>
              <span className="dice-dot dot-br"></span>
            </Box>
            <Box className="dice-face left">
              <span className="dice-dot dot-tl"></span>
              <span className="dice-dot dot-tr"></span>
              <span className="dice-dot dot-bl"></span>
              <span className="dice-dot dot-br"></span>
            </Box>
            <Box className="dice-face top">
              <span className="dice-dot dot-tl"></span>
              <span className="dice-dot dot-tr"></span>
              <span className="dice-dot dot-c"></span>
              <span className="dice-dot dot-bl"></span>
              <span className="dice-dot dot-br"></span>
            </Box>
            <Box className="dice-face bottom">
              <span className="dice-dot dot-tl"></span>
              <span className="dice-dot dot-br"></span>
            </Box>
          </Box>
          {bothSettled && result1 && (
            <Text color="white" fontSize="2xl" fontWeight="bold">
              {result1}
            </Text>
          )}
        </VStack>

        {/* Dice 2 - Player 2 */}
        <VStack spacing={4}>
          <Text color="white" fontSize="lg" fontWeight="semibold">
            Player 2
          </Text>
          <Box
            ref={dice2Ref}
            className="dice-3d"
            onAnimationEnd={() => handleAnimationEnd(dice2Ref)}
          >
            <Box className="dice-face front">
              <span className="dice-dot dot-c"></span>
            </Box>
            <Box className="dice-face back">
              <span className="dice-dot dot-tl"></span>
              <span className="dice-dot dot-tr"></span>
              <span className="dice-dot dot-cl"></span>
              <span className="dice-dot dot-cr"></span>
              <span className="dice-dot dot-bl"></span>
              <span className="dice-dot dot-br"></span>
            </Box>
            <Box className="dice-face right">
              <span className="dice-dot dot-tl"></span>
              <span className="dice-dot dot-c"></span>
              <span className="dice-dot dot-br"></span>
            </Box>
            <Box className="dice-face left">
              <span className="dice-dot dot-tl"></span>
              <span className="dice-dot dot-tr"></span>
              <span className="dice-dot dot-bl"></span>
              <span className="dice-dot dot-br"></span>
            </Box>
            <Box className="dice-face top">
              <span className="dice-dot dot-tl"></span>
              <span className="dice-dot dot-tr"></span>
              <span className="dice-dot dot-c"></span>
              <span className="dice-dot dot-bl"></span>
              <span className="dice-dot dot-br"></span>
            </Box>
            <Box className="dice-face bottom">
              <span className="dice-dot dot-tl"></span>
              <span className="dice-dot dot-br"></span>
            </Box>
          </Box>
          {bothSettled && result2 && (
            <Text color="white" fontSize="2xl" fontWeight="bold">
              {result2}
            </Text>
          )}
        </VStack>
      </HStack>

      <VStack mt={8} spacing={3}>
        {bothSettled && (
          <Button
            colorScheme="purple"
            size="md"
            onClick={handleReroll}
            leftIcon={<Text>🎲</Text>}
          >
            Reroll
          </Button>
        )}
        <Text fontSize="md" color="gray.400">
          {bothSettled ? "Reroll or click anywhere to close" : "Rolling..."}
        </Text>
      </VStack>
    </Box>
  );
};

export default DiceAnimationModal;
