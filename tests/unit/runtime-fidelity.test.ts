import { createRequire } from "node:module";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  exploreRepresentativeChapter,
  hasRuntimeTextWitness,
} from "../../packages/content/scripts/runtime-fidelity.mjs";

const require = createRequire(resolve(process.cwd(), "apps/web/package.json"));
const { Compiler } = require("inkjs/full") as {
  Compiler: new (source: string) => { Compile: () => { ToJson: () => string } };
};
const { Story } = require("inkjs") as { Story: new (compiledJson: string) => unknown };

function compile(source: string): string {
  return new Compiler(source).Compile().ToJson();
}

describe("runtime fidelity witnesses", () => {
  it("does not accept source text hidden behind an impossible Ink condition", () => {
    const hidden = "这段原文永远不该被玩家看到。";
    const compiled = compile(`-> start

=== start ===
# scene:s
{ false:
${hidden}
}
玩家真正看到的是这一句。
-> END
`);

    const exploration = exploreRepresentativeChapter(Story, compiled);
    expect(exploration.errors).toEqual([]);
    expect(hasRuntimeTextWitness(exploration, "s", hidden)).toBe(false);
    expect(hasRuntimeTextWitness(exploration, "s", "玩家真正看到的是这一句。")).toBe(true);
  });

  it("records the real output of every choice from a visible menu", () => {
    const compiled = compile(`-> start

=== start ===
# scene:s
* [走左边] # choice:left
  左边真的显示。
  -> END
* [走右边] # choice:right
  右边真的显示。
  -> END
`);

    const exploration = exploreRepresentativeChapter(Story, compiled);
    expect(hasRuntimeTextWitness(exploration, "s", "左边真的显示。")).toBe(true);
    expect(hasRuntimeTextWitness(exploration, "s", "右边真的显示。")).toBe(true);
  });
});
