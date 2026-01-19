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
        <Text bold>Il Don degli Stack di Sviluppo</Text>
        <Text dimColor> (The Don of Dev Stacks)</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>"In questa famiglia, non scriviamo configurazioni...</Text>
        <Text dimColor> facciamo offerte che non si possono rifiutare."</Text>
        <Text dimColor italic> (In this family, we don't write configs... we make offers they can't refuse.)</Text>
      </Box>

      <Box flexDirection="column" marginTop={2}>
        <Text color="yellow">Comandi Disponibili <Text dimColor>(Available Commands)</Text>:</Text>
        <Text>  🤝 <Text bold>capo recruit</Text> - Recluta la tua famiglia tech <Text dimColor>(Recruit your tech family)</Text></Text>
        <Text>  🎩 <Text bold>capo compose</Text> - Metti insieme la famiglia <Text dimColor>(Put the family together)</Text></Text>
        <Text>  👔 <Text bold>capo famiglia</Text> - Guarda chi è nella famiglia <Text dimColor>(See who's in the family)</Text></Text>
        <Text>  💥 <Text bold>capo whack</Text> - Elimina una tech dal tuo stack <Text dimColor>(Remove a tech)</Text></Text>
      </Box>

      <Box flexDirection="column" marginTop={2}>
        <Text color="red">Modalità Speciali <Text dimColor>(Special Modes)</Text>:</Text>
        <Text>  🔫 <Text bold>--gotommyguns</Text> - Zero domande, zero pietà <Text dimColor>(No questions, no mercy)</Text></Text>
        <Text>  🤫 <Text bold>--omerta</Text> - Operazioni silenziose <Text dimColor>(Silent operations)</Text></Text>
        <Text>  🪑 <Text bold>--sitdown</Text> - Negoziazione interattiva <Text dimColor>(Interactive negotiation)</Text></Text>
      </Box>

      <Box marginTop={2}>
        <Text dimColor italic>Lascia la pistola. Prendi le configs. Capisce?</Text>
        <Text dimColor italic> (Leave the gun. Take the configs. Understand?)</Text>
      </Box>
    </Box>
  );
};
