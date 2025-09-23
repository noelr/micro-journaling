# Micro-Journaling

Capture thoughts as they happen, review them when it matters. Micro-journaling is a command-line tool designed for the way your mind actually works - spontaneous, scattered, and always on. Whether it's a sudden insight, something you just learned, a task you need to do, or a fleeting memory you don't want to lose, `mj` captures it instantly without breaking your flow. Later, when you have a moment to breathe, run `mjr` to review only what hasn't been processed yet - mark todos as done, tag learnings as TIL, or simply acknowledge and move on. It's the perfect balance between capturing everything and staying organized without the overhead.

## Installation

Create symlinks to the scripts in a folder that's in your PATH, such as `~/.local/bin`:

```bash
ln -s $(pwd)/mj.js ~/.local/bin/mj
ln -s $(pwd)/mjr.js ~/.local/bin/mjr
```

Make sure the scripts are executable:
```bash
chmod +x mj.js mjr.js
```

## Usage Examples

### Quick capture with `mj`

```bash
# Log a random thought
mj Coffee tastes better on cold mornings

# Capture something you just learned
mj git reflog saves deleted branches for 30 days

# Quick todo for today
mj Reply to Sarahs email about the project

# Remember a book recommendation
mj Book rec from John: Atomic Habits

# Log a debugging insight
mj setState was being called after unmount - that was the bug!

# Capture a meeting note
mj Team decided to postpone feature X until Q2

# Remember to buy something
mj Buy new coffee beans
```

### Review and process with `mjr`

First, run `mjr` without arguments to see all unreviewed entries:

```bash
mjr
1. [9/23/2025, 7:47:10 PM] Coffee tastes better on cold mornings
2. [9/23/2025, 7:47:13 PM] git reflog saves deleted branches for 30 days
3. [9/23/2025, 7:47:27 PM] Reply to Sarahs email about the project
4. [9/23/2025, 7:47:31 PM] Book rec from John: Atomic Habits
5. [9/23/2025, 7:47:35 PM] setState was being called after unmount - that was the bug!
6. [9/23/2025, 7:47:39 PM] Team decided to postpone feature X until Q2
7. [9/23/2025, 7:47:42 PM] Buy new coffee beans
```

Then categorize specific entries by their number:

```bash
# Mark "git reflog saves deleted branches for 30 days" as TIL
mjr 2 til

# Mark "Reply to Sarah's email about the project" as done
mjr 3 done

# Mark "Coffee tastes better on cold mornings" as insight and lifehack
mjr 1 insight lifehack

# Mark "Buy new coffee beans" as a todo
mjr 7 todo
```

After marking items with tags, `mjr` will only list entries that haven't been reviewed yet. To see all entries including reviewed ones, use `mj | less`. You can also filter for specific tags:

```bash
# List all items that have todo as the latest tag
mj | grep todo]
```

Then, to make the item not show up in the grep anymore, add more tags:

```bash
# So item 7 won't show up anymore in the grep command from above
mjr 7 done
```

## Storage

All journal entries are stored in `~/.micro-journal.json`.
