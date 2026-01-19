import React from 'react';
import { Box, Text } from 'ink';

interface FamigliaScreenProps {
  onExit: (error?: Error) => void;
}

export const FamigliaScreen: React.FC<FamigliaScreenProps> = ({ onExit }) => {
  // Mock data - will be replaced with real data from config
  const family = {
    don: 'Your Project',
    capo: 'CAPO',
    soldiers: [
      { name: 'Next.js 15', role: 'Framework Boss', status: 'active' },
      { name: 'shadcn/ui', role: 'UI Consigliere', status: 'active' },
      { name: 'Drizzle ORM', role: 'Database Enforcer', status: 'active' },
    ],
    associates: [
      { name: 'Tailwind CSS', role: 'Style Associate', status: 'active' },
    ],
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onExit();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onExit]);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="yellow">
          👔 LA FAMIGLIA - Struttura della Famiglia
        </Text>
        <Text dimColor>   (THE FAMILY - Family Structure)</Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>"Un uomo che non passa tempo con la sua famiglia non può mai essere un vero uomo."</Text>
        <Text dimColor italic>(A man who doesn't spend time with his family can never be a real man.)</Text>
      </Box>

      <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="yellow" padding={1}>
        <Text bold>
          👑 DON: <Text color="cyan">{family.don}</Text>
        </Text>
        <Box marginLeft={2} marginTop={1}>
          <Text>
            └─ 🎩 CAPO: <Text color="yellow">{family.capo}</Text>
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text bold color="green">
          ⚔️  SOLDATI ({family.soldiers.length})
        </Text>
        <Text dimColor>   (SOLDIERS)</Text>
        {family.soldiers.map((soldier, i) => (
          <Box key={i} marginLeft={2}>
            <Text>
              • <Text bold>{soldier.name}</Text> - <Text dimColor>{soldier.role}</Text>{' '}
              <Text color="green">●</Text>
            </Text>
          </Box>
        ))}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text bold color="cyan">
          🤝 ASSOCIATI ({family.associates.length})
        </Text>
        <Text dimColor>   (ASSOCIATES)</Text>
        {family.associates.map((associate, i) => (
          <Box key={i} marginLeft={2}>
            <Text>
              • <Text bold>{associate.name}</Text> - <Text dimColor>{associate.role}</Text>{' '}
              <Text color="green">●</Text>
            </Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={2}>
        <Text dimColor italic>La famiglia è forte. Rispetta la struttura. Capisce?</Text>
        <Text dimColor italic>(The family is strong. Respect the structure. Understand?)</Text>
      </Box>
    </Box>
  );
};
