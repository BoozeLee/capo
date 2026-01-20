import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';

interface RecruitScreenProps {
  args: string[];
  flags: {
    gotommyguns?: boolean;
    omerta?: boolean;
    sitdown?: boolean;
    crew?: string;
  };
  onExit: (error?: Error) => void;
}

interface TechOption {
  label: string;
  value: string;
  category: string;
  description: string;
}

const availableTech: TechOption[] = [
  {
    label: '🏗️  Next.js 15',
    value: 'nextjs-15',
    category: 'Framework',
    description: 'The Godfather - App Router, React 19, Server Components',
  },
  {
    label: '🎨 shadcn/ui',
    value: 'shadcn',
    category: 'UI',
    description: 'The Tailor - Beautiful components with Radix UI',
  },
  {
    label: '🎨 Tailwind CSS',
    value: 'tailwindcss',
    category: 'UI',
    description: 'The Designer - Utility-first styling',
  },
  {
    label: '💾 Drizzle ORM',
    value: 'drizzle',
    category: 'Database',
    description: 'The Accountant - Type-safe database operations',
  },
  {
    label: '⚙️  Vercel AI SDK',
    value: 'vercel-ai-sdk',
    category: 'Tooling',
    description: 'The Consultant - AI applications with function calling',
  },
  {
    label: '🔌 Memory MCP Server',
    value: 'memory-mcp-server',
    category: 'MCP',
    description: 'The Archivist - Memory persistence and vector search',
  },
];

export const RecruitScreen: React.FC<RecruitScreenProps> = ({ args, flags, onExit }) => {
  const [selectedTech, setSelectedTech] = useState<string[]>([]);
  const [isRecruiting, setIsRecruiting] = useState(false);
  const [phase, setPhase] = useState<'selecting' | 'confirming' | 'done'>('selecting');

  const handleSelect = (item: { value: string }) => {
    setIsRecruiting(true);

    setTimeout(() => {
      setSelectedTech([...selectedTech, item.value]);
      setIsRecruiting(false);
      setPhase('done');

      setTimeout(() => {
        onExit();
      }, 2000);
    }, 1500);
  };

  if (phase === 'done') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="green">
          ✅ {selectedTech[selectedTech.length - 1]} accepted. Benvenuto nella famiglia.
        </Text>
        <Text dimColor>The famiglia grows stronger... Bravo!</Text>
      </Box>
    );
  }

  if (isRecruiting) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Making an offer they can't refuse...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="yellow">
          🤝 RECRUITMENT - Select a soldato for your crew
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>
          "A friend should always underestimate your virtues
        </Text>
        <Text dimColor>
           and an enemy overestimate your faults."
        </Text>
      </Box>

      <SelectInput items={availableTech} onSelect={handleSelect} />

      <Box marginTop={1}>
        <Text dimColor>Use ↑↓ arrows to select, Enter to recruit. Capisce?</Text>
      </Box>
    </Box>
  );
};
