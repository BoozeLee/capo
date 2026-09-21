#!/usr/bin/env node

import { render } from "ink";
import meow from "meow";
import React from "react";
import { runComposeCommand } from "./commands/compose.js";
import { isFamilyCommand, runFamilyCommand } from "./commands/family/index.js";
import { runPlanCommand } from "./commands/plan.js";
import { App } from "./ui/App.js";

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

	The Family (Capo for Claude Code — state in .capo/)
	  ledger        Read or append the family ledger (.capo/ledger.jsonl)
	  board         Show the hit list board
	  hit           validate | next | start | done | deviation
	  books         bind <glob>... | appeal | override "<ruling>"
	  context       Render the per-node context for a hit node
	  rewind        Cut the board back to a ledger seq (--to)
	  replay        Compare a Claude Code session's tokens against ledger rendering

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
        type: "boolean",
        default: false,
        shortFlag: "g",
      },
      omerta: {
        type: "boolean",
        default: false,
        shortFlag: "o",
      },
      sitdown: {
        type: "boolean",
        default: false,
        shortFlag: "s",
      },
      crew: {
        type: "string",
        shortFlag: "c",
      },
      name: {
        type: "string",
        shortFlag: "n",
      },
      json: {
        type: "boolean",
        default: false,
      },
      dryRun: {
        type: "boolean",
        default: false,
      },
      fromPlan: {
        type: "string",
      },
      kind: { type: "string" },
      payload: { type: "string" },
      note: { type: "string" },
      budget: { type: "number" },
      actor: { type: "string" },
      to: { type: "number" },
    },
  },
);

const command = cli.input[0] || "welcome";

if (isFamilyCommand(command)) {
  process.exit(
    await runFamilyCommand(cli.input, cli.flags, {
      cwd: process.cwd(),
      stdout: (line) => console.log(line),
      stderr: (line) => console.error(line),
    }),
  );
}

if (command === "plan") {
  process.exit(
    runPlanCommand({ crew: cli.flags.crew, name: cli.flags.name, json: cli.flags.json }),
  );
}

if (command === "compose") {
  const exitCode = await runComposeCommand({
    crew: cli.flags.crew,
    name: cli.flags.name,
    fromPlan: cli.flags.fromPlan,
    gotommyguns: cli.flags.gotommyguns,
    omerta: cli.flags.omerta,
    json: cli.flags.json,
    dryRun: cli.flags.dryRun,
  });
  process.exit(exitCode);
}

// Render the TUI
render(
  React.createElement(App, {
    command,
    args: cli.input.slice(1),
    flags: cli.flags,
  }),
);
