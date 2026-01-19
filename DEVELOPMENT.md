# CAPO Development Guide

## 🎩 Project Overview

**CAPO** (The Don of Dev Stacks) is a mafia-themed TUI for composing development stack configurations. Inspired by your girlfriend and the narrative around "cursed without voice," Ma Baker, and Arctic Monkeys' "Do I Wanna Know" - the name CAPODE perfectly captures the essence: a silent operator (like a guitar capo) who changes everything without speaking.

## 🏗️ Current Architecture

```
capo/
├── src/
│   ├── cli.ts                    # Entry point with meow CLI parser
│   ├── ui/
│   │   ├── App.tsx               # Main app router
│   │   └── screens/
│   │       ├── WelcomeScreen.tsx # ASCII art welcome
│   │       ├── RecruitScreen.tsx # Tech selection
│   │       ├── ComposeScreen.tsx # Stack composition
│   │       └── FamigliaScreen.tsx # Family status view
│   ├── core/                     # (To be implemented)
│   │   ├── registry/             # Tech family registry
│   │   ├── composer/             # Config composition logic
│   │   └── validator/            # Conflict resolution
│   ├── modes/                    # (To be implemented)
│   │   ├── gotommyguns.ts        # Aggressive auto-resolve mode
│   │   ├── omerta.ts             # Silent mode
│   │   └── sitdown.ts            # Interactive negotiation
│   └── components/               # Shared UI components
└── package.json
```

## 🎯 Implemented Features

### ✅ Working
1. **Welcome Screen** - ASCII art with CAPO branding
2. **Recruit Command** - Interactive tech selection with arrow keys
3. **Compose Command** - Multi-phase composition with spinner and progress bar
4. **Famiglia Command** - Family structure visualization
5. **Multiple Modes** - Flags for `--gotommyguns`, `--omerta`, `--sitdown`
6. **Mafia Narrative** - All messages follow the family theme

### 🚧 In Progress
- Actual config composition logic (currently simulated)
- File system operations for generating configs
- Integration with claude-config-composer registry

### 📋 To Be Implemented
1. **GoTommyGuns Mode** (`--gotommyguns`)
   - Zero prompts, auto-resolve all conflicts
   - Force composition even with warnings
   - Backup first, ask questions never
   - Visual: ``` 💥 nextjs-14... whacked. ✅ Stack composed. No loose ends. ```

2. **Omerta Mode** (`--omerta`)
   - Minimal output, maximum stealth
   - Log everything but show nothing
   - Only display success/failure

3. **Sitdown Mode** (`--sitdown`)
   - Interactive conflict resolution
   - Visual family tree
   - Diplomatic negotiations between competing techs

4. **Core Functionality**
   - Port config registry from claude-config-composer
   - Implement actual file generation
   - Add conflict detection and resolution
   - Create backup system

5. **Additional Commands**
   - `capo status <tech>` - Check individual tech status
   - `capo whack <tech>` - Remove tech from stack
   - `capo famiglia --tree` - Visual dependency graph
   - `capo made` - Quick start with common stacks

## 🎨 Mafia Terminology Mapping

| Standard Term | Mafia Term | Usage |
|--------------|------------|-------|
| Configuration | The Family | Your tech stack |
| Select Tech | Recruit | Adding to the crew |
| Compose | Make the Deal | Putting it all together |
| Conflict | Beef/Problem | Tech incompatibility |
| Resolve | Settle/Handle | Fix conflicts |
| Install | Bring In | Add dependencies |
| Remove | Whack | Delete from stack |
| Backup | Protection | Save before changes |
| Force | GoTommyGuns | Aggressive mode |
| Silent | Omerta | Quiet operations |
| Interactive | Sitdown | Negotiation mode |

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Test specific commands
npm run dev recruit
npm run dev compose nextjs-15 shadcn
npm run dev compose nextjs-15 shadcn --gotommyguns
npm run dev famiglia

# Build for production
npm run build

# Run built CLI
npm start

# Lint and format
npm run lint
npm run format
```

## 🚀 Next Steps

### Phase 1: Core Integration (Current)
- [ ] Import config registry from claude-config-composer
- [ ] Implement file system operations
- [ ] Add real config merging logic
- [ ] Create backup/restore system

### Phase 2: Special Modes
- [ ] Implement `--gotommyguns` auto-resolve logic
- [ ] Add `--omerta` silent mode
- [ ] Build `--sitdown` interactive conflict resolution
- [ ] Add visual family tree view

### Phase 3: Enhanced Features
- [ ] GPT-powered Consigliere mode (AI stack advisor)
- [ ] Multi-project territory management
- [ ] Config sharing between families
- [ ] Versioning and rollback (Witness Protection)

### Phase 4: Polish
- [ ] Comprehensive testing
- [ ] Error handling and recovery
- [ ] Performance optimization
- [ ] Documentation and examples

## 💡 Design Philosophy

1. **Silent Power** - Like a capo, the tool transforms without speaking (minimal prompts)
2. **Respect the Family** - Clear hierarchy and structure
3. **Handle Business** - Conflicts get resolved, period
4. **No Loose Ends** - Always backup, always verify
5. **Style Matters** - Every interaction tells a story

## 🎬 Special Mode Behaviors

### GoTommyGuns Mode
```bash
capo compose nextjs-15 shadcn drizzle --gotommyguns

🔫 TAKING CARE OF BUSINESS...
   ███████████████████░░░ 75%

💥 nextjs-14... whacked.
💥 tailwind-2.x... whacked.
💥 Conflicts... resolved.
✅ Stack composed. No loose ends.
```

### Omerta Mode
```bash
capo compose nextjs-15 shadcn drizzle --omerta

🤫 ...
[operation happens in complete silence]
✅ Done.
```

### Sitdown Mode
```bash
capo compose nextjs-15 shadcn drizzle --sitdown

🪑 WE GOT A SITUATION...
   nextjs-15 and nextjs-14 both want in.

   What's the play?
   [1] Keep nextjs-15 (Recommended)
   [2] Keep nextjs-14
   [3] Get rid of both (Nuclear option)
```

## 📝 Code Style

- Use mafia terminology consistently
- All user-facing messages tell a story
- Errors are "problems" that need "handling"
- Success messages reference the family
- Keep the Don (user) informed with respect

## 🤝 Contributing

This is a private family operation. Changes require approval from the Don.

## ⚖️ License

MIT - Because even crime families respect intellectual property.

---

*"A programmer who doesn't spend time with his configs can never be a real programmer."*

🎩 **Forget about it.**
