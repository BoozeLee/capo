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
          👔 LA FAMIGLIA - Family Structure
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>"A man who doesn't spend time with his famiglia</Text>
        <Text dimColor> can never be a real man."</Text>
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
          ⚔️  SOLDATI - Soldiers ({family.soldiers.length})
        </Text>
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
          🤝 ASSOCIATI - Associates ({family.associates.length})
        </Text>
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
        <Text dimColor italic>La famiglia is strong. Respect the structure. Capisce?</Text>
      </Box>
    </Box>
  );
};
