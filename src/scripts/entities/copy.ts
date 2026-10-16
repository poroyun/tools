import { copyCharacter, type ClipboardWriter } from '../characters/clipboard.ts';

interface CopyUI {
  reset: () => void;
  success: () => void;
  failure: (text: string) => void;
}

export function createEntityCopier(ui: CopyUI, writer?: ClipboardWriter): (text: string) => Promise<void> {
  let sequence = 0;
  return async (text) => {
    const request = ++sequence;
    ui.reset();
    const success = await copyCharacter(text, writer);
    if (sequence !== request) return;
    if (success) ui.success();
    else ui.failure(text);
  };
}
