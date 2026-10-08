export type ClipboardWriter = (text: string) => Promise<void>;

// Clipboard API 미지원, 권한 거부 등은 결과 값으로 반환하여 UI 전체 중단을 막습니다.
export async function copyCharacter(text: string, writer?: ClipboardWriter): Promise<boolean> {
  if (!writer) return false;
  try {
    await writer(text);
    return true;
  } catch {
    return false;
  }
}
