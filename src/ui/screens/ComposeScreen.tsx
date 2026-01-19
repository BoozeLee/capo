import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface ComposeScreenProps {
  args: string[];
  flags: {
    gotommyguns?: boolean;
    omerta?: boolean;
    sitdown?: boolean;
  };
  onExit: (error?: Error) => void;
}

export const ComposeScreen: React.FC<ComposeScreenProps> = ({ args, flags, onExit }) => {
  const [phase, setPhase] = useState<'initializing' | 'parsing' | 'resolving' | 'composing' | 'done'>('initializing');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const phases = ['initializing', 'parsing', 'resolving', 'composing', 'done'] as const;
    let currentPhaseIndex = 0;

    const interval = setInterval(() => {
      currentPhaseIndex++;

      if (currentPhaseIndex < phases.length) {
        setPhase(phases[currentPhaseIndex]);
        setProgress((currentPhaseIndex / phases.length) * 100);
      } else {
        clearInterval(interval);
        setTimeout(() => onExit(), 2000);
      }
    }, flags.gotommyguns ? 500 : 1500);

    return () => clearInterval(interval);
  }, [flags.gotommyguns, onExit]);

  const getPhaseMessage = () => {
    if (flags.gotommyguns) {
      switch (phase) {
        case 'initializing':
          return '🔫 CARICANDO LA PISTOLA...';
        case 'parsing':
          return '🔫 IDENTIFICANDO I BERSAGLI...';
        case 'resolving':
          return '💥 SISTEMANDO I CONFLITTI... STRONZATE FINITE!';
        case 'composing':
          return '💥 PULENDO... NIENTE CAZZATE!';
        case 'done':
          return '✅ AFFARI SISTEMATI. NESSUN FILO PENDENTE. MADONNA!';
      }
    }

    if (flags.omerta) {
      return '🤫 ...';
    }

    switch (phase) {
      case 'initializing':
        return '🎩 Riunendo la famiglia...';
      case 'parsing':
        return '📋 Leggendo il manifesto...';
      case 'resolving':
        return '⚖️  Risolvendo le dispute...';
      case 'composing':
        return '🤝 Facendo l\'accordo...';
      case 'done':
        return '✅ La famiglia è completa. Ora vai e rendici orgogliosi. Bravo!';
    }
  };

  const getProgressBar = () => {
    if (flags.omerta) return null;

    const filled = Math.floor(progress / 5);
    const empty = 20 - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${Math.floor(progress)}%`;
  };

  if (args.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">❌ Nessun crew specificato, stronzo.</Text>
        <Text dimColor>Uso: capo compose &lt;tech1&gt; &lt;tech2&gt; ...</Text>
        <Text dimColor>Esempio: capo compose nextjs-15 shadcn drizzle</Text>
        <Text dimColor italic>Capisce?</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {!flags.omerta && (
        <Box marginBottom={1}>
          <Text bold color={flags.gotommyguns ? 'red' : 'yellow'}>
            {flags.gotommyguns ? '🔫 MODALITÀ GOTOMMYGUNS' : '🎩 COMPOSIZIONE FAMIGLIA'}
          </Text>
        </Box>
      )}

      {!flags.omerta && (
        <Box marginBottom={1}>
          <Text dimColor>Crew: {args.join(', ')}</Text>
        </Box>
      )}

      <Box marginBottom={1}>
        {phase !== 'done' && !flags.omerta && (
          <Text color="yellow">
            <Spinner type={flags.gotommyguns ? 'dots12' : 'dots'} />
          </Text>
        )}
        <Text color={phase === 'done' ? 'green' : 'white'}> {getPhaseMessage()}</Text>
      </Box>

      {!flags.omerta && getProgressBar() && (
        <Box>
          <Text color="cyan">{getProgressBar()}</Text>
        </Box>
      )}

      {phase === 'done' && !flags.omerta && (
        <Box marginTop={1}>
          <Text dimColor italic>"Lascia la pistola. Prendi le configs. Capisce?"</Text>
        </Box>
      )}

      {flags.gotommyguns && phase === 'resolving' && (
        <Box marginTop={1} flexDirection="column">
          <Text color="red">💥 nextjs-14... eliminato. Stronzate finite.</Text>
          <Text color="red">💥 Conflitti... risolti. Niente cazzate.</Text>
        </Box>
      )}
    </Box>
  );
};
