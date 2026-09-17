// Same ingress bounds as the gateway; signatures still validate there.
const UNSAFE_CANONICAL_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const SCANNER_MAX_DEPTH = 64;
const SCANNER_MAX_NODES = 262_144;
const SCANNER_MAX_KEY_LENGTH = 256;

export function assertNoDuplicateJsonKeys(text: string): void {
  let offset = 0;
  let nodes = 0;
  const whitespace = () => { while (/\s/.test(text[offset] ?? "")) offset += 1; };
  const stringToken = (): string => {
    const start = offset;
    if (text[offset] !== '"') throw new Error("JSON string expected");
    offset += 1;
    while (offset < text.length) {
      if (text[offset] === "\\") {
        offset += 2;
        continue;
      }
      if (text[offset] === '"') {
        offset += 1;
        return JSON.parse(text.slice(start, offset)) as string;
      }
      offset += 1;
    }
    throw new Error("Unterminated JSON string");
  };
  const value = (depth: number): void => {
    nodes += 1;
    if (depth > SCANNER_MAX_DEPTH) throw new Error("JSON is too deeply nested");
    if (nodes > SCANNER_MAX_NODES) throw new Error("JSON contains too many values");
    whitespace();
    if (text[offset] === '"') { stringToken(); return; }
    if (text[offset] === "{") {
      offset += 1;
      whitespace();
      const keys = new Set<string>();
      if (text[offset] === "}") { offset += 1; return; }
      while (true) {
        whitespace();
        const key = stringToken();
        if (key.length > SCANNER_MAX_KEY_LENGTH) throw new Error("JSON key is too long");
        if (UNSAFE_CANONICAL_KEYS.has(key)) throw new Error("JSON contains an unsafe key");
        if (keys.has(key)) throw new Error(`Duplicate JSON key ${key}`);
        keys.add(key);
        whitespace();
        if (text[offset] !== ":") throw new Error("JSON colon expected");
        offset += 1;
        value(depth + 1);
        whitespace();
        if (text[offset] === "}") { offset += 1; return; }
        if (text[offset] !== ",") throw new Error("JSON comma expected");
        offset += 1;
      }
    }
    if (text[offset] === "[") {
      offset += 1;
      whitespace();
      if (text[offset] === "]") { offset += 1; return; }
      while (true) {
        value(depth + 1);
        whitespace();
        if (text[offset] === "]") { offset += 1; return; }
        if (text[offset] !== ",") throw new Error("JSON comma expected");
        offset += 1;
      }
    }
    const token = text.slice(offset).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/)?.[0];
    if (!token) throw new Error("Invalid JSON token");
    offset += token.length;
  };
  value(1);
  whitespace();
  if (offset !== text.length) throw new Error("Trailing JSON content");
}
