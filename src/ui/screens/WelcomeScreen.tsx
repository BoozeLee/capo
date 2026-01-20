import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';

interface WelcomeScreenProps {
  onExit: (error?: Error) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onExit }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onExit();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onExit]);

  return (
    <Box flexDirection="column" padding={2}>
      <Gradient name="vice">
        <BigText text="CAPO" font="chrome" />
      </Gradient>

      <Box marginTop={1} marginBottom={1} borderStyle="round" borderColor="gray" padding={1}>
        <Text bold>The Don of Dev Stacks</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>"In questa famiglia, we don't write configs...</Text>
        <Text dimColor> we make offers they can't refuse."</Text>
      </Box>

      <Box flexDirection="column" marginTop={2}>
        <Text color="yellow">Available Commands:</Text>
        <Text>  🤝 <Text bold>capo recruit</Text> - Recruit your tech famiglia</Text>
        <Text>  🎩 <Text bold>capo compose</Text> - Put the famiglia together</Text>
        <Text>  👔 <Text bold>capo famiglia</Text> - See who's in the family</Text>
        <Text>  💥 <Text bold>capo whack</Text> - Remove a tech from your stack</Text>
      </Box>

      <Box flexDirection="column" marginTop={2}>
        <Text color="red">Special Modes:</Text>
        <Text>  🔫 <Text bold>--gotommyguns</Text> - No questions, no mercy. Zero stronzate.</Text>
        <Text>  🤫 <Text bold>--omerta</Text> - Silent operations. Zitto e mosca.</Text>
        <Text>  🪑 <Text bold>--sitdown</Text> - Interactive negotiation. Let's talk business.</Text>
      </Box>

      <Box marginTop={2}>
        <Text dimColor italic>Leave the gun. Take the configs. Capisce?</Text>
      </Box>
    </Box>
  );
};
