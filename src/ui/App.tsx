import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { WelcomeScreen } from './screens/WelcomeScreen.js';
import { RecruitScreen } from './screens/RecruitScreen.js';
import { ComposeScreen } from './screens/ComposeScreen.js';
import { FamigliaScreen } from './screens/FamigliaScreen.js';

interface AppProps {
  command: string;
  args: string[];
  flags: {
    gotommyguns?: boolean;
    omerta?: boolean;
    sitdown?: boolean;
    crew?: string;
  };
}

export const App: React.FC<AppProps> = ({ command, args, flags }) => {
  const { exit } = useApp();
  const [currentScreen, setCurrentScreen] = useState(command);

  useEffect(() => {
    setCurrentScreen(command);
  }, [command]);

  // Handle different commands
  switch (currentScreen) {
    case 'welcome':
      return <WelcomeScreen onExit={exit} />;

    case 'recruit':
      return <RecruitScreen args={args} flags={flags} onExit={exit} />;

    case 'compose':
      return <ComposeScreen args={args} flags={flags} onExit={exit} />;

    case 'famiglia':
      return <FamigliaScreen onExit={exit} />;

    case 'status':
      return (
        <Box flexDirection="column" padding={1}>
          <Text color="yellow">🔍 Checking status of {args[0] || 'unknown'}...</Text>
          <Text dimColor>Feature coming soon...</Text>
        </Box>
      );

    case 'whack':
      return (
        <Box flexDirection="column" padding={1}>
          <Text color="red">💥 Taking care of {args[0] || 'business'}...</Text>
          <Text dimColor>Feature coming soon...</Text>
        </Box>
      );

    default:
      return (
        <Box flexDirection="column" padding={1}>
          <Text color="red">❌ Unknown command: {currentScreen}</Text>
          <Text dimColor>Run 'capo --help' for available commands.</Text>
        </Box>
      );
  }
};
