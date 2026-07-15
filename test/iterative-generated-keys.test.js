import test from "node:test";
import assert from "node:assert/strict";

import { iterativeParse } from "../src/index.js";

const generatedKeyCases = [
  {
    name: "root-level generated key becomes visible next round",
    data: {
      x: "y",
      "${x}": 123,
      a: "${y}"
    },
    firstPass: {
      x: "y",
      y: 123,
      a: "${y}"
    },
    secondPass: {
      x: "y",
      y: 123,
      a: 123
    }
  },
  {
    name: "nested generated key becomes visible next round",
    data: {
      env: "prod",
      services: {
        "${env}": {
          url: "https://example.com"
        }
      },
      selected: "${services.prod.url}"
    },
    firstPass: {
      env: "prod",
      services: {
        prod: {
          url: "https://example.com"
        }
      },
      selected: "${services.prod.url}"
    },
    secondPass: {
      env: "prod",
      services: {
        prod: {
          url: "https://example.com"
        }
      },
      selected: "https://example.com"
    }
  },
  {
    name: "generated alias unlocks downstream lookup next round",
    data: {
      key_name: "primary",
      "${key_name}": "model_a",
      aliases: {
        model_a: {
          target: "text-embedding-3-small"
        }
      },
      resolved: "${aliases.${primary}.target}"
    },
    firstPass: {
      key_name: "primary",
      primary: "model_a",
      aliases: {
        model_a: {
          target: "text-embedding-3-small"
        }
      },
      resolved: "${aliases.${primary}.target}"
    },
    secondPass: {
      key_name: "primary",
      primary: "model_a",
      aliases: {
        model_a: {
          target: "text-embedding-3-small"
        }
      },
      resolved: "text-embedding-3-small"
    }
  }
];

test("iteration one keeps followup references unresolved for generated-key cases", () => {
  for (const scenario of generatedKeyCases) {
    assert.deepEqual(
      iterativeParse(scenario.data, 1),
      scenario.firstPass,
      scenario.name
    );
  }
});

test("iteration two resolves followup references for generated-key cases", () => {
  for (const scenario of generatedKeyCases) {
    assert.deepEqual(
      iterativeParse(scenario.data, 2),
      scenario.secondPass,
      scenario.name
    );
  }
});
