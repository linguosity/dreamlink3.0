// lib/streamJson.ts
//
// Incremental extraction of string fields from a JSON object that is arriving
// as a stream of text chunks.
//
// The analysis call uses structured output, so what streams from the model is
// JSON — showing that raw to a user would be showing them punctuation. This
// watches the growing buffer for the fields worth reading aloud
// (topicSentence, supportingPoints, analysis) and emits their DECODED contents
// as they grow, so the client can render prose while the object is still
// being generated.
//
// Approach: keep the whole buffer and rescan the target fields on every
// chunk, emitting only the not-yet-emitted tail of each. A model response is
// a few KB, so the quadratic worst case is microseconds — chosen over a
// character-by-character state machine because it is dramatically easier to
// convince yourself it is correct, and this parses untrusted model output.
//
// Known limitation, acceptable here: a field VALUE containing the literal
// sequence `"fieldName":` could confuse the key search. Inside a JSON string
// any quote is escaped as \", so the exact token `"analysis"` (bare quotes,
// colon after) cannot legally appear inside a value — the scan also requires
// the colon, so ordinary prose about the word never triggers it.

export interface FieldDelta {
  /** Field name; array items get an index suffix: "supportingPoints.0". */
  field: string;
  /** Newly decoded text since the last emission for this field. */
  text: string;
}

export function createJsonFieldStreamer(
  fields: string[],
  emit: (delta: FieldDelta) => void,
) {
  let buf = "";
  const emitted = new Map<string, number>();

  /** Decode the string starting just after an opening quote at `start`.
   *  Stops at the closing unescaped quote or the end of the buffer, and never
   *  decodes a trailing incomplete escape sequence. */
  function scanString(key: string, start: number): { closed: boolean; end: number } {
    let out = "";
    let i = start;
    let closed = false;
    while (i < buf.length) {
      const c = buf[i];
      if (c === '"') {
        closed = true;
        break;
      }
      if (c === "\\") {
        if (i + 1 >= buf.length) break; // incomplete escape — wait for more
        const n = buf[i + 1];
        if (n === "n") out += "\n";
        else if (n === "t") out += "\t";
        else if (n === '"') out += '"';
        else if (n === "\\") out += "\\";
        else if (n === "u") {
          if (i + 6 > buf.length) break; // incomplete \uXXXX
          const code = parseInt(buf.slice(i + 2, i + 6), 16);
          out += Number.isNaN(code) ? "" : String.fromCharCode(code);
          i += 6;
          continue;
        } else out += n; // \/ \b \f etc — pass through the char
        i += 2;
        continue;
      }
      out += c;
      i += 1;
    }
    const already = emitted.get(key) ?? 0;
    if (out.length > already) {
      emit({ field: key, text: out.slice(already) });
      emitted.set(key, out.length);
    }
    return { closed, end: i };
  }

  function scan() {
    for (const field of fields) {
      const token = `"${field}"`;
      const idx = buf.indexOf(token);
      if (idx === -1) continue;
      let i = idx + token.length;
      while (i < buf.length && /\s/.test(buf[i])) i += 1;
      if (buf[i] !== ":") continue;
      i += 1;
      while (i < buf.length && /\s/.test(buf[i])) i += 1;
      if (buf[i] === '"') {
        scanString(field, i + 1);
      } else if (buf[i] === "[") {
        // Array of strings (supportingPoints). Walk item by item; stop at the
        // first item that has not closed yet.
        let j = i + 1;
        let item = 0;
        while (j < buf.length) {
          while (j < buf.length && /[\s,]/.test(buf[j])) j += 1;
          if (j >= buf.length || buf[j] === "]") break;
          if (buf[j] !== '"') break; // malformed or not-yet-arrived
          const res = scanString(`${field}.${item}`, j + 1);
          if (!res.closed) break;
          j = res.end + 1;
          item += 1;
        }
      }
    }
  }

  return {
    push(chunk: string) {
      buf += chunk;
      scan();
    },
  };
}
