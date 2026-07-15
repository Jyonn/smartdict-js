import test from "node:test";
import assert from "node:assert/strict";

import {
  CircularReferenceError,
  PipelineStageError,
  ReferenceNotFoundError,
  iterativeParse,
  parse,
  partialParse
} from "../src/index.js";

test("interpolates references inside larger strings", () => {
  const parsed = parse({
    name: "smartdict",
    message: "hello-${name}"
  });

  assert.equal(parsed.message, "hello-smartdict");
});

test("single references preserve native values", () => {
  const parsed = parse({
    config: { debug: true },
    selected: "${config}"
  });

  assert.deepEqual(parsed.selected, { debug: true });
});

test("explicit full-match references preserve native values", () => {
  const parsed = parse({
    config: { debug: true },
    selected: "${config}$"
  });

  assert.deepEqual(parsed.selected, { debug: true });
});

test("typed defaults support scalars", () => {
  const parsed = parse({
    intValue: "${missing:42}",
    boolValue: "${missing:true}",
    nullValue: "${missing:null}",
    textValue: "${missing:fallback}"
  });

  assert.equal(parsed.intValue, 42);
  assert.equal(parsed.boolValue, true);
  assert.equal(parsed.nullValue, null);
  assert.equal(parsed.textValue, "fallback");
});

test("json defaults preserve arrays and objects", () => {
  const parsed = parse({
    listValue: "${missing:[0.0, 0.0, 0.003]}",
    dictValue: '${missing:{"hello": "world"}}'
  });

  assert.deepEqual(parsed.listValue, [0, 0, 0.003]);
  assert.deepEqual(parsed.dictValue, { hello: "world" });
});

test("json defaults can contain colons safely", () => {
  const parsed = parse({
    value: '${config:{"hello": "a:b", "url": "https://example.com"}}'
  });

  assert.deepEqual(parsed.value, {
    hello: "a:b",
    url: "https://example.com"
  });
});

test("existing values win over defaults", () => {
  const parsed = parse({
    sidSinkhornEpsilon: [1, 2, 3],
    sinkhornEpsilon: "${sidSinkhornEpsilon:[0.0, 0.0, 0.003]}"
  });

  assert.deepEqual(parsed.sinkhornEpsilon, [1, 2, 3]);
});

test("nested reference strings resolve indirect keys", () => {
  const parsed = parse({
    env: "prod",
    keys: { prod: "url" },
    url: "https://example.com",
    result: "${${keys.${env}}}"
  });

  assert.equal(parsed.result, "https://example.com");
});

test("generated keys are resolved", () => {
  const parsed = parse({
    name: "k",
    "${name}": 1
  });

  assert.deepEqual(parsed, { name: "k", k: 1 });
});

test("arrays can be indexed through dotted paths", () => {
  const parsed = parse({
    items: ["a", "b"],
    pick: "${items.1}"
  });

  assert.equal(parsed.pick, "b");
});

test("object attributes and mixed object-dict paths are supported", () => {
  class Config {
    constructor() {
      this.profile = "prod";
    }
  }

  const parsed = parse({
    app: new Config(),
    services: {
      prod: {
        url: "https://example.com"
      }
    },
    result: "${services.${app.profile}.url}"
  });

  assert.equal(parsed.result, "https://example.com");
});

test("intermediate aliases still resolve to target containers", () => {
  const parsed = parse({
    alias: "${config}$",
    config: {
      name: "smartdict"
    },
    result: "${alias.name}"
  });

  assert.deepEqual(parsed.alias, { name: "smartdict" });
  assert.equal(parsed.result, "smartdict");
});

test("nested sibling references do not trigger false cycles", () => {
  const parsed = parse({
    a: {
      x: "1",
      y: "${a.x}/2"
    }
  });

  assert.equal(parsed.a.y, "1/2");
});

test("nested fallback chains resolve to secondary references or null", () => {
  const parsed = parse({
    reprSourceModel: "text-embedding-3-small",
    embeddingModel: "${sidEmbeddingModel:${reprSourceModel:null}}"
  });

  assert.equal(parsed.embeddingModel, "text-embedding-3-small");

  const nullParsed = parse({
    embeddingModel: "${sidEmbeddingModel:${reprSourceModel:null}}"
  });

  assert.equal(nullParsed.embeddingModel, null);
});

test("pipelines run after defaults and support nested defaults", () => {
  const parsed = parse({
    dataset: "  My Dataset  ",
    saveDir: "${dataset|strip|lower|slug}",
    port: "${env.PORT:8000|int}",
    reprSourceModel: "TEXT-EMBEDDING-3-SMALL",
    embeddingModel: "${sidEmbeddingModel:${reprSourceModel:null}|lower}"
  });

  assert.equal(parsed.saveDir, "my-dataset");
  assert.equal(parsed.port, 8000);
  assert.equal(parsed.embeddingModel, "text-embedding-3-small");
});

test("json pipeline parses serialized JSON strings", () => {
  const parsed = parse({
    raw: '{"hello":"world"}',
    value: "${raw|json}"
  });

  assert.deepEqual(parsed.value, { hello: "world" });
});

test("partial parse preserves unresolved placeholders", () => {
  const parsed = partialParse({
    a: "${missing}",
    b: "pre-${missing}-post",
    c: "${missing}$",
    d: "${dataset|slug}"
  });

  assert.deepEqual(parsed, {
    a: "${missing}",
    b: "pre-${missing}-post",
    c: "${missing}$",
    d: "${dataset|slug}"
  });
});

test("iterative parse resolves multi-hop references", () => {
  const parsed = iterativeParse({
    a: "${b}",
    b: "${c}",
    c: "ok"
  }, 2);

  assert.deepEqual(parsed, { a: "ok", b: "ok", c: "ok" });
});

test("iterative parse exposes generated keys on the next round", () => {
  const data = {
    x: "y",
    "${x}": 123,
    a: "${y}"
  };

  const firstPass = iterativeParse(data, 1);
  const secondPass = iterativeParse(data, 2);

  assert.deepEqual(firstPass, {
    x: "y",
    y: 123,
    a: "${y}"
  });
  assert.deepEqual(secondPass, {
    x: "y",
    y: 123,
    a: 123
  });
});

test("missing references raise structured errors in strict mode", () => {
  assert.throws(
    () => parse({ a: "${missing}" }),
    (error) => {
      assert.ok(error instanceof ReferenceNotFoundError);
      assert.equal(error.unresolved.length, 1);
      assert.equal(error.unresolved[0].path, "a");
      assert.equal(error.unresolved[0].reference, "missing");
      return true;
    }
  );
});

test("circular references are detected", () => {
  assert.throws(
    () => parse({
      app: {
        profile: "${services.primary.profile}$"
      },
      services: {
        primary: {
          profile: "${app.profile}$"
        }
      }
    }),
    CircularReferenceError
  );
});

test("pipeline failures are structured", () => {
  assert.throws(
    () => parse({ port: "${env.PORT:abc|int}" }),
    (error) => {
      assert.ok(error instanceof PipelineStageError);
      assert.equal(error.stage, "int");
      return true;
    }
  );
});

test("iterations must be positive", () => {
  assert.throws(
    () => iterativeParse({ a: "b" }, 0),
    /iterations/
  );
});
