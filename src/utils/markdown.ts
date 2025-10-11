export function mdEscape(input: string): string {
  const specials = new Set([
    "\\", "`", "*", "_", "{", "}", "[", "]", "(", ")", "#", "+", "-", "!", ".",
  ]);
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    out += specials.has(ch) ? "\\" + ch : ch;
  }
  return out;
}

export function mdLink({ text, url }: { text: string; url: string }): string {
  return `[${mdEscape(text)}](${url})`;
}