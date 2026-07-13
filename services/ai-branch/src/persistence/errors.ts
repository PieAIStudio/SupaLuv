export class EndingVersionConflictError extends Error {
  constructor() {
    super("AI ending session version conflict");
    this.name = "EndingVersionConflictError";
  }
}

export class ReceiptConflictError extends Error {
  constructor() {
    super("wallet reservation already has a conflicting receipt");
    this.name = "ReceiptConflictError";
  }
}
