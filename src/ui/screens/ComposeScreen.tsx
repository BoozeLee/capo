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
          return '🔫 CARICANDO LA PISTOLA... (LOADING THE CLIP...)';
        case 'parsing':
          return '🔫 IDENTIFICANDO I BERSAGLI... (IDENTIFYING TARGETS...)';
        case 'resolving':
          return '💥 SISTEMANDO I CONFLITTI... STRONZATE FINITE! (HANDLING CONFLICTS... BULLSHIT OVER!)';
        case 'composing':
          return '💥 PULENDO... NIENTE CAZZATE! (CLEANING UP... NO SHIT!)';
        case 'done':
          return '✅ AFFARI SISTEMATI. NESSUN FILO PENDENTE. MADONNA! (BUSINESS HANDLED. NO LOOSE ENDS.)';
      }
    }

    if (flags.omerta) {
      return '🤫 ... (silent)';
    }

    switch (phase) {
      case 'initializing':
        return '🎩 Riunendo la famiglia... (Gathering the family...)';
      case 'parsing':
        return '📋 Leggendo il manifesto... (Reading the manifesto...)';
      case 'resolving':
        return '⚖️  Risolvendo le dispute... (Settling disputes...)';
      case 'composing':
        return '🤝 Facendo l\'accordo... (Making the deal...)';
      case 'done':
        return '✅ La famiglia è completa. Ora vai e rendici orgogliosi. Bravo!\n   (The family is complete. Now go make us proud. Well done!)';
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
        <Text dimColor>   (No crew specified, asshole.)</Text>
        <Text dimColor>Uso: capo compose &lt;tech1&gt; &lt;tech2&gt; ...</Text>
        <Text dimColor>(Usage: capo compose &lt;tech1&gt; &lt;tech2&gt; ...)</Text>
        <Text dimColor>Esempio: capo compose nextjs-15 shadcn drizzle</Text>
        <Text dimColor italic>Capisce? (Understand?)</Text>
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
          <Text dimColor>
            {flags.gotommyguns ? '   (GOTOMMYGUNS MODE)' : '   (COMPOSING FAMILY)'}
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
        <Box marginTop={1} flexDirection="column">
          <Text dimColor italic>"Lascia la pistola. Prendi le configs. Capisce?"</Text>
          <Text dimColor italic> (Leave the gun. Take the configs. Understand?)</Text>
        </Box>
      )}

      {flags.gotommyguns && phase === 'resolving' && (
        <Box marginTop={1} flexDirection="column">
          <Text color="red">💥 nextjs-14... eliminato. Stronzate finite.</Text>
          <Text dimColor>   (nextjs-14... whacked. Bullshit over.)</Text>
          <Text color="red">💥 Conflitti... risolti. Niente cazzate.</Text>
          <Text dimColor>   (Conflicts... resolved. No shit.)</Text>
        </Box>
      )}
    </Box>
  );
};
