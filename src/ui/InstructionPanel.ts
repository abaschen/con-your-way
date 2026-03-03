import { INSTRUCTIONS, type Instruction, type Owner } from '../types.js';

const INSTRUCTION_LABELS: Record<Instruction, string> = {
  MOVE: '→ Move',
  TURN_LEFT: '↺ Turn Left',
  TURN_RIGHT: '↻ Turn Right',
  REPRODUCE: '✦ Reproduce',
  KILL: '✕ Kill',
  IDLE: '· Idle',
};

const INSTRUCTION_DESCRIPTIONS: Record<Instruction, string> = {
  MOVE: 'Move forward one cell in facing direction',
  TURN_LEFT: 'Rotate 90° counter-clockwise',
  TURN_RIGHT: 'Rotate 90° clockwise',
  REPRODUCE: 'Spawn a child cell directly ahead (if empty)',
  KILL: 'Destroy any cell directly ahead',
  IDLE: 'Do nothing this step',
};

export class InstructionPanel {
  private owner: Owner;
  private slots: Instruction[] = ['IDLE', 'IDLE', 'IDLE', 'IDLE', 'IDLE'];
  private container: HTMLElement;
  private slotElements: HTMLElement[] = [];
  private onChange: ((program: [Instruction, Instruction, Instruction, Instruction, Instruction]) => void) | null = null;
  private enabled = true;

  constructor(containerId: string, owner: Owner) {
    this.owner = owner;
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;
    this.render();
  }

  onProgramChange(handler: (program: [Instruction, Instruction, Instruction, Instruction, Instruction]) => void): void {
    this.onChange = handler;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.slotElements.forEach(el => {
      el.classList.toggle('disabled', !enabled);
    });
  }

  getProgram(): [Instruction, Instruction, Instruction, Instruction, Instruction] {
    return [...this.slots] as [Instruction, Instruction, Instruction, Instruction, Instruction];
  }

  reset(): void {
    this.slots = ['IDLE', 'IDLE', 'IDLE', 'IDLE', 'IDLE'];
    this.render();
  }

  /** Load a saved program into the slots and fire onChange */
  loadProgram(program: [Instruction, Instruction, Instruction, Instruction, Instruction]): void {
    this.slots = [...program] as [Instruction, Instruction, Instruction, Instruction, Instruction];
    this.render();
    this.onChange?.(this.getProgram());
  }

  private render(): void {
    this.container.innerHTML = '';
    this.slotElements = [];

    for (let i = 0; i < 5; i++) {
      const slot = this.createSlot(i);
      this.container.appendChild(slot);
      this.slotElements.push(slot);
    }
  }

  private createSlot(index: number): HTMLElement {
    const slot = document.createElement('div');
    slot.className = `instruction-slot p${this.owner}-slot`;

    const label = document.createElement('div');
    label.className = 'slot-index';
    label.textContent = `${index + 1}`;

    const selector = document.createElement('select');
    selector.className = 'slot-select';
    selector.title = INSTRUCTION_DESCRIPTIONS[this.slots[index]];

    for (const instr of INSTRUCTIONS) {
      const option = document.createElement('option');
      option.value = instr;
      option.textContent = INSTRUCTION_LABELS[instr];
      if (instr === this.slots[index]) option.selected = true;
      selector.appendChild(option);
    }

    selector.addEventListener('change', () => {
      if (!this.enabled) {
        selector.value = this.slots[index];
        return;
      }
      this.slots[index] = selector.value as Instruction;
      selector.title = INSTRUCTION_DESCRIPTIONS[this.slots[index]];
      this.onChange?.(this.getProgram());
    });

    slot.appendChild(label);
    slot.appendChild(selector);
    return slot;
  }
}
