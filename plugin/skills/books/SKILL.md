---
name: books
description: Make the books — commit the completed work and record any durable ruling so the decision binds future sessions.
disable-model-invocation: true
allowed-tools: Read Bash(git *) Bash(cat .capo/*) Edit
---

## State
- Diff stat: !`git diff HEAD --stat`
- Full diff: !`git diff HEAD`
- Books: !`cat .capo/books.md 2>/dev/null || echo "(no Books yet)"`

1. Commit in the smallest coherent units. One concern per commit. Subject line imperative,
   under 60 chars, no tool attribution unless the Capo asks for it.

2. Then judge: did this work produce a decision that should bind future work? Most work does not.
   A ruling is warranted only when a future session would otherwise re-litigate or re-break it.

3. If yes, append to `.capo/books.md`:

```
## <short imperative rule>
- binds: <globs or symbols>
- because: <the situation that forced it>
- evidence: <sha / test name / file:line>
- overturn-if: <what would prove this wrong>
- date: <YYYY-MM-DD>
```

4. If this ruling contradicts an existing one, mark the old one `OVERTURNED BY <rule>` and keep
   it. History is evidence; deleting it is how the Books start lying.

5. Report: commits made, ruling written or explicitly declined and why.
