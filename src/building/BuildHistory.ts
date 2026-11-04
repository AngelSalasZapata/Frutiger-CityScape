export interface BuildCommand {
  readonly label: string
  execute(): void
  undo(): void
}

interface HistoryEntry {
  readonly label: string
  readonly commands: readonly BuildCommand[]
}

interface Transaction {
  readonly label: string
  readonly commands: BuildCommand[]
}

const HISTORY_LIMIT = 200

/**
 * Pila de comandos con soporte de transacciones. Una transacción agrupa, por
 * ejemplo, todos los tramos dibujados en un mismo arrastre para que un único
 * Ctrl+Z deshaga la calle completa.
 */
export class BuildHistory {
  private readonly undoStack: HistoryEntry[] = []
  private readonly redoStack: HistoryEntry[] = []
  private transaction: Transaction | null = null

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  get undoLabel(): string | null {
    return this.undoStack.at(-1)?.label ?? null
  }

  get redoLabel(): string | null {
    return this.redoStack.at(-1)?.label ?? null
  }

  get transactionActive(): boolean {
    return this.transaction !== null
  }

  execute(command: BuildCommand): void {
    if (this.transaction) {
      command.execute()
      this.transaction.commands.push(command)
      return
    }

    command.execute()
    this.push({ label: command.label, commands: [command] })
  }

  beginTransaction(label: string): void {
    if (this.transaction) {
      throw new Error('Ya hay una transacción de construcción activa')
    }

    this.transaction = { label, commands: [] }
  }

  commitTransaction(): string | null {
    const transaction = this.transaction
    this.transaction = null

    if (!transaction || transaction.commands.length === 0) return null

    this.push({ label: transaction.label, commands: transaction.commands })
    return transaction.label
  }

  cancelTransaction(): void {
    const transaction = this.transaction
    this.transaction = null
    if (!transaction) return

    for (const command of [...transaction.commands].reverse()) {
      command.undo()
    }
  }

  undo(): string | null {
    const entry = this.undoStack.pop()
    if (!entry) return null

    for (const command of [...entry.commands].reverse()) {
      command.undo()
    }

    this.redoStack.push(entry)
    return entry.label
  }

  redo(): string | null {
    const entry = this.redoStack.pop()
    if (!entry) return null

    for (const command of entry.commands) {
      command.execute()
    }

    this.undoStack.push(entry)
    return entry.label
  }

  clear(): void {
    this.undoStack.length = 0
    this.redoStack.length = 0
    this.transaction = null
  }

  private push(entry: HistoryEntry): void {
    this.undoStack.push(entry)
    this.redoStack.length = 0

    if (this.undoStack.length > HISTORY_LIMIT) {
      this.undoStack.shift()
    }
  }
}
