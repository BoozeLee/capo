#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import { App } from './ui/App.js';

const cli = meow(
  `
	🎩 CAPO - The Don of Dev Stacks

	Usage
	  $ capo <command> [options]

	Commands
	  recruit       Select your tech family members
	  compose       Put the family together
	  famiglia      See who's in the family
	  status        Check a tech's status
	  whack         Remove a tech from your stack

	Options
	  --gotommyguns    Zero prompts, zero mercy mode
	  --omerta         Silent operations mode
	  --sitdown        Interactive negotiation mode
	  --help           Show this message
	  --version        Show version number

	Examples
	  $ capo recruit --crew nextjs,shadcn,drizzle
	  $ capo compose nextjs shadcn drizzle --gotommyguns
	  $ capo famiglia
	  $ capo whack tailwind

	"Leave the gun. Take the configs."
`,
  {
    importMeta: import.meta,
    flags: {
      gotommyguns: {
        type: 'boolean',
        default: false,
        shortFlag: 'g',
      },
      omerta: {
        type: 'boolean',
        default: false,
        shortFlag: 'o',
      },
      sitdown: {
        type: 'boolean',
        default: false,
        shortFlag: 's',
      },
      crew: {
        type: 'string',
        shortFlag: 'c',
      },
    },
  }
);

// Render the TUI
render(
  React.createElement(App, {
    command: cli.input[0] || 'welcome',
    args: cli.input.slice(1),
    flags: cli.flags,
  })
);
