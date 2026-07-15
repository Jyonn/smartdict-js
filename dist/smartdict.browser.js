/* smartdict-js v0.5.0 */
var smartdict = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    CircularReferenceError: () => CircularReferenceError,
    Path: () => Path,
    PipelineStage: () => PipelineStage,
    PipelineStageError: () => PipelineStageError,
    ReferenceNotFoundError: () => ReferenceNotFoundError,
    SmartDict: () => SmartDict,
    UnresolvedReference: () => UnresolvedReference,
    iterativeParse: () => iterativeParse,
    iterative_parse: () => iterative_parse,
    parse: () => parse,
    partialParse: () => partialParse,
    partial_parse: () => partial_parse,
    version: () => version
  });
  var NOT_FOUND = Symbol("smartdict.notFound");
  var UNSET_VALUE = Symbol("smartdict.unsetValue");
  var STATUS_RESOLVING = Symbol("smartdict.resolving");
  var STATUS_UNRESOLVED = Symbol("smartdict.unresolved");
  var STATUS_RESOLVED = Symbol("smartdict.resolved");
  var Path = class _Path {
    constructor(parts = []) {
      this.parts = parts;
    }
    child(part) {
      return new _Path([...this.parts, String(part)]);
    }
    toString() {
      return this.parts.join(" -> ");
    }
  };
  var RefStringStatus = class {
    constructor(refString) {
      this.refString = refString;
      this.status = STATUS_RESOLVING;
      this.value = UNSET_VALUE;
    }
    get isResolved() {
      return this.status === STATUS_RESOLVED;
    }
    get isResolving() {
      return this.status === STATUS_RESOLVING;
    }
    resolve(value) {
      this.status = STATUS_RESOLVED;
      this.value = value;
      return this;
    }
    unresolve() {
      this.status = STATUS_UNRESOLVED;
      return this;
    }
  };
  var RefStringStatusWithValue = class {
    constructor(status, value = UNSET_VALUE, preserveValue = false) {
      this.status = status;
      this.value = value;
      if (status.isResolved && !preserveValue) {
        this.value = status.value;
      }
    }
    get isUnset() {
      return this.value === UNSET_VALUE;
    }
  };
  var ComponentWithValue = class {
    constructor(path) {
      this.path = path.toString();
      this.unresolved = [];
      this.final = void 0;
    }
    push(refValue) {
      if (refValue.isUnset) {
        this.unresolved.push(refValue.status);
      }
      return this;
    }
    listPush(componentValue) {
      if (componentValue.hasUnresolved) {
        this.unresolved.push(componentValue);
      }
      return this;
    }
    dictPush(componentValue) {
      if (componentValue.hasUnresolved) {
        this.unresolved.push(componentValue);
      }
      return this;
    }
    finalize(value) {
      this.final = value;
      return this;
    }
    get hasUnresolved() {
      return this.unresolved.length > 0;
    }
  };
  var UnresolvedReference = class {
    constructor(path, reference) {
      this.path = path;
      this.reference = reference;
    }
  };
  var CircularReferenceError = class extends ReferenceError {
    constructor(refString) {
      super(`Circular reference detected: ${refString}`);
      this.name = "CircularReferenceError";
      this.refString = refString;
    }
  };
  var ReferenceNotFoundError = class extends Error {
    constructor(unresolved) {
      const details = unresolved.map((item) => `${item.path || "<root>"} -> ${item.reference}`).join(", ");
      super(`Unresolved references: ${details}`);
      this.name = "ReferenceNotFoundError";
      this.unresolved = Object.freeze([...unresolved]);
    }
  };
  var PipelineStageError = class extends Error {
    constructor(stage, value, path, message) {
      super(`Pipeline stage \`${stage}\` failed at ${path || "<root>"}: ${message}`);
      this.name = "PipelineStageError";
      this.stage = stage;
      this.value = value;
      this.path = path;
    }
  };
  var PipelineStage = class {
    constructor(name, arg = null) {
      this.name = name;
      this.arg = arg;
    }
  };
  var Part = class {
    constructor(part, { full = false, partial = false } = {}) {
      this.part = part;
      this.full = full;
      this.partial = partial;
    }
  };
  function scanTopLevelDelimiter(source, delimiter) {
    let refDepth = 0;
    let braceDepth = 0;
    let bracketDepth = 0;
    let parenDepth = 0;
    let quoteChar = null;
    let escaped = false;
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      const nextTwo = source.slice(i, i + 2);
      if (quoteChar !== null) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === quoteChar) {
          quoteChar = null;
        }
        continue;
      }
      if (char === '"' || char === "'") {
        quoteChar = char;
        continue;
      }
      if (nextTwo === "${") {
        refDepth += 1;
        i += 1;
        continue;
      }
      if (char === "{") {
        braceDepth += 1;
        continue;
      }
      if (char === "}") {
        if (braceDepth > 0) {
          braceDepth -= 1;
        } else if (refDepth > 0) {
          refDepth -= 1;
        }
        continue;
      }
      if (char === "[") {
        bracketDepth += 1;
        continue;
      }
      if (char === "]") {
        if (bracketDepth > 0) {
          bracketDepth -= 1;
        }
        continue;
      }
      if (char === "(") {
        parenDepth += 1;
        continue;
      }
      if (char === ")") {
        if (parenDepth > 0) {
          parenDepth -= 1;
        }
        continue;
      }
      if (char === delimiter && refDepth === 0 && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
        return i;
      }
    }
    return -1;
  }
  function splitTopLevelOnce(source, delimiter) {
    const index = scanTopLevelDelimiter(source, delimiter);
    if (index === -1) {
      return [source, null];
    }
    return [source.slice(0, index), source.slice(index + 1)];
  }
  function splitTopLevel(source, delimiter) {
    const parts = [];
    let rest = source;
    while (true) {
      const [head, tail] = splitTopLevelOnce(rest, delimiter);
      parts.push(head);
      if (tail === null) {
        return parts;
      }
      rest = tail;
    }
  }
  function parseRefString(source) {
    const parts = [];
    let index = 0;
    while (index < source.length) {
      if (source.slice(index, index + 2) === "${") {
        let refDepth = 1;
        let braceDepth = 0;
        let bracketDepth = 0;
        let quoteChar = null;
        let escaped = false;
        let cursor = index + 2;
        while (cursor < source.length && refDepth > 0) {
          const char = source[cursor];
          const nextTwo = source.slice(cursor, cursor + 2);
          if (quoteChar !== null) {
            if (escaped) {
              escaped = false;
            } else if (char === "\\") {
              escaped = true;
            } else if (char === quoteChar) {
              quoteChar = null;
            }
            cursor += 1;
            continue;
          }
          if (char === '"' || char === "'") {
            quoteChar = char;
            cursor += 1;
          } else if (nextTwo === "${") {
            refDepth += 1;
            cursor += 2;
          } else if (char === "{") {
            braceDepth += 1;
            cursor += 1;
          } else if (char === "}") {
            if (braceDepth > 0) {
              braceDepth -= 1;
            } else {
              refDepth -= 1;
            }
            cursor += 1;
          } else if (char === "[") {
            bracketDepth += 1;
            cursor += 1;
          } else if (char === "]") {
            if (bracketDepth > 0) {
              bracketDepth -= 1;
            }
            cursor += 1;
          } else {
            cursor += 1;
          }
        }
        if (refDepth !== 0) {
          throw new Error(`Unmatched braces in: ${source}`);
        }
        const expression = source.slice(index + 2, cursor - 1);
        if (index === 0 && cursor === source.length - 1 && source.endsWith("$")) {
          parts.push(new Part(expression, { full: true }));
          return parts;
        }
        parts.push(new Part(expression, { partial: true }));
        index = cursor;
        continue;
      }
      const start = index;
      while (index < source.length && source.slice(index, index + 2) !== "${") {
        index += 1;
      }
      parts.push(new Part(source.slice(start, index)));
    }
    return parts;
  }
  function isString(value) {
    return typeof value === "string" || value instanceof String;
  }
  function isPlainObject(value) {
    if (value === null || typeof value !== "object") {
      return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }
  function parseDefaultValue(value) {
    if (!isString(value)) {
      return value;
    }
    const text = String(value);
    const stripped = text.trim();
    try {
      return JSON.parse(stripped);
    } catch {
    }
    if (/^[+-]?\d+$/.test(text)) {
      return Number.parseInt(text, 10);
    }
    if (/^[+-]?(?:\d+\.\d*|\d*\.\d+)$/.test(text)) {
      return Number.parseFloat(text);
    }
    return text;
  }
  function parseStageArg(arg) {
    if (arg === null || arg === void 0) {
      return null;
    }
    if (isString(arg) && String(arg).includes("${")) {
      return String(arg);
    }
    return parseDefaultValue(arg);
  }
  function stringifyResolvedPart(value, { forRef = false } = {}) {
    if (forRef) {
      if (value === null) {
        return "null";
      }
      if (value === true) {
        return "true";
      }
      if (value === false) {
        return "false";
      }
    }
    return String(value);
  }
  function isKeyLike(value) {
    return ["string", "number", "boolean", "bigint", "symbol"].includes(typeof value);
  }
  function toPropertyKey(value) {
    if (typeof value === "symbol") {
      return value;
    }
    return String(value);
  }
  function toIntegerKey(value) {
    if (!/^[+-]?\d+$/.test(String(value))) {
      return null;
    }
    return Number.parseInt(String(value), 10);
  }
  function stageBool(value) {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return Boolean(value);
    }
    if (isString(value)) {
      const lowered = String(value).trim().toLowerCase();
      if (lowered === "true") {
        return true;
      }
      if (lowered === "false") {
        return false;
      }
    }
    throw new Error(`cannot convert ${JSON.stringify(value)} to bool`);
  }
  function stageSlug(value) {
    return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function stageInt(value) {
    if (typeof value === "number") {
      if (Number.isNaN(value) || !Number.isFinite(value)) {
        throw new Error(`cannot convert ${JSON.stringify(value)} to int`);
      }
      return Math.trunc(value);
    }
    const text = String(value).trim();
    if (!/^[+-]?\d+$/.test(text)) {
      throw new Error(`cannot convert ${JSON.stringify(value)} to int`);
    }
    return Number.parseInt(text, 10);
  }
  function stageFloat(value) {
    if (typeof value === "number") {
      if (Number.isNaN(value) || !Number.isFinite(value)) {
        throw new Error(`cannot convert ${JSON.stringify(value)} to float`);
      }
      return value;
    }
    const text = String(value).trim();
    if (!text) {
      throw new Error(`cannot convert ${JSON.stringify(value)} to float`);
    }
    const converted = Number(text);
    if (Number.isNaN(converted)) {
      throw new Error(`cannot convert ${JSON.stringify(value)} to float`);
    }
    return converted;
  }
  function getValue(obj, key) {
    if (obj === null || obj === void 0) {
      return NOT_FOUND;
    }
    if (obj instanceof Map) {
      if (obj.has(key)) {
        return obj.get(key);
      }
      const intKey = toIntegerKey(key);
      if (intKey !== null && obj.has(intKey)) {
        return obj.get(intKey);
      }
      return NOT_FOUND;
    }
    if (typeof obj === "object" || typeof obj === "function") {
      if (key in obj) {
        return obj[key];
      }
      const intKey = toIntegerKey(key);
      if (intKey !== null && intKey in obj) {
        return obj[intKey];
      }
    }
    return NOT_FOUND;
  }
  var SmartDict = class {
    constructor(data, { partial = false, iterations = 1 } = {}) {
      if (iterations <= 0) {
        throw new Error("`iterations` must be greater than 0");
      }
      this.source = data;
      this.cache = /* @__PURE__ */ new Map();
      this.partial = partial || iterations > 1;
      this.iterations = iterations;
    }
    parse({ returnComponent = false } = {}) {
      let iterSource = this.source;
      let componentValue = null;
      for (let count = 0; count < this.iterations; count += 1) {
        this.source = iterSource;
        this.cache.clear();
        componentValue = this.deepResolve(iterSource);
        iterSource = componentValue.final;
      }
      if (componentValue === null) {
        throw new Error("source is not parsed yet");
      }
      this.analyse(componentValue);
      return returnComponent ? componentValue : iterSource;
    }
    deepResolve(obj, path = new Path()) {
      if (isString(obj)) {
        return this.resolveString(String(obj), path);
      }
      const finalComponentValue = new ComponentWithValue(path);
      if (Array.isArray(obj)) {
        const next = obj.map((item, index) => {
          const componentValue = this.deepResolve(item, path.child(index));
          finalComponentValue.listPush(componentValue);
          return componentValue.final;
        });
        return finalComponentValue.finalize(next);
      }
      if (isPlainObject(obj)) {
        const next = {};
        for (const [key, value] of Object.entries(obj)) {
          const keyComponentValue = this.deepResolve(key, path.child("<k>").child(key));
          finalComponentValue.dictPush(keyComponentValue);
          if (!isKeyLike(keyComponentValue.final)) {
            throw new TypeError(`Key object is not usable as an object key: ${String(keyComponentValue.final)}`);
          }
          const nextKey = toPropertyKey(keyComponentValue.final);
          if (Object.prototype.hasOwnProperty.call(next, nextKey)) {
            throw new Error(`Duplicate key: ${String(nextKey)}`);
          }
          const valueComponentValue = this.deepResolve(value, path.child(nextKey));
          finalComponentValue.dictPush(valueComponentValue);
          next[nextKey] = valueComponentValue.final;
        }
        return finalComponentValue.finalize(next);
      }
      return finalComponentValue.finalize(obj);
    }
    collectUnresolved(componentValue) {
      const unresolved = [];
      for (const item of componentValue.unresolved) {
        if (item instanceof ComponentWithValue) {
          unresolved.push(...this.collectUnresolved(item));
        } else if (item instanceof RefStringStatus) {
          unresolved.push(new UnresolvedReference(componentValue.path, item.refString));
        } else {
          throw new Error(`Unexpected unresolved entry: ${String(item)}`);
        }
      }
      return unresolved;
    }
    analyse(componentValue) {
      if (this.partial || !componentValue.hasUnresolved) {
        return;
      }
      throw new ReferenceNotFoundError(this.collectUnresolved(componentValue));
    }
    splitRefExpression(refString) {
      const [ref, fallback] = splitTopLevelOnce(refString, ":");
      return [ref, fallback === null ? UNSET_VALUE : fallback];
    }
    parsePipelineExpression(expression) {
      const pieces = splitTopLevel(String(expression), "|");
      const [refString, defaultString] = this.splitRefExpression(pieces[0]);
      const stages = pieces.slice(1).map((rawStage) => {
        const [stageName, stageArg] = splitTopLevelOnce(rawStage, ":");
        const trimmed = stageName.trim();
        if (!trimmed) {
          throw new Error(`Invalid pipeline stage in expression: ${expression}`);
        }
        return new PipelineStage(trimmed, stageArg === null ? null : parseStageArg(stageArg.trim()));
      });
      return [refString, defaultString, stages];
    }
    applyPipelineStage(value, stage, path) {
      try {
        switch (stage.name) {
          case "int":
            return stageInt(value);
          case "float":
            return stageFloat(value);
          case "bool":
            return stageBool(value);
          case "json":
            return isString(value) ? JSON.parse(String(value)) : value;
          case "lower":
            return String(value).toLowerCase();
          case "upper":
            return String(value).toUpperCase();
          case "strip":
            return String(value).trim();
          case "slug":
            return stageSlug(value);
          default:
            throw new PipelineStageError(stage.name, value, path.toString(), "unknown stage");
        }
      } catch (error) {
        if (error instanceof PipelineStageError) {
          throw error;
        }
        throw new PipelineStageError(stage.name, value, path.toString(), error.message);
      }
    }
    applyPipelineStages(value, stages, path) {
      let current = value;
      for (const stage of stages) {
        current = this.applyPipelineStage(current, stage, path);
      }
      return current;
    }
    resolvePathComponent(value, path, isLeaf) {
      if (isLeaf) {
        return this.deepResolve(value, path).final;
      }
      let current = value;
      while (isString(current)) {
        const resolved = this.deepResolve(String(current), path).final;
        if (resolved === current) {
          break;
        }
        current = resolved;
      }
      return current;
    }
    resolveRefString(refString, defaultString, path) {
      let defaultValue = UNSET_VALUE;
      if (defaultString !== UNSET_VALUE) {
        if (isString(defaultString) && String(defaultString).includes("${")) {
          defaultValue = this.resolveString(String(defaultString), path, true).final;
        } else {
          defaultValue = parseDefaultValue(defaultString);
        }
      }
      if (this.cache.has(refString)) {
        const status2 = this.cache.get(refString);
        if (status2.isResolving) {
          throw new CircularReferenceError(refString);
        }
        return new RefStringStatusWithValue(status2, defaultValue);
      }
      const status = new RefStringStatus(refString);
      this.cache.set(refString, status);
      const keys = refString ? String(refString).split(".") : [];
      let currentValue = this.source;
      let currentPath = path;
      const lastIndex = keys.length - 1;
      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        currentPath = currentPath.child(key);
        currentValue = getValue(currentValue, key);
        if (currentValue === NOT_FOUND) {
          break;
        }
        currentValue = this.resolvePathComponent(currentValue, currentPath, index === lastIndex);
      }
      if (currentValue === NOT_FOUND) {
        status.unresolve();
      } else {
        status.resolve(currentValue);
      }
      return new RefStringStatusWithValue(status, defaultValue);
    }
    resolveReferenceExpression(expression, path) {
      const [refString, defaultString, stages] = this.parsePipelineExpression(expression);
      const refValue = this.resolveRefString(refString, defaultString, path);
      if (refValue.isUnset) {
        return refValue;
      }
      const finalValue = this.applyPipelineStages(refValue.value, stages, path);
      return new RefStringStatusWithValue(refValue.status, finalValue, true);
    }
    resolveString(obj, path, rawSingleRef = false) {
      const componentValue = new ComponentWithValue(path);
      const parts = parseRefString(obj);
      if (parts.length === 1 && parts[0].full) {
        const refString = this.resolveString(parts[0].part, path, true).final;
        const refValue = this.resolveReferenceExpression(String(refString), path.child("$"));
        return componentValue.push(refValue).finalize(refValue.isUnset ? obj : refValue.value);
      }
      if (parts.length === 1 && parts[0].partial) {
        const refString = this.resolveString(parts[0].part, path, true).final;
        const refValue = this.resolveReferenceExpression(String(refString), path.child("$"));
        const current = refValue.isUnset ? `\${${refString}}` : refValue.value;
        componentValue.push(refValue);
        if (rawSingleRef || obj === `\${${parts[0].part}}`) {
          return componentValue.finalize(current);
        }
        return componentValue.finalize(String(current));
      }
      const resultParts = [];
      for (const part of parts) {
        if (!part.partial) {
          resultParts.push(part.part);
          continue;
        }
        const refString = this.resolveString(part.part, path, true).final;
        const refValue = this.resolveReferenceExpression(String(refString), path.child("$"));
        const current = refValue.isUnset ? `\${${refString}}` : refValue.value;
        componentValue.push(refValue);
        resultParts.push(stringifyResolvedPart(current, { forRef: rawSingleRef }));
      }
      return componentValue.finalize(resultParts.join(""));
    }
  };
  function parse(obj) {
    return new SmartDict(obj).parse();
  }
  function partialParse(obj) {
    return new SmartDict(obj, { partial: true }).parse();
  }
  function iterativeParse(obj, iterations = 1) {
    return new SmartDict(obj, { partial: true, iterations }).parse();
  }
  var partial_parse = partialParse;
  var iterative_parse = iterativeParse;
  var version = "0.5.0";
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=smartdict.browser.js.map
