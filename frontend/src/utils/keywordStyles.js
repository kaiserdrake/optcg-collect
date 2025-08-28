// Centralized keywordStyles and keywordPatterns for reuse

export const keywordStyles = {
  'trigger': { bg: 'yellow.400', color: 'black', variant: 'solid', px: '3', borderRadius: 0, sx: { clipPath: 'polygon(0% 0%, 100% 0%, 92% 100%, 0% 100%)' } },
  'on play': { colorScheme: 'blue', variant: 'solid' },
  'activate: main': { colorScheme: 'blue', variant: 'solid' },
  'your turn': { colorScheme: 'blue', variant: 'solid' },
  'end of your turn': { colorScheme: 'blue', variant: 'solid' },
  'main': { colorScheme: 'blue', variant: 'solid' },
  'when attacking': { colorScheme: 'blue', variant: 'solid' },
  'when blocking': { colorScheme: 'blue', variant: 'solid' },
  'on k.o.': { colorScheme: 'blue', variant: 'solid' },
  "opponent's turn": { colorScheme: 'blue', variant: 'solid' },
  "end of your opponent's turn": { colorScheme: 'blue', variant: 'solid' },
  'counter': { colorScheme: 'red', variant: 'solid' },
  'once per turn': { colorScheme: 'pink', variant: 'solid', borderRadius: 'full' },
  'blocker': { colorScheme: 'orange', variant: 'solid', px: '3', sx: { clipPath: 'polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)' } },
  'rush': { colorScheme: 'orange', variant: 'solid', px: '3', sx: { clipPath: 'polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)' } },
  'double attack': { colorScheme: 'orange', variant: 'solid', px: '3', sx: { clipPath: 'polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)' } },
  'banish': { colorScheme: 'orange', variant: 'solid', px: '3', sx: { clipPath: 'polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)' } },
};

export const keywordPatterns = [
  { regex: /DON!! [x-]\d+/i, style: { bg: 'black', color: 'white', variant: 'solid' } }
];
