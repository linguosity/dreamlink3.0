import { describe, it, expect } from "vitest";
import { createJsonFieldStreamer, type FieldDelta } from "@/lib/streamJson";

function collect() {
  const deltas: FieldDelta[] = [];
  const streamer = createJsonFieldStreamer(
    ["topicSentence", "supportingPoints", "analysis"],
    (d) => deltas.push(d),
  );
  const text = (field: string) =>
    deltas.filter((d) => d.field === field).map((d) => d.text).join("");
  return { streamer, deltas, text };
}

describe("createJsonFieldStreamer", () => {
  it("emits a field's text incrementally across chunk boundaries", () => {
    const { streamer, text } = collect();
    streamer.push('{"topicSen');
    streamer.push('tence":"God speaks');
    streamer.push(' through waters."');
    expect(text("topicSentence")).toBe("God speaks through waters.");
  });

  it("decodes escapes, including ones split across chunks", () => {
    const { streamer, text } = collect();
    streamer.push('{"analysis":"line one\\');
    streamer.push('nline two \\"quoted\\""');
    expect(text("analysis")).toBe('line one\nline two "quoted"');
  });

  it("emits array items with index suffixes", () => {
    const { streamer, text } = collect();
    streamer.push('{"supportingPoints":["first point (Ps 23:4)",');
    streamer.push('"second point');
    expect(text("supportingPoints.0")).toBe("first point (Ps 23:4)");
    expect(text("supportingPoints.1")).toBe("second point");
    streamer.push(' finished"]');
    expect(text("supportingPoints.1")).toBe("second point finished");
  });

  it("never emits the same text twice", () => {
    const { streamer, deltas } = collect();
    streamer.push('{"topicSentence":"abc');
    streamer.push('"');
    streamer.push(',"tags":["x"]}');
    const joined = deltas.map((d) => d.text).join("");
    expect(joined).toBe("abc");
  });

  it("ignores fields it was not asked to watch", () => {
    const { streamer, deltas } = collect();
    streamer.push('{"conclusionSentence":"the end."}');
    expect(deltas).toHaveLength(0);
  });

  it("is not fooled by the field name appearing inside a value", () => {
    const { streamer, text } = collect();
    streamer.push('{"topicSentence":"the word \\"analysis\\": appears here","analysis":"real"}');
    expect(text("analysis")).toBe("real");
    expect(text("topicSentence")).toBe('the word "analysis": appears here');
  });
});
