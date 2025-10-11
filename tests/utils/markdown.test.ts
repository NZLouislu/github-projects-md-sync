import { strict as assert } from "assert";
import { mdEscape, mdLink } from "../../src/utils/markdown";

describe("markdown utils", () => {
  it("escapes markdown special chars", () => {
    const s = mdEscape("*[Link](a) - #1!");
    assert.equal(s, "\\*\\[Link\\]\\(a\\) \\- \\#1\\!");
  });

  it("builds markdown link with escaped text", () => {
    const s = mdLink({ text: "A*B", url: "https://x.test" });
    assert.equal(s, "[A\\*B](https://x.test)");
  });
});