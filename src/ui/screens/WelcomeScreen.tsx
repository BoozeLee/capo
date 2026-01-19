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
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>"In questa famiglia, non scriviamo configurazioni...</Text>
        <Text dimColor> facciamo offerte che non si possono rifiutare."</Text>
      </Box>

      <Box flexDirection="column" marginTop={2}>
        <Text color="yellow">Comandi Disponibili:</Text>
        <Text>  🤝 <Text bold>capo recruit</Text> - Recluta la tua famiglia tech</Text>
        <Text>  🎩 <Text bold>capo compose</Text> - Metti insieme la famiglia</Text>
        <Text>  👔 <Text bold>capo famiglia</Text> - Guarda chi è nella famiglia</Text>
        <Text>  💥 <Text bold>capo whack</Text> - Elimina una tech dal tuo stack</Text>
      </Box>

      <Box flexDirection="column" marginTop={2}>
        <Text color="red">Modalità Speciali:</Text>
        <Text>  🔫 <Text bold>--gotommyguns</Text> - Zero domande, zero pietà</Text>
        <Text>  🤫 <Text bold>--omerta</Text> - Operazioni silenziose</Text>
        <Text>  🪑 <Text bold>--sitdown</Text> - Negoziazione interattiva</Text>
      </Box>

      <Box marginTop={2}>
        <Text dimColor italic>Lascia la pistola. Prendi le configs. Capisce?</Text>
      </Box>
    </Box>
  );
};
