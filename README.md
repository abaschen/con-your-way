# Con Your Way — Duel of Life

A strategic two-player game that combines cellular automata with programmable instructions. Players compete by placing cells on a grid and programming them with a sequence of 5 instructions. The cells then execute their programs simultaneously while Conway's Game of Life rules determine survival and reproduction.

## How to Run

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

The game will open in your browser at `http://localhost:5173` (or the next available port).

## Game Concept

Con Your Way is a duel between two players where cellular automata meet strategic programming. Each player places up to 20 cells on a 40×30 toroidal grid and programs them with a sequence of 5 instructions. Once the game starts, all cells execute their programs simultaneously for up to 500 ticks, with Conway's Game of Life rules applied after each instruction cycle.

### Core Mechanics

The game operates in two distinct phases:

**Setup Phase**: Players take turns placing their cells on the board. Each cell has a direction (North, East, South, or West) that can be cycled by right-clicking. Players also program a sequence of exactly 5 instructions that all their cells will follow.

**Execution Phase**: The game runs automatically, with each tick consisting of:
1. All cells execute their 5 instructions simultaneously
2. Conway's Game of Life rules are applied to the resulting board state

### The Instruction Set

Each player programs their cells with 5 instructions chosen from:

- **MOVE**: Move one cell forward in the facing direction
- **TURN_LEFT**: Rotate 90° counter-clockwise
- **TURN_RIGHT**: Rotate 90° clockwise
- **REPRODUCE**: Spawn a child cell directly ahead (if empty)
- **KILL**: Remove any cell directly ahead (friend or foe)
- **IDLE**: Do nothing

All 5 instructions execute in sequence during each tick, and all cells execute the same program simultaneously.

### Conway's Game of Life Integration

After each instruction cycle, standard Conway's Game of Life rules apply:

- A living cell with 2 or 3 neighbors survives
- A living cell with fewer than 2 or more than 3 neighbors dies
- An empty cell with exactly 3 neighbors becomes alive

When a new cell is born through Conway's rules:
- **Owner**: Determined by majority among the 3 parent neighbors (ties broken randomly)
- **Direction**: Inherits the most common direction among parents (ties broken randomly)

### Conflict Resolution

When multiple cells attempt to move to the same location:
- One cell is chosen randomly as the winner
- If the destination contains an enemy cell, it's killed and replaced
- If the destination contains a friendly cell, the move fails

### Victory Conditions

The game ends when:

1. **Elimination**: One player has no cells remaining (opponent wins)
2. **Mutual Elimination**: Both players have no cells (draw)
3. **Stalemate**: Board state remains unchanged for 3 consecutive ticks (winner determined by cell count)
4. **Timeout**: 500 ticks elapse (winner determined by cell count)

### Strategic Depth

The interplay between programmed instructions and Conway's rules creates emergent complexity:

- **Aggressive strategies**: Use KILL and MOVE to eliminate opponents
- **Reproductive strategies**: Use REPRODUCE to create clusters that survive Conway's rules
- **Defensive strategies**: Create stable patterns that resist Conway's death rules
- **Hybrid approaches**: Balance expansion, defense, and attack

The toroidal grid (wrapping edges) means there are no safe corners, and patterns can interact across boundaries.

## Features

### Game Controls

- **Setup Phase**: Click to place cells, right-click to rotate direction
- **Speed Control**: Adjust simulation speed from 50ms to 1000ms per tick
- **Pause/Resume**: Pause the simulation at any time
- **Reset**: Start over with a fresh board

### Save & Load System

- Save your cell placements and instruction programs
- Load previous configurations for both players
- Saves are stored locally in browser storage

### Replay System

- Full history of every tick is recorded
- Scrub through the timeline to analyze the game
- Step forward/backward through individual ticks
- Exit replay to return to live simulation

### Statistics Dashboard

At game end, view comprehensive statistics:

- Population graphs over time
- Skill-based kills and births (from instructions)
- Natural deaths and births (from Conway's rules)
- Heat maps showing territorial control
- Win/loss reasons and tick counts

### URL Sharing

Share game states via URL parameters. The URL encodes:
- Board dimensions and configuration
- Both players' cell placements and directions
- Both players' instruction programs

## Technical Architecture

### Project Structure

```
src/
├── game/           # Core game logic
│   ├── Board.ts    # Grid state management
│   ├── Conway.ts   # Conway's Game of Life rules
│   ├── Game.ts     # Main game controller
│   └── Instruction.ts  # Instruction execution engine
├── ui/             # User interface components
│   ├── BoardRenderer.ts    # Canvas rendering
│   ├── GameUI.ts          # Main UI controller
│   ├── InstructionPanel.ts # Instruction programming UI
│   ├── PlaysPanel.ts      # History sidebar
│   ├── SaveLoadUI.ts      # Save/load functionality
│   └── SetupUI.ts         # Setup phase controls
├── save/           # Persistence layer
│   ├── PlaysHistory.ts    # Local storage management
│   ├── StateStorage.ts    # State serialization
│   └── UrlState.ts        # URL parameter encoding
├── stats/          # Analytics and visualization
│   ├── GameStats.ts       # Statistics collection
│   └── StatsScreen.ts     # End-game dashboard
├── types.ts        # TypeScript type definitions
├── main.ts         # Application entry point
└── style.css       # Styling
```

### Key Technologies

- **TypeScript**: Type-safe game logic
- **Vite**: Fast development and optimized builds
- **Canvas API**: High-performance grid rendering
- **LocalStorage**: Client-side persistence

### Design Patterns

- **Observer Pattern**: Game state changes notify UI components
- **State Machine**: Explicit game phase management (SETUP_P1 → SETUP_P2 → READY → RUNNING → PAUSED → ENDED)
- **Immutable State**: Board states are cloned for history tracking
- **Separation of Concerns**: Game logic, rendering, and UI are decoupled

## Game Theory Insights

Con Your Way explores the intersection of:

- **Deterministic Chaos**: Simple rules create unpredictable outcomes
- **Emergent Behavior**: Complex patterns arise from basic instructions
- **Strategic Programming**: Pre-planning vs. adaptive execution
- **Resource Management**: Balancing expansion with survival

The 5-instruction limit forces players to make hard choices. Do you prioritize movement, reproduction, or combat? The simultaneous execution means you can't react to your opponent—you must anticipate their strategy.

Conway's rules add a layer of natural selection: even the best-programmed cells must form patterns that survive the life-death cycle. This creates a tension between active control (instructions) and passive survival (Conway's rules).

## Development

Built with modern web technologies for maximum performance and maintainability:

- No external dependencies beyond build tools
- Pure TypeScript for game logic
- Canvas-based rendering for 60fps performance
- Modular architecture for easy extension

### Extending the Game

The codebase is designed for extensibility:

- Add new instructions in `types.ts` and implement in `Instruction.ts`
- Modify board rules in `Conway.ts`
- Adjust game parameters in `DEFAULT_CONFIG`
- Create new UI panels following existing patterns

## License

This project is private and not licensed for distribution.

---

**Strategy Tip**: The most successful programs often create stable Conway patterns (like blocks or beehives) while using MOVE and KILL to disrupt the opponent's formations. Experiment with different instruction sequences to find winning combinations!
