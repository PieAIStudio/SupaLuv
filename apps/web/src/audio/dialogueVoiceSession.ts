export interface DialogueVoiceTicket {
  readonly epoch: number;
  readonly controller: AbortController;
}

/**
 * Owns exactly one dialogue TTS request. Skip, chapter change, retry, and
 * unmount all converge on the same idempotent cancel operation.
 */
export class DialogueVoiceSession {
  private epoch = 0;
  private controller: AbortController | null = null;

  begin(): DialogueVoiceTicket {
    this.cancel();
    const controller = new AbortController();
    this.controller = controller;
    this.epoch += 1;
    return { epoch: this.epoch, controller };
  }

  cancel(): void {
    this.epoch += 1;
    this.controller?.abort();
    this.controller = null;
  }

  isCurrent(ticket: DialogueVoiceTicket): boolean {
    return (
      this.controller === ticket.controller &&
      this.epoch === ticket.epoch &&
      !ticket.controller.signal.aborted
    );
  }
}
