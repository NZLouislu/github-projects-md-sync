import { strict as assert } from "assert";
import { validateStoryId, idGuidelines } from "../src/utils/id-validator";

describe("ID Validator", () => {
  it("should report missing", () => {
    const r = validateStoryId("");
    assert.equal(r.valid, false);
    assert.ok(r.issues.find(i => i.type === "MISSING"));
  });

  it("should detect whitespace and charset", () => {
    const r = validateStoryId(" bad id! ");
    const types = r.issues.map(i => i.type);
    assert.ok(types.includes("WHITESPACE"));
    assert.ok(types.includes("CHARSET"));
  });

  it("should detect length and duplicate", () => {
    const existing = new Set(["ok-id"]);
    const r1 = validateStoryId("ok-id", existing);
    assert.equal(r1.valid, false);
    assert.ok(r1.issues.find(i => i.type === "DUPLICATE"));

    const tooShort = validateStoryId("aa");
    assert.equal(tooShort.valid, false);
    assert.ok(tooShort.issues.find(i => i.type === "LENGTH"));
  });

  it("should pass valid id", () => {
    const r = validateStoryId("feature_add-user-123");
    assert.equal(r.valid, true);
    assert.equal(r.issues.length, 0);
  });

  it("guidelines template exists", () => {
    assert.ok(idGuidelines.template.length > 0);
    assert.ok(Array.isArray(idGuidelines.checklist));
  });
});