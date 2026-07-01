import { access, readFile, mkdir, writeFile, rename } from "node:fs/promises";
import require$$2, { dirname, join } from "node:path";
import require$$0$4 from "node:os";
import require$$2$1 from "pino-std-serializers";
import require$$0 from "@pinojs/redact";
import require$$0$3 from "node:events";
import require$$0$2 from "node:diagnostics_channel";
import require$$1 from "quick-format-unescaped";
import require$$3$1 from "sonic-boom";
import require$$4 from "on-exit-leak-free";
import require$$6 from "worker_threads";
import require$$0$1 from "module";
import require$$3 from "atomic-sleep";
import require$$5 from "thread-stream";
import require$$7 from "safe-stable-stringify";
import require$$0$5 from "events";
import require$$3$2 from "uuid";
import require$$1$1 from "path";
import require$$2$2 from "child_process";
import { randomBytes } from "node:crypto";
const pluginState = {
  ctx: null,
  config: {}
};
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var pino$1 = { exports: {} };
var caller;
var hasRequiredCaller;
function requireCaller() {
  if (hasRequiredCaller) return caller;
  hasRequiredCaller = 1;
  function noOpPrepareStackTrace(_, stack) {
    return stack;
  }
  caller = function getCallers() {
    const originalPrepare = Error.prepareStackTrace;
    Error.prepareStackTrace = noOpPrepareStackTrace;
    const stack = new Error().stack;
    Error.prepareStackTrace = originalPrepare;
    if (!Array.isArray(stack)) {
      return void 0;
    }
    const entries = stack.slice(2);
    const fileNames = [];
    for (const entry of entries) {
      if (!entry) {
        continue;
      }
      fileNames.push(entry.getFileName());
    }
    return fileNames;
  };
  return caller;
}
var symbols;
var hasRequiredSymbols;
function requireSymbols() {
  if (hasRequiredSymbols) return symbols;
  hasRequiredSymbols = 1;
  const setLevelSym = Symbol("pino.setLevel");
  const getLevelSym = Symbol("pino.getLevel");
  const levelValSym = Symbol("pino.levelVal");
  const levelCompSym = Symbol("pino.levelComp");
  const useLevelLabelsSym = Symbol("pino.useLevelLabels");
  const useOnlyCustomLevelsSym = Symbol("pino.useOnlyCustomLevels");
  const mixinSym = Symbol("pino.mixin");
  const lsCacheSym = Symbol("pino.lsCache");
  const chindingsSym = Symbol("pino.chindings");
  const asJsonSym = Symbol("pino.asJson");
  const writeSym = Symbol("pino.write");
  const redactFmtSym = Symbol("pino.redactFmt");
  const timeSym = Symbol("pino.time");
  const timeSliceIndexSym = Symbol("pino.timeSliceIndex");
  const streamSym = Symbol("pino.stream");
  const stringifySym = Symbol("pino.stringify");
  const stringifySafeSym = Symbol("pino.stringifySafe");
  const stringifiersSym = Symbol("pino.stringifiers");
  const endSym = Symbol("pino.end");
  const formatOptsSym = Symbol("pino.formatOpts");
  const messageKeySym = Symbol("pino.messageKey");
  const errorKeySym = Symbol("pino.errorKey");
  const nestedKeySym = Symbol("pino.nestedKey");
  const nestedKeyStrSym = Symbol("pino.nestedKeyStr");
  const mixinMergeStrategySym = Symbol("pino.mixinMergeStrategy");
  const msgPrefixSym = Symbol("pino.msgPrefix");
  const wildcardFirstSym = Symbol("pino.wildcardFirst");
  const serializersSym = Symbol.for("pino.serializers");
  const formattersSym = Symbol.for("pino.formatters");
  const hooksSym = Symbol.for("pino.hooks");
  const needsMetadataGsym = Symbol.for("pino.metadata");
  symbols = {
    setLevelSym,
    getLevelSym,
    levelValSym,
    levelCompSym,
    useLevelLabelsSym,
    mixinSym,
    lsCacheSym,
    chindingsSym,
    asJsonSym,
    writeSym,
    serializersSym,
    redactFmtSym,
    timeSym,
    timeSliceIndexSym,
    streamSym,
    stringifySym,
    stringifySafeSym,
    stringifiersSym,
    endSym,
    formatOptsSym,
    messageKeySym,
    errorKeySym,
    nestedKeySym,
    wildcardFirstSym,
    needsMetadataGsym,
    useOnlyCustomLevelsSym,
    formattersSym,
    hooksSym,
    nestedKeyStrSym,
    mixinMergeStrategySym,
    msgPrefixSym
  };
  return symbols;
}
var redaction_1;
var hasRequiredRedaction;
function requireRedaction() {
  if (hasRequiredRedaction) return redaction_1;
  hasRequiredRedaction = 1;
  const Redact = require$$0;
  const { redactFmtSym, wildcardFirstSym } = requireSymbols();
  const rx = /[^.[\]]+|\[([^[\]]*?)\]/g;
  const CENSOR = "[Redacted]";
  const strict = false;
  function redaction(opts, serialize) {
    const { paths, censor, remove } = handle(opts);
    const shape = paths.reduce((o, str) => {
      rx.lastIndex = 0;
      const first = rx.exec(str);
      const next = rx.exec(str);
      let ns = first[1] !== void 0 ? first[1].replace(/^(?:"|'|`)(.*)(?:"|'|`)$/, "$1") : first[0];
      if (ns === "*") {
        ns = wildcardFirstSym;
      }
      if (next === null) {
        o[ns] = null;
        return o;
      }
      if (o[ns] === null) {
        return o;
      }
      const { index } = next;
      const nextPath = `${str.substr(index, str.length - 1)}`;
      o[ns] = o[ns] || [];
      if (ns !== wildcardFirstSym && o[ns].length === 0) {
        o[ns].push(...o[wildcardFirstSym] || []);
      }
      if (ns === wildcardFirstSym) {
        Object.keys(o).forEach(function(k) {
          if (o[k]) {
            o[k].push(nextPath);
          }
        });
      }
      o[ns].push(nextPath);
      return o;
    }, {});
    const result = {
      [redactFmtSym]: Redact({ paths, censor, serialize, strict, remove })
    };
    const topCensor = (...args) => {
      return typeof censor === "function" ? serialize(censor(...args)) : serialize(censor);
    };
    return [...Object.keys(shape), ...Object.getOwnPropertySymbols(shape)].reduce((o, k) => {
      if (shape[k] === null) {
        o[k] = (value) => topCensor(value, [k]);
      } else {
        const wrappedCensor = typeof censor === "function" ? (value, path) => {
          return censor(value, [k, ...path]);
        } : censor;
        o[k] = Redact({
          paths: shape[k],
          censor: wrappedCensor,
          serialize,
          strict,
          remove
        });
      }
      return o;
    }, result);
  }
  function handle(opts) {
    if (Array.isArray(opts)) {
      opts = { paths: opts, censor: CENSOR };
      return opts;
    }
    let { paths, censor = CENSOR, remove } = opts;
    if (Array.isArray(paths) === false) {
      throw Error("pino – redact must contain an array of strings");
    }
    if (remove === true) censor = void 0;
    return { paths, censor, remove };
  }
  redaction_1 = redaction;
  return redaction_1;
}
var time;
var hasRequiredTime;
function requireTime() {
  if (hasRequiredTime) return time;
  hasRequiredTime = 1;
  const nullTime = () => "";
  const epochTime = () => `,"time":${Date.now()}`;
  const unixTime = () => `,"time":${Math.round(Date.now() / 1e3)}`;
  const isoTime = () => `,"time":"${new Date(Date.now()).toISOString()}"`;
  const NS_PER_MS = 1000000n;
  const NS_PER_SEC = 1000000000n;
  const startWallTimeNs = BigInt(Date.now()) * NS_PER_MS;
  const startHrTime = process.hrtime.bigint();
  const isoTimeNano = () => {
    const elapsedNs = process.hrtime.bigint() - startHrTime;
    const currentTimeNs = startWallTimeNs + elapsedNs;
    const secondsSinceEpoch = currentTimeNs / NS_PER_SEC;
    const nanosWithinSecond = currentTimeNs % NS_PER_SEC;
    const msSinceEpoch = Number(secondsSinceEpoch * 1000n + nanosWithinSecond / 1000000n);
    const date = new Date(msSinceEpoch);
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const day = date.getUTCDate().toString().padStart(2, "0");
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    const seconds = date.getUTCSeconds().toString().padStart(2, "0");
    return `,"time":"${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${nanosWithinSecond.toString().padStart(9, "0")}Z"`;
  };
  time = { nullTime, epochTime, unixTime, isoTime, isoTimeNano };
  return time;
}
var transport_1;
var hasRequiredTransport;
function requireTransport() {
  if (hasRequiredTransport) return transport_1;
  hasRequiredTransport = 1;
  const { createRequire } = require$$0$1;
  const getCallers = requireCaller();
  const { join: join2, isAbsolute, sep } = require$$2;
  const sleep = require$$3;
  const onExit = require$$4;
  const ThreadStream = require$$5;
  function setupOnExit(stream) {
    onExit.register(stream, autoEnd);
    onExit.registerBeforeExit(stream, flush);
    stream.on("close", function() {
      onExit.unregister(stream);
    });
  }
  function buildStream(filename, workerData, workerOpts, sync) {
    const stream = new ThreadStream({
      filename,
      workerData,
      workerOpts,
      sync
    });
    stream.on("ready", onReady);
    stream.on("close", function() {
      process.removeListener("exit", onExit2);
    });
    process.on("exit", onExit2);
    function onReady() {
      process.removeListener("exit", onExit2);
      stream.unref();
      if (workerOpts.autoEnd !== false) {
        setupOnExit(stream);
      }
    }
    function onExit2() {
      if (stream.closed) {
        return;
      }
      stream.flushSync();
      sleep(100);
      stream.end();
    }
    return stream;
  }
  function autoEnd(stream) {
    stream.ref();
    stream.flushSync();
    stream.end();
    stream.once("close", function() {
      stream.unref();
    });
  }
  function flush(stream) {
    stream.flushSync();
  }
  function transport(fullOptions) {
    const { pipeline, targets, levels: levels2, dedupe, worker = {}, caller: caller2 = getCallers(), sync = false } = fullOptions;
    const options = {
      ...fullOptions.options
    };
    const callers = typeof caller2 === "string" ? [caller2] : caller2;
    const bundlerOverrides = "__bundlerPathsOverrides" in globalThis ? globalThis.__bundlerPathsOverrides : {};
    let target = fullOptions.target;
    if (target && targets) {
      throw new Error("only one of target or targets can be specified");
    }
    if (targets) {
      target = bundlerOverrides["pino-worker"] || join2(__dirname, "worker.js");
      options.targets = targets.filter((dest) => dest.target).map((dest) => {
        return {
          ...dest,
          target: fixTarget(dest.target)
        };
      });
      options.pipelines = targets.filter((dest) => dest.pipeline).map((dest) => {
        return dest.pipeline.map((t) => {
          return {
            ...t,
            level: dest.level,
            // duplicate the pipeline `level` property defined in the upper level
            target: fixTarget(t.target)
          };
        });
      });
    } else if (pipeline) {
      target = bundlerOverrides["pino-worker"] || join2(__dirname, "worker.js");
      options.pipelines = [pipeline.map((dest) => {
        return {
          ...dest,
          target: fixTarget(dest.target)
        };
      })];
    }
    if (levels2) {
      options.levels = levels2;
    }
    if (dedupe) {
      options.dedupe = dedupe;
    }
    options.pinoWillSendConfig = true;
    return buildStream(fixTarget(target), options, worker, sync);
    function fixTarget(origin) {
      origin = bundlerOverrides[origin] || origin;
      if (isAbsolute(origin) || origin.indexOf("file://") === 0) {
        return origin;
      }
      if (origin === "pino/file") {
        return join2(__dirname, "..", "file.js");
      }
      let fixTarget2;
      for (const filePath of callers) {
        try {
          const context = filePath === "node:repl" ? process.cwd() + sep : filePath;
          fixTarget2 = createRequire(context).resolve(origin);
          break;
        } catch (err) {
          continue;
        }
      }
      if (!fixTarget2) {
        throw new Error(`unable to determine transport target for "${origin}"`);
      }
      return fixTarget2;
    }
  }
  transport_1 = transport;
  return transport_1;
}
var tools;
var hasRequiredTools;
function requireTools() {
  if (hasRequiredTools) return tools;
  hasRequiredTools = 1;
  const diagChan = require$$0$2;
  const format = require$$1;
  const { mapHttpRequest, mapHttpResponse } = require$$2$1;
  const SonicBoom = require$$3$1;
  const onExit = require$$4;
  const {
    lsCacheSym,
    chindingsSym,
    writeSym,
    serializersSym,
    formatOptsSym,
    endSym,
    stringifiersSym,
    stringifySym,
    stringifySafeSym,
    wildcardFirstSym,
    nestedKeySym,
    formattersSym,
    messageKeySym,
    errorKeySym,
    nestedKeyStrSym,
    msgPrefixSym
  } = requireSymbols();
  const { isMainThread } = require$$6;
  const transport = requireTransport();
  let asJsonChan;
  if (typeof diagChan.tracingChannel === "function") {
    asJsonChan = diagChan.tracingChannel("pino_asJson");
  } else {
    asJsonChan = {
      hasSubscribers: false,
      traceSync(fn, store, thisArg, ...args) {
        return fn.call(thisArg, ...args);
      }
    };
  }
  function noop() {
  }
  function genLog(level, hook) {
    if (!hook) return LOG;
    return function hookWrappedLog(...args) {
      hook.call(this, args, LOG, level);
    };
    function LOG(o, ...n) {
      if (typeof o === "object") {
        let msg = o;
        if (o !== null) {
          if (o.method && o.headers && o.socket) {
            o = mapHttpRequest(o);
          } else if (typeof o.setHeader === "function") {
            o = mapHttpResponse(o);
          }
        }
        let formatParams;
        if (msg === null && n.length === 0) {
          formatParams = [null];
        } else {
          msg = n.shift();
          formatParams = n;
        }
        if (typeof this[msgPrefixSym] === "string" && msg !== void 0 && msg !== null) {
          msg = this[msgPrefixSym] + msg;
        }
        this[writeSym](o, format(msg, formatParams, this[formatOptsSym]), level);
      } else {
        let msg = o === void 0 ? n.shift() : o;
        if (typeof this[msgPrefixSym] === "string" && msg !== void 0 && msg !== null) {
          msg = this[msgPrefixSym] + msg;
        }
        this[writeSym](null, format(msg, n, this[formatOptsSym]), level);
      }
    }
  }
  function asString(str) {
    let result = "";
    let last = 0;
    let found = false;
    let point = 255;
    const l = str.length;
    if (l > 100) {
      return JSON.stringify(str);
    }
    for (var i = 0; i < l && point >= 32; i++) {
      point = str.charCodeAt(i);
      if (point === 34 || point === 92) {
        result += str.slice(last, i) + "\\";
        last = i;
        found = true;
      }
    }
    if (!found) {
      result = str;
    } else {
      result += str.slice(last);
    }
    return point < 32 ? JSON.stringify(str) : '"' + result + '"';
  }
  function asJson(obj, msg, num, time2) {
    if (asJsonChan.hasSubscribers === false) {
      return _asJson.call(this, obj, msg, num, time2);
    }
    const store = { instance: this, arguments };
    return asJsonChan.traceSync(_asJson, store, this, obj, msg, num, time2);
  }
  function _asJson(obj, msg, num, time2) {
    const stringify2 = this[stringifySym];
    const stringifySafe = this[stringifySafeSym];
    const stringifiers = this[stringifiersSym];
    const end = this[endSym];
    const chindings = this[chindingsSym];
    const serializers = this[serializersSym];
    const formatters = this[formattersSym];
    const messageKey = this[messageKeySym];
    const errorKey = this[errorKeySym];
    let data = this[lsCacheSym][num] + time2;
    data = data + chindings;
    let value;
    if (formatters.log) {
      obj = formatters.log(obj);
    }
    const wildcardStringifier = stringifiers[wildcardFirstSym];
    let propStr = "";
    for (const key in obj) {
      value = obj[key];
      if (Object.prototype.hasOwnProperty.call(obj, key) && value !== void 0) {
        if (serializers[key]) {
          value = serializers[key](value);
        } else if (key === errorKey && serializers.err) {
          value = serializers.err(value);
        }
        const stringifier = stringifiers[key] || wildcardStringifier;
        switch (typeof value) {
          case "undefined":
          case "function":
            continue;
          case "number":
            if (Number.isFinite(value) === false) {
              value = null;
            }
          // this case explicitly falls through to the next one
          case "boolean":
            if (stringifier) value = stringifier(value);
            break;
          case "string":
            value = (stringifier || asString)(value);
            break;
          default:
            value = (stringifier || stringify2)(value, stringifySafe);
        }
        if (value === void 0) continue;
        const strKey = asString(key);
        propStr += "," + strKey + ":" + value;
      }
    }
    let msgStr = "";
    if (msg !== void 0) {
      value = serializers[messageKey] ? serializers[messageKey](msg) : msg;
      const stringifier = stringifiers[messageKey] || wildcardStringifier;
      switch (typeof value) {
        case "function":
          break;
        case "number":
          if (Number.isFinite(value) === false) {
            value = null;
          }
        // this case explicitly falls through to the next one
        case "boolean":
          if (stringifier) value = stringifier(value);
          msgStr = ',"' + messageKey + '":' + value;
          break;
        case "string":
          value = (stringifier || asString)(value);
          msgStr = ',"' + messageKey + '":' + value;
          break;
        default:
          value = (stringifier || stringify2)(value, stringifySafe);
          msgStr = ',"' + messageKey + '":' + value;
      }
    }
    if (this[nestedKeySym] && propStr) {
      return data + this[nestedKeyStrSym] + propStr.slice(1) + "}" + msgStr + end;
    } else {
      return data + propStr + msgStr + end;
    }
  }
  function asChindings(instance, bindings) {
    let value;
    let data = instance[chindingsSym];
    const stringify2 = instance[stringifySym];
    const stringifySafe = instance[stringifySafeSym];
    const stringifiers = instance[stringifiersSym];
    const wildcardStringifier = stringifiers[wildcardFirstSym];
    const serializers = instance[serializersSym];
    const formatter = instance[formattersSym].bindings;
    bindings = formatter(bindings);
    for (const key in bindings) {
      value = bindings[key];
      const valid = (key.length < 5 || key !== "level" && key !== "serializers" && key !== "formatters" && key !== "customLevels") && bindings.hasOwnProperty(key) && value !== void 0;
      if (valid === true) {
        value = serializers[key] ? serializers[key](value) : value;
        value = (stringifiers[key] || wildcardStringifier || stringify2)(value, stringifySafe);
        if (value === void 0) continue;
        data += ',"' + key + '":' + value;
      }
    }
    return data;
  }
  function hasBeenTampered(stream) {
    return stream.write !== stream.constructor.prototype.write;
  }
  function buildSafeSonicBoom(opts) {
    const stream = new SonicBoom(opts);
    stream.on("error", filterBrokenPipe);
    if (!opts.sync && isMainThread) {
      onExit.register(stream, autoEnd);
      stream.on("close", function() {
        onExit.unregister(stream);
      });
    }
    return stream;
    function filterBrokenPipe(err) {
      if (err.code === "EPIPE") {
        stream.write = noop;
        stream.end = noop;
        stream.flushSync = noop;
        stream.destroy = noop;
        return;
      }
      stream.removeListener("error", filterBrokenPipe);
      stream.emit("error", err);
    }
  }
  function autoEnd(stream, eventName) {
    if (stream.destroyed) {
      return;
    }
    if (eventName === "beforeExit") {
      stream.flush();
      stream.on("drain", function() {
        stream.end();
      });
    } else {
      stream.flushSync();
    }
  }
  function createArgsNormalizer(defaultOptions) {
    return function normalizeArgs(instance, caller2, opts = {}, stream) {
      if (typeof opts === "string") {
        stream = buildSafeSonicBoom({ dest: opts });
        opts = {};
      } else if (typeof stream === "string") {
        if (opts && opts.transport) {
          throw Error("only one of option.transport or stream can be specified");
        }
        stream = buildSafeSonicBoom({ dest: stream });
      } else if (opts instanceof SonicBoom || opts.writable || opts._writableState) {
        stream = opts;
        opts = {};
      } else if (opts.transport) {
        if (opts.transport instanceof SonicBoom || opts.transport.writable || opts.transport._writableState) {
          throw Error("option.transport do not allow stream, please pass to option directly. e.g. pino(transport)");
        }
        if (opts.transport.targets && opts.transport.targets.length && opts.formatters && typeof opts.formatters.level === "function") {
          throw Error("option.transport.targets do not allow custom level formatters");
        }
        let customLevels;
        if (opts.customLevels) {
          customLevels = opts.useOnlyCustomLevels ? opts.customLevels : Object.assign({}, opts.levels, opts.customLevels);
        }
        stream = transport({ caller: caller2, ...opts.transport, levels: customLevels });
      }
      opts = Object.assign({}, defaultOptions, opts);
      opts.serializers = Object.assign({}, defaultOptions.serializers, opts.serializers);
      opts.formatters = Object.assign({}, defaultOptions.formatters, opts.formatters);
      if (opts.prettyPrint) {
        throw new Error("prettyPrint option is no longer supported, see the pino-pretty package (https://github.com/pinojs/pino-pretty)");
      }
      const { enabled, onChild } = opts;
      if (enabled === false) opts.level = "silent";
      if (!onChild) opts.onChild = noop;
      if (!stream) {
        if (!hasBeenTampered(process.stdout)) {
          stream = buildSafeSonicBoom({ fd: process.stdout.fd || 1 });
        } else {
          stream = process.stdout;
        }
      }
      return { opts, stream };
    };
  }
  function stringify(obj, stringifySafeFn) {
    try {
      return JSON.stringify(obj);
    } catch (_) {
      try {
        const stringify2 = stringifySafeFn || this[stringifySafeSym];
        return stringify2(obj);
      } catch (_2) {
        return '"[unable to serialize, circular reference is too complex to analyze]"';
      }
    }
  }
  function buildFormatters(level, bindings, log2) {
    return {
      level,
      bindings,
      log: log2
    };
  }
  function normalizeDestFileDescriptor(destination) {
    const fd = Number(destination);
    if (typeof destination === "string" && Number.isFinite(fd)) {
      return fd;
    }
    if (destination === void 0) {
      return 1;
    }
    return destination;
  }
  tools = {
    noop,
    buildSafeSonicBoom,
    asChindings,
    asJson,
    genLog,
    createArgsNormalizer,
    stringify,
    buildFormatters,
    normalizeDestFileDescriptor
  };
  return tools;
}
var constants;
var hasRequiredConstants;
function requireConstants() {
  if (hasRequiredConstants) return constants;
  hasRequiredConstants = 1;
  const DEFAULT_LEVELS = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60
  };
  const SORTING_ORDER = {
    ASC: "ASC",
    DESC: "DESC"
  };
  constants = {
    DEFAULT_LEVELS,
    SORTING_ORDER
  };
  return constants;
}
var levels;
var hasRequiredLevels;
function requireLevels() {
  if (hasRequiredLevels) return levels;
  hasRequiredLevels = 1;
  const {
    lsCacheSym,
    levelValSym,
    useOnlyCustomLevelsSym,
    streamSym,
    formattersSym,
    hooksSym,
    levelCompSym
  } = requireSymbols();
  const { noop, genLog } = requireTools();
  const { DEFAULT_LEVELS, SORTING_ORDER } = requireConstants();
  const levelMethods = {
    fatal: (hook) => {
      const logFatal = genLog(DEFAULT_LEVELS.fatal, hook);
      return function(...args) {
        const stream = this[streamSym];
        logFatal.call(this, ...args);
        if (typeof stream.flushSync === "function") {
          try {
            stream.flushSync();
          } catch (e) {
          }
        }
      };
    },
    error: (hook) => genLog(DEFAULT_LEVELS.error, hook),
    warn: (hook) => genLog(DEFAULT_LEVELS.warn, hook),
    info: (hook) => genLog(DEFAULT_LEVELS.info, hook),
    debug: (hook) => genLog(DEFAULT_LEVELS.debug, hook),
    trace: (hook) => genLog(DEFAULT_LEVELS.trace, hook)
  };
  const nums = Object.keys(DEFAULT_LEVELS).reduce((o, k) => {
    o[DEFAULT_LEVELS[k]] = k;
    return o;
  }, {});
  const initialLsCache = Object.keys(nums).reduce((o, k) => {
    o[k] = '{"level":' + Number(k);
    return o;
  }, {});
  function genLsCache(instance) {
    const formatter = instance[formattersSym].level;
    const { labels } = instance.levels;
    const cache = {};
    for (const label in labels) {
      const level = formatter(labels[label], Number(label));
      cache[label] = JSON.stringify(level).slice(0, -1);
    }
    instance[lsCacheSym] = cache;
    return instance;
  }
  function isStandardLevel(level, useOnlyCustomLevels) {
    if (useOnlyCustomLevels) {
      return false;
    }
    switch (level) {
      case "fatal":
      case "error":
      case "warn":
      case "info":
      case "debug":
      case "trace":
        return true;
      default:
        return false;
    }
  }
  function setLevel(level) {
    const { labels, values } = this.levels;
    if (typeof level === "number") {
      if (labels[level] === void 0) throw Error("unknown level value" + level);
      level = labels[level];
    }
    if (values[level] === void 0) throw Error("unknown level " + level);
    const preLevelVal = this[levelValSym];
    const levelVal = this[levelValSym] = values[level];
    const useOnlyCustomLevelsVal = this[useOnlyCustomLevelsSym];
    const levelComparison = this[levelCompSym];
    const hook = this[hooksSym].logMethod;
    for (const key in values) {
      if (levelComparison(values[key], levelVal) === false) {
        this[key] = noop;
        continue;
      }
      this[key] = isStandardLevel(key, useOnlyCustomLevelsVal) ? levelMethods[key](hook) : genLog(values[key], hook);
    }
    this.emit(
      "level-change",
      level,
      levelVal,
      labels[preLevelVal],
      preLevelVal,
      this
    );
  }
  function getLevel(level) {
    const { levels: levels2, levelVal } = this;
    return levels2 && levels2.labels ? levels2.labels[levelVal] : "";
  }
  function isLevelEnabled(logLevel) {
    const { values } = this.levels;
    const logLevelVal = values[logLevel];
    return logLevelVal !== void 0 && this[levelCompSym](logLevelVal, this[levelValSym]);
  }
  function compareLevel(direction, current, expected) {
    if (direction === SORTING_ORDER.DESC) {
      return current <= expected;
    }
    return current >= expected;
  }
  function genLevelComparison(levelComparison) {
    if (typeof levelComparison === "string") {
      return compareLevel.bind(null, levelComparison);
    }
    return levelComparison;
  }
  function mappings(customLevels = null, useOnlyCustomLevels = false) {
    const customNums = customLevels ? Object.keys(customLevels).reduce((o, k) => {
      o[customLevels[k]] = k;
      return o;
    }, {}) : null;
    const labels = Object.assign(
      Object.create(Object.prototype, { Infinity: { value: "silent" } }),
      useOnlyCustomLevels ? null : nums,
      customNums
    );
    const values = Object.assign(
      Object.create(Object.prototype, { silent: { value: Infinity } }),
      useOnlyCustomLevels ? null : DEFAULT_LEVELS,
      customLevels
    );
    return { labels, values };
  }
  function assertDefaultLevelFound(defaultLevel, customLevels, useOnlyCustomLevels) {
    if (typeof defaultLevel === "number") {
      const values = [].concat(
        Object.keys(customLevels || {}).map((key) => customLevels[key]),
        useOnlyCustomLevels ? [] : Object.keys(nums).map((level) => +level),
        Infinity
      );
      if (!values.includes(defaultLevel)) {
        throw Error(`default level:${defaultLevel} must be included in custom levels`);
      }
      return;
    }
    const labels = Object.assign(
      Object.create(Object.prototype, { silent: { value: Infinity } }),
      useOnlyCustomLevels ? null : DEFAULT_LEVELS,
      customLevels
    );
    if (!(defaultLevel in labels)) {
      throw Error(`default level:${defaultLevel} must be included in custom levels`);
    }
  }
  function assertNoLevelCollisions(levels2, customLevels) {
    const { labels, values } = levels2;
    for (const k in customLevels) {
      if (k in values) {
        throw Error("levels cannot be overridden");
      }
      if (customLevels[k] in labels) {
        throw Error("pre-existing level values cannot be used for new levels");
      }
    }
  }
  function assertLevelComparison(levelComparison) {
    if (typeof levelComparison === "function") {
      return;
    }
    if (typeof levelComparison === "string" && Object.values(SORTING_ORDER).includes(levelComparison)) {
      return;
    }
    throw new Error('Levels comparison should be one of "ASC", "DESC" or "function" type');
  }
  levels = {
    initialLsCache,
    genLsCache,
    levelMethods,
    getLevel,
    setLevel,
    isLevelEnabled,
    mappings,
    assertNoLevelCollisions,
    assertDefaultLevelFound,
    genLevelComparison,
    assertLevelComparison
  };
  return levels;
}
var meta;
var hasRequiredMeta;
function requireMeta() {
  if (hasRequiredMeta) return meta;
  hasRequiredMeta = 1;
  meta = { version: "9.14.0" };
  return meta;
}
var proto;
var hasRequiredProto;
function requireProto() {
  if (hasRequiredProto) return proto;
  hasRequiredProto = 1;
  const { EventEmitter } = require$$0$3;
  const {
    lsCacheSym,
    levelValSym,
    setLevelSym,
    getLevelSym,
    chindingsSym,
    parsedChindingsSym,
    mixinSym,
    asJsonSym,
    writeSym,
    mixinMergeStrategySym,
    timeSym,
    timeSliceIndexSym,
    streamSym,
    serializersSym,
    formattersSym,
    errorKeySym,
    messageKeySym,
    useOnlyCustomLevelsSym,
    needsMetadataGsym,
    redactFmtSym,
    stringifySym,
    formatOptsSym,
    stringifiersSym,
    msgPrefixSym,
    hooksSym
  } = requireSymbols();
  const {
    getLevel,
    setLevel,
    isLevelEnabled,
    mappings,
    initialLsCache,
    genLsCache,
    assertNoLevelCollisions
  } = requireLevels();
  const {
    asChindings,
    asJson,
    buildFormatters,
    stringify,
    noop
  } = requireTools();
  const {
    version
  } = requireMeta();
  const redaction = requireRedaction();
  const constructor = class Pino {
  };
  const prototype = {
    constructor,
    child,
    bindings,
    setBindings,
    flush,
    isLevelEnabled,
    version,
    get level() {
      return this[getLevelSym]();
    },
    set level(lvl) {
      this[setLevelSym](lvl);
    },
    get levelVal() {
      return this[levelValSym];
    },
    set levelVal(n) {
      throw Error("levelVal is read-only");
    },
    get msgPrefix() {
      return this[msgPrefixSym];
    },
    get [Symbol.toStringTag]() {
      return "Pino";
    },
    [lsCacheSym]: initialLsCache,
    [writeSym]: write,
    [asJsonSym]: asJson,
    [getLevelSym]: getLevel,
    [setLevelSym]: setLevel
  };
  Object.setPrototypeOf(prototype, EventEmitter.prototype);
  proto = function() {
    return Object.create(prototype);
  };
  const resetChildingsFormatter = (bindings2) => bindings2;
  function child(bindings2, options) {
    if (!bindings2) {
      throw Error("missing bindings for child Pino");
    }
    const serializers = this[serializersSym];
    const formatters = this[formattersSym];
    const instance = Object.create(this);
    if (options == null) {
      if (instance[formattersSym].bindings !== resetChildingsFormatter) {
        instance[formattersSym] = buildFormatters(
          formatters.level,
          resetChildingsFormatter,
          formatters.log
        );
      }
      instance[chindingsSym] = asChindings(instance, bindings2);
      instance[setLevelSym](this.level);
      if (this.onChild !== noop) {
        this.onChild(instance);
      }
      return instance;
    }
    if (options.hasOwnProperty("serializers") === true) {
      instance[serializersSym] = /* @__PURE__ */ Object.create(null);
      for (const k in serializers) {
        instance[serializersSym][k] = serializers[k];
      }
      const parentSymbols = Object.getOwnPropertySymbols(serializers);
      for (var i = 0; i < parentSymbols.length; i++) {
        const ks = parentSymbols[i];
        instance[serializersSym][ks] = serializers[ks];
      }
      for (const bk in options.serializers) {
        instance[serializersSym][bk] = options.serializers[bk];
      }
      const bindingsSymbols = Object.getOwnPropertySymbols(options.serializers);
      for (var bi = 0; bi < bindingsSymbols.length; bi++) {
        const bks = bindingsSymbols[bi];
        instance[serializersSym][bks] = options.serializers[bks];
      }
    } else instance[serializersSym] = serializers;
    if (options.hasOwnProperty("formatters")) {
      const { level, bindings: chindings, log: log2 } = options.formatters;
      instance[formattersSym] = buildFormatters(
        level || formatters.level,
        chindings || resetChildingsFormatter,
        log2 || formatters.log
      );
    } else {
      instance[formattersSym] = buildFormatters(
        formatters.level,
        resetChildingsFormatter,
        formatters.log
      );
    }
    if (options.hasOwnProperty("customLevels") === true) {
      assertNoLevelCollisions(this.levels, options.customLevels);
      instance.levels = mappings(options.customLevels, instance[useOnlyCustomLevelsSym]);
      genLsCache(instance);
    }
    if (typeof options.redact === "object" && options.redact !== null || Array.isArray(options.redact)) {
      instance.redact = options.redact;
      const stringifiers = redaction(instance.redact, stringify);
      const formatOpts = { stringify: stringifiers[redactFmtSym] };
      instance[stringifySym] = stringify;
      instance[stringifiersSym] = stringifiers;
      instance[formatOptsSym] = formatOpts;
    }
    if (typeof options.msgPrefix === "string") {
      instance[msgPrefixSym] = (this[msgPrefixSym] || "") + options.msgPrefix;
    }
    instance[chindingsSym] = asChindings(instance, bindings2);
    const childLevel = options.level || this.level;
    instance[setLevelSym](childLevel);
    this.onChild(instance);
    return instance;
  }
  function bindings() {
    const chindings = this[chindingsSym];
    const chindingsJson = `{${chindings.substr(1)}}`;
    const bindingsFromJson = JSON.parse(chindingsJson);
    delete bindingsFromJson.pid;
    delete bindingsFromJson.hostname;
    return bindingsFromJson;
  }
  function setBindings(newBindings) {
    const chindings = asChindings(this, newBindings);
    this[chindingsSym] = chindings;
    delete this[parsedChindingsSym];
  }
  function defaultMixinMergeStrategy(mergeObject, mixinObject) {
    return Object.assign(mixinObject, mergeObject);
  }
  function write(_obj, msg, num) {
    const t = this[timeSym]();
    const mixin = this[mixinSym];
    const errorKey = this[errorKeySym];
    const messageKey = this[messageKeySym];
    const mixinMergeStrategy = this[mixinMergeStrategySym] || defaultMixinMergeStrategy;
    let obj;
    const streamWriteHook = this[hooksSym].streamWrite;
    if (_obj === void 0 || _obj === null) {
      obj = {};
    } else if (_obj instanceof Error) {
      obj = { [errorKey]: _obj };
      if (msg === void 0) {
        msg = _obj.message;
      }
    } else {
      obj = _obj;
      if (msg === void 0 && _obj[messageKey] === void 0 && _obj[errorKey]) {
        msg = _obj[errorKey].message;
      }
    }
    if (mixin) {
      obj = mixinMergeStrategy(obj, mixin(obj, num, this));
    }
    const s = this[asJsonSym](obj, msg, num, t);
    const stream = this[streamSym];
    if (stream[needsMetadataGsym] === true) {
      stream.lastLevel = num;
      stream.lastObj = obj;
      stream.lastMsg = msg;
      stream.lastTime = t.slice(this[timeSliceIndexSym]);
      stream.lastLogger = this;
    }
    stream.write(streamWriteHook ? streamWriteHook(s) : s);
  }
  function flush(cb) {
    if (cb != null && typeof cb !== "function") {
      throw Error("callback must be a function");
    }
    const stream = this[streamSym];
    if (typeof stream.flush === "function") {
      stream.flush(cb || noop);
    } else if (cb) cb();
  }
  return proto;
}
var multistream_1;
var hasRequiredMultistream;
function requireMultistream() {
  if (hasRequiredMultistream) return multistream_1;
  hasRequiredMultistream = 1;
  const metadata = Symbol.for("pino.metadata");
  const { DEFAULT_LEVELS } = requireConstants();
  const DEFAULT_INFO_LEVEL = DEFAULT_LEVELS.info;
  function multistream(streamsArray, opts) {
    streamsArray = streamsArray || [];
    opts = opts || { dedupe: false };
    const streamLevels = Object.create(DEFAULT_LEVELS);
    streamLevels.silent = Infinity;
    if (opts.levels && typeof opts.levels === "object") {
      Object.keys(opts.levels).forEach((i) => {
        streamLevels[i] = opts.levels[i];
      });
    }
    const res = {
      write,
      add,
      remove,
      emit,
      flushSync,
      end,
      minLevel: 0,
      lastId: 0,
      streams: [],
      clone,
      [metadata]: true,
      streamLevels
    };
    if (Array.isArray(streamsArray)) {
      streamsArray.forEach(add, res);
    } else {
      add.call(res, streamsArray);
    }
    streamsArray = null;
    return res;
    function write(data) {
      let dest;
      const level = this.lastLevel;
      const { streams } = this;
      let recordedLevel = 0;
      let stream;
      for (let i = initLoopVar(streams.length, opts.dedupe); checkLoopVar(i, streams.length, opts.dedupe); i = adjustLoopVar(i, opts.dedupe)) {
        dest = streams[i];
        if (dest.level <= level) {
          if (recordedLevel !== 0 && recordedLevel !== dest.level) {
            break;
          }
          stream = dest.stream;
          if (stream[metadata]) {
            const { lastTime, lastMsg, lastObj, lastLogger } = this;
            stream.lastLevel = level;
            stream.lastTime = lastTime;
            stream.lastMsg = lastMsg;
            stream.lastObj = lastObj;
            stream.lastLogger = lastLogger;
          }
          stream.write(data);
          if (opts.dedupe) {
            recordedLevel = dest.level;
          }
        } else if (!opts.dedupe) {
          break;
        }
      }
    }
    function emit(...args) {
      for (const { stream } of this.streams) {
        if (typeof stream.emit === "function") {
          stream.emit(...args);
        }
      }
    }
    function flushSync() {
      for (const { stream } of this.streams) {
        if (typeof stream.flushSync === "function") {
          stream.flushSync();
        }
      }
    }
    function add(dest) {
      if (!dest) {
        return res;
      }
      const isStream = typeof dest.write === "function" || dest.stream;
      const stream_ = dest.write ? dest : dest.stream;
      if (!isStream) {
        throw Error("stream object needs to implement either StreamEntry or DestinationStream interface");
      }
      const { streams, streamLevels: streamLevels2 } = this;
      let level;
      if (typeof dest.levelVal === "number") {
        level = dest.levelVal;
      } else if (typeof dest.level === "string") {
        level = streamLevels2[dest.level];
      } else if (typeof dest.level === "number") {
        level = dest.level;
      } else {
        level = DEFAULT_INFO_LEVEL;
      }
      const dest_ = {
        stream: stream_,
        level,
        levelVal: void 0,
        id: ++res.lastId
      };
      streams.unshift(dest_);
      streams.sort(compareByLevel);
      this.minLevel = streams[0].level;
      return res;
    }
    function remove(id) {
      const { streams } = this;
      const index = streams.findIndex((s) => s.id === id);
      if (index >= 0) {
        streams.splice(index, 1);
        streams.sort(compareByLevel);
        this.minLevel = streams.length > 0 ? streams[0].level : -1;
      }
      return res;
    }
    function end() {
      for (const { stream } of this.streams) {
        if (typeof stream.flushSync === "function") {
          stream.flushSync();
        }
        stream.end();
      }
    }
    function clone(level) {
      const streams = new Array(this.streams.length);
      for (let i = 0; i < streams.length; i++) {
        streams[i] = {
          level,
          stream: this.streams[i].stream
        };
      }
      return {
        write,
        add,
        remove,
        minLevel: level,
        streams,
        clone,
        emit,
        flushSync,
        [metadata]: true
      };
    }
  }
  function compareByLevel(a, b) {
    return a.level - b.level;
  }
  function initLoopVar(length, dedupe) {
    return dedupe ? length - 1 : 0;
  }
  function adjustLoopVar(i, dedupe) {
    return dedupe ? i - 1 : i + 1;
  }
  function checkLoopVar(i, length, dedupe) {
    return dedupe ? i >= 0 : i < length;
  }
  multistream_1 = multistream;
  return multistream_1;
}
var hasRequiredPino;
function requirePino() {
  if (hasRequiredPino) return pino$1.exports;
  hasRequiredPino = 1;
  const os = require$$0$4;
  const stdSerializers = require$$2$1;
  const caller2 = requireCaller();
  const redaction = requireRedaction();
  const time2 = requireTime();
  const proto2 = requireProto();
  const symbols2 = requireSymbols();
  const { configure } = require$$7;
  const { assertDefaultLevelFound, mappings, genLsCache, genLevelComparison, assertLevelComparison } = requireLevels();
  const { DEFAULT_LEVELS, SORTING_ORDER } = requireConstants();
  const {
    createArgsNormalizer,
    asChindings,
    buildSafeSonicBoom,
    buildFormatters,
    stringify,
    normalizeDestFileDescriptor,
    noop
  } = requireTools();
  const { version } = requireMeta();
  const {
    chindingsSym,
    redactFmtSym,
    serializersSym,
    timeSym,
    timeSliceIndexSym,
    streamSym,
    stringifySym,
    stringifySafeSym,
    stringifiersSym,
    setLevelSym,
    endSym,
    formatOptsSym,
    messageKeySym,
    errorKeySym,
    nestedKeySym,
    mixinSym,
    levelCompSym,
    useOnlyCustomLevelsSym,
    formattersSym,
    hooksSym,
    nestedKeyStrSym,
    mixinMergeStrategySym,
    msgPrefixSym
  } = symbols2;
  const { epochTime, nullTime } = time2;
  const { pid } = process;
  const hostname = os.hostname();
  const defaultErrorSerializer = stdSerializers.err;
  const defaultOptions = {
    level: "info",
    levelComparison: SORTING_ORDER.ASC,
    levels: DEFAULT_LEVELS,
    messageKey: "msg",
    errorKey: "err",
    nestedKey: null,
    enabled: true,
    base: { pid, hostname },
    serializers: Object.assign(/* @__PURE__ */ Object.create(null), {
      err: defaultErrorSerializer
    }),
    formatters: Object.assign(/* @__PURE__ */ Object.create(null), {
      bindings(bindings) {
        return bindings;
      },
      level(label, number) {
        return { level: number };
      }
    }),
    hooks: {
      logMethod: void 0,
      streamWrite: void 0
    },
    timestamp: epochTime,
    name: void 0,
    redact: null,
    customLevels: null,
    useOnlyCustomLevels: false,
    depthLimit: 5,
    edgeLimit: 100
  };
  const normalize = createArgsNormalizer(defaultOptions);
  const serializers = Object.assign(/* @__PURE__ */ Object.create(null), stdSerializers);
  function pino2(...args) {
    const instance = {};
    const { opts, stream } = normalize(instance, caller2(), ...args);
    if (opts.level && typeof opts.level === "string" && DEFAULT_LEVELS[opts.level.toLowerCase()] !== void 0) opts.level = opts.level.toLowerCase();
    const {
      redact,
      crlf,
      serializers: serializers2,
      timestamp,
      messageKey,
      errorKey,
      nestedKey,
      base,
      name,
      level,
      customLevels,
      levelComparison,
      mixin,
      mixinMergeStrategy,
      useOnlyCustomLevels,
      formatters,
      hooks,
      depthLimit,
      edgeLimit,
      onChild,
      msgPrefix
    } = opts;
    const stringifySafe = configure({
      maximumDepth: depthLimit,
      maximumBreadth: edgeLimit
    });
    const allFormatters = buildFormatters(
      formatters.level,
      formatters.bindings,
      formatters.log
    );
    const stringifyFn = stringify.bind({
      [stringifySafeSym]: stringifySafe
    });
    const stringifiers = redact ? redaction(redact, stringifyFn) : {};
    const formatOpts = redact ? { stringify: stringifiers[redactFmtSym] } : { stringify: stringifyFn };
    const end = "}" + (crlf ? "\r\n" : "\n");
    const coreChindings = asChindings.bind(null, {
      [chindingsSym]: "",
      [serializersSym]: serializers2,
      [stringifiersSym]: stringifiers,
      [stringifySym]: stringify,
      [stringifySafeSym]: stringifySafe,
      [formattersSym]: allFormatters
    });
    let chindings = "";
    if (base !== null) {
      if (name === void 0) {
        chindings = coreChindings(base);
      } else {
        chindings = coreChindings(Object.assign({}, base, { name }));
      }
    }
    const time3 = timestamp instanceof Function ? timestamp : timestamp ? epochTime : nullTime;
    const timeSliceIndex = time3().indexOf(":") + 1;
    if (useOnlyCustomLevels && !customLevels) throw Error("customLevels is required if useOnlyCustomLevels is set true");
    if (mixin && typeof mixin !== "function") throw Error(`Unknown mixin type "${typeof mixin}" - expected "function"`);
    if (msgPrefix && typeof msgPrefix !== "string") throw Error(`Unknown msgPrefix type "${typeof msgPrefix}" - expected "string"`);
    assertDefaultLevelFound(level, customLevels, useOnlyCustomLevels);
    const levels2 = mappings(customLevels, useOnlyCustomLevels);
    if (typeof stream.emit === "function") {
      stream.emit("message", { code: "PINO_CONFIG", config: { levels: levels2, messageKey, errorKey } });
    }
    assertLevelComparison(levelComparison);
    const levelCompFunc = genLevelComparison(levelComparison);
    Object.assign(instance, {
      levels: levels2,
      [levelCompSym]: levelCompFunc,
      [useOnlyCustomLevelsSym]: useOnlyCustomLevels,
      [streamSym]: stream,
      [timeSym]: time3,
      [timeSliceIndexSym]: timeSliceIndex,
      [stringifySym]: stringify,
      [stringifySafeSym]: stringifySafe,
      [stringifiersSym]: stringifiers,
      [endSym]: end,
      [formatOptsSym]: formatOpts,
      [messageKeySym]: messageKey,
      [errorKeySym]: errorKey,
      [nestedKeySym]: nestedKey,
      // protect against injection
      [nestedKeyStrSym]: nestedKey ? `,${JSON.stringify(nestedKey)}:{` : "",
      [serializersSym]: serializers2,
      [mixinSym]: mixin,
      [mixinMergeStrategySym]: mixinMergeStrategy,
      [chindingsSym]: chindings,
      [formattersSym]: allFormatters,
      [hooksSym]: hooks,
      silent: noop,
      onChild,
      [msgPrefixSym]: msgPrefix
    });
    Object.setPrototypeOf(instance, proto2());
    genLsCache(instance);
    instance[setLevelSym](level);
    return instance;
  }
  pino$1.exports = pino2;
  pino$1.exports.destination = (dest = process.stdout.fd) => {
    if (typeof dest === "object") {
      dest.dest = normalizeDestFileDescriptor(dest.dest || process.stdout.fd);
      return buildSafeSonicBoom(dest);
    } else {
      return buildSafeSonicBoom({ dest: normalizeDestFileDescriptor(dest), minLength: 0 });
    }
  };
  pino$1.exports.transport = requireTransport();
  pino$1.exports.multistream = requireMultistream();
  pino$1.exports.levels = mappings();
  pino$1.exports.stdSerializers = serializers;
  pino$1.exports.stdTimeFunctions = Object.assign({}, time2);
  pino$1.exports.symbols = symbols2;
  pino$1.exports.version = version;
  pino$1.exports.default = pino2;
  pino$1.exports.pino = pino2;
  return pino$1.exports;
}
var pinoExports = requirePino();
const pino = /* @__PURE__ */ getDefaultExportFromCjs(pinoExports);
let logger;
function getLogger() {
  if (!logger) {
    logger = pino({
      level: "info",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname"
        }
      }
    });
  }
  return logger;
}
const log = {
  info: (msg, data) => getLogger().info(data || {}, msg),
  warn: (msg, data) => getLogger().warn(data || {}, msg),
  error: (msg, data) => getLogger().error(data || {}, msg),
  debug: (msg, data) => getLogger().debug(data || {}, msg)
};
class JsonStorage {
  filePath;
  defaults;
  cache = null;
  constructor(filePath, defaults) {
    this.filePath = filePath;
    this.defaults = defaults;
  }
  async read() {
    if (this.cache) return this.cache;
    try {
      await access(this.filePath);
      const raw = await readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(raw);
      this.cache = this.mergeDefaults(parsed, this.defaults);
      return this.cache;
    } catch (err) {
      const code = err?.code;
      if (code === "ENOENT") {
        log.warn(`Storage file not found, creating with defaults: ${this.filePath}`);
        await this.write(this.defaults);
        this.cache = { ...this.defaults };
        return this.cache;
      }
      log.error(`Failed to read storage file, using defaults: ${this.filePath}`, { error: String(err) });
      this.cache = { ...this.defaults };
      return this.cache;
    }
  }
  async write(data) {
    const tmpPath = `${this.filePath}.tmp`;
    const dir = dirname(this.filePath);
    await mkdir(dir, { recursive: true });
    const json = JSON.stringify(data, null, 2);
    await writeFile(tmpPath, json, "utf-8");
    await rename(tmpPath, this.filePath);
    this.cache = { ...data };
  }
  async update(patch) {
    const current = await this.read();
    if (typeof current !== "object" || current === null) {
      throw new Error("Cannot update non-object storage");
    }
    const merged = { ...current, ...patch };
    await this.write(merged);
  }
  invalidateCache() {
    this.cache = null;
  }
  mergeDefaults(fetched, fallback) {
    if (typeof fetched !== "object" || fetched === null) return { ...fallback };
    if (typeof fallback !== "object" || fallback === null) return fetched;
    const result = { ...fetched };
    const fallbackObj = fallback;
    for (const key of Object.keys(fallbackObj)) {
      if (!(key in result) || result[key] === void 0) {
        result[key] = fallbackObj[key];
      } else if (typeof fallbackObj[key] === "object" && fallbackObj[key] !== null && !Array.isArray(fallbackObj[key])) {
        result[key] = this.deepMerge(result[key], fallbackObj[key]);
      }
    }
    return result;
  }
  deepMerge(target, source) {
    if (typeof target !== "object" || target === null) return source;
    if (typeof source !== "object" || source === null) return target;
    const result = { ...target };
    const sourceObj = source;
    for (const key of Object.keys(sourceObj)) {
      if (typeof sourceObj[key] === "object" && sourceObj[key] !== null && !Array.isArray(sourceObj[key])) {
        result[key] = this.deepMerge(result[key], sourceObj[key]);
      } else if (!(key in result)) {
        result[key] = sourceObj[key];
      }
    }
    return result;
  }
}
const DEFAULT_CONFIG = {
  bot: {
    name: "群管机器人",
    admins: [],
    commandPrefix: "/"
  },
  groupManagement: {
    enabled: true,
    blacklist: { global: [], groups: {} },
    whitelist: {},
    mute: {
      escalate: true,
      thresholds: [3, 60, -1],
      defaultDuration: 10
    },
    adDetect: {
      enabled: true,
      rules: [],
      action: "recall"
    },
    floodDetect: {
      enabled: true,
      windowSeconds: 5,
      maxMessages: 5,
      action: "mute"
    },
    captcha: {
      enabled: false,
      timeoutSeconds: 120
    },
    audit: {
      enabled: false,
      autoRejectLevel: 5
    }
  },
  points: {
    enabled: true,
    perMessage: 1,
    maxPerMinute: 10,
    dailyCheckin: 10,
    streakBonus: [0, 5, 10, 15, 20, 25, 30]
  },
  social: {
    poke: { cooldown: 30, enabled: true },
    lottery: { enabled: true },
    qa: { enabled: true, triggerMode: "both" },
    aiVoice: { enabled: true, cooldown: 60, defaultCharacter: "" }
  },
  message: { archiveRetentionDays: 7 },
  automation: {
    cronJobs: [],
    autoSign: { enabled: false, groups: [], cron: "0 8 * * *" },
    autoRead: { enabled: true, whitelist: [] },
    autoFileDownload: { enabled: false, directory: "./data/files", filters: [] }
  },
  account: {
    avatarRotation: { enabled: false, cron: "0 0 * * *", avatars: [] },
    dynamicSignature: { enabled: false, cron: "0 * * * *", templates: [] },
    onlineStatus: { enabled: false, schedule: [] }
  },
  operations: {
    referral: { enabled: false, targets: [] },
    welcome: { enabled: true, template: "欢迎 {user} 加入 {group} 群！" }
  },
  webui: {
    port: 9090,
    host: "0.0.0.0"
  }
};
class ConfigManager {
  storage;
  memoryConfig = null;
  constructor(dataDir2) {
    this.storage = new JsonStorage(
      `${dataDir2}/config.json`,
      DEFAULT_CONFIG
    );
  }
  static fromObject(config) {
    const mgr = new ConfigManager("");
    mgr.storage = null;
    mgr.memoryConfig = config;
    return mgr;
  }
  async init() {
    if (this.storage) {
      await this.storage.read();
      log.info("ConfigManager initialized");
    }
  }
  get(path) {
    const conf = this.memoryConfig || this.storage?.["cache"];
    if (!conf) throw new Error("Config not loaded. Call init() first.");
    if (pluginState.ctx) {
      const napcatConfig = pluginState.config;
      if (napcatConfig && Object.keys(napcatConfig).length > 0) {
        return this.getValueByPath(napcatConfig, path);
      }
    }
    return this.getValueByPath(conf, path);
  }
  async set(path, value) {
    if (pluginState.ctx) {
      const napcatConfig = { ...pluginState.config };
      this.setValueByPath(napcatConfig, path, value);
      pluginState.config = napcatConfig;
      return;
    }
    if (this.storage) {
      const config = await this.storage.read();
      this.setValueByPath(config, path, value);
      await this.storage.write(config);
    } else if (this.memoryConfig) {
      this.setValueByPath(this.memoryConfig, path, value);
    }
  }
  getAll() {
    if (pluginState.ctx && Object.keys(pluginState.config).length > 0) {
      return pluginState.config;
    }
    const config = this.memoryConfig || this.storage?.["cache"];
    if (!config) throw new Error("Config not loaded. Call init() first.");
    return config;
  }
  exportConfig() {
    const config = this.memoryConfig || this.storage?.["cache"];
    if (!config) throw new Error("Config not loaded. Call init() first.");
    return JSON.stringify(config, null, 2);
  }
  async importConfig(json) {
    try {
      const parsed = JSON.parse(json);
      if (this.storage) {
        await this.storage.write(parsed);
      } else if (this.memoryConfig !== null) {
        this.memoryConfig = parsed;
      }
      log.info("Config imported successfully");
    } catch (err) {
      log.error("Failed to import config", { error: String(err) });
      throw new Error("Invalid config JSON");
    }
  }
  async reset(path) {
    if (path) {
      const defaultValue = this.getValueByPath(DEFAULT_CONFIG, path);
      await this.set(path, defaultValue);
    } else {
      if (this.storage) {
        await this.storage.write({ ...DEFAULT_CONFIG });
      } else if (this.memoryConfig !== null) {
        this.memoryConfig = { ...DEFAULT_CONFIG };
      }
    }
    log.info(`Config reset: ${path || "all"}`);
  }
  getStorage() {
    return this.storage;
  }
  getValueByPath(obj, path) {
    const keys = path.split(".");
    let current = obj;
    for (const key of keys) {
      if (current === null || current === void 0) return void 0;
      current = current[key];
    }
    return current;
  }
  setValueByPath(obj, path, value) {
    const keys = path.split(".");
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== "object" || current[key] === null) {
        current[key] = {};
      }
      current = current[key];
    }
    current[keys[keys.length - 1]] = value;
  }
}
class ApiWrapper {
  botApi;
  constructor(botApi) {
    this.botApi = botApi || null;
  }
  async call(action, params = {}) {
    const maxRetries = 3;
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        let response;
        if (pluginState.ctx) {
          response = await pluginState.ctx.actions.call(
            action,
            params,
            pluginState.ctx.adapterName,
            pluginState.ctx.pluginManager.config
          );
        } else if (this.botApi) {
          response = await this.botApi(action, params);
        } else {
          throw new Error("No API backend available");
        }
        if (response.status === "ok" || response.retcode === 0) {
          return response.data;
        }
        lastError = new Error(`API error: ${response.wording || response.msg || String(response.retcode)}`);
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
        }
      }
    }
    if (pluginState.ctx) {
      pluginState.ctx.logger.error(`API call failed after ${maxRetries} retries: ${action}`);
    }
    throw lastError;
  }
  async sendPrivateMsg(userId, message) {
    const res = await this.call("send_private_msg", { user_id: Number(userId), message });
    return res.message_id;
  }
  async sendGroupMsg(groupId, message) {
    const res = await this.call("send_group_msg", { group_id: Number(groupId), message });
    return res.message_id;
  }
  async sendMsg(messageType, targetId, message) {
    const res = await this.call("send_msg", {
      message_type: messageType,
      ...messageType === "private" ? { user_id: Number(targetId) } : { group_id: Number(targetId) },
      message
    });
    return res.message_id;
  }
  async deleteMsg(messageId) {
    await this.call("delete_msg", { message_id: messageId });
  }
  async getMsg(messageId) {
    return this.call("get_msg", { message_id: messageId });
  }
  async getForwardMsg(messageId) {
    return this.call("get_forward_msg", { message_id: messageId });
  }
  async sendLike(userId, times = 1) {
    await this.call("send_like", { user_id: Number(userId), times });
  }
  async setGroupKick(groupId, userId, rejectAddRequest = false) {
    await this.call("set_group_kick", { group_id: Number(groupId), user_id: Number(userId), reject_add_request: rejectAddRequest });
  }
  async setGroupBan(groupId, userId, duration = 1800) {
    await this.call("set_group_ban", { group_id: Number(groupId), user_id: Number(userId), duration });
  }
  async setGroupWholeBan(groupId, enable = true) {
    await this.call("set_group_whole_ban", { group_id: Number(groupId), enable });
  }
  async setGroupAdmin(groupId, userId, enable = true) {
    await this.call("set_group_admin", { group_id: Number(groupId), user_id: Number(userId), enable });
  }
  async setGroupSpecialTitle(groupId, userId, specialTitle) {
    await this.call("set_group_special_title", { group_id: Number(groupId), user_id: Number(userId), special_title: specialTitle });
  }
  async setGroupCard(groupId, userId, card) {
    await this.call("set_group_card", { group_id: Number(groupId), user_id: Number(userId), card });
  }
  async setGroupName(groupId, groupName) {
    await this.call("set_group_name", { group_id: Number(groupId), group_name: groupName });
  }
  async setGroupLeave(groupId, isDismiss = false) {
    await this.call("set_group_leave", { group_id: Number(groupId), is_dismiss: isDismiss });
  }
  async setGroupAddRequest(flag, subType, approve, reason = "") {
    await this.call("set_group_add_request", { flag, sub_type: subType, approve, reason });
  }
  async setFriendAddRequest(flag, approve, remark = "") {
    await this.call("set_friend_add_request", { flag, approve, remark });
  }
  async getGroupInfo(groupId, noCache = false) {
    return this.call("get_group_info", { group_id: Number(groupId), no_cache: noCache });
  }
  async getGroupList() {
    return this.call("get_group_list");
  }
  async getGroupMemberInfo(groupId, userId, noCache = false) {
    return this.call("get_group_member_info", { group_id: Number(groupId), user_id: Number(userId), no_cache: noCache });
  }
  async getGroupMemberList(groupId, noCache = false) {
    return this.call("get_group_member_list", { group_id: Number(groupId), no_cache: noCache });
  }
  async getGroupHonorInfo(groupId, type = "all") {
    return this.call("get_group_honor_info", { group_id: Number(groupId), type });
  }
  async getFriendList() {
    return this.call("get_friend_list");
  }
  async getStrangerInfo(userId, noCache = false) {
    return this.call("get_stranger_info", { user_id: Number(userId), no_cache: noCache });
  }
  async getLoginInfo() {
    return this.call("get_login_info");
  }
  async canSendImage() {
    return this.call("can_send_image");
  }
  async canSendRecord() {
    return this.call("can_send_record");
  }
  async getStatus() {
    return this.call("get_status");
  }
  async getVersionInfo() {
    return this.call("get_version_info");
  }
  async getImage(file) {
    return this.call("get_image", { file });
  }
  async getRecord(file, outFormat = "mp3") {
    return this.call("get_record", { file, out_format: outFormat });
  }
  async setRestart(delay = 0) {
    await this.call("set_restart", { delay });
  }
  async cleanCache() {
    await this.call("clean_cache");
  }
  async sendForwardMsg(messageType, userId, groupId, messages) {
    const params = { messages };
    if (messageType === "private" && userId) params.user_id = userId;
    else if (messageType === "group" && groupId) params.group_id = groupId;
    return this.call("send_forward_msg", params);
  }
  async uploadPrivateFile(userId, file, name) {
    await this.call("upload_private_file", { user_id: Number(userId), file, name });
  }
  async uploadGroupFile(groupId, file, name, folder = "") {
    await this.call("upload_group_file", { group_id: Number(groupId), file, name, folder });
  }
  async deleteGroupFile(groupId, fileId, busid) {
    await this.call("delete_group_file", { group_id: Number(groupId), file_id: fileId, busid });
  }
  async createGroupFileFolder(groupId, name) {
    await this.call("create_group_file_folder", { group_id: Number(groupId), name });
  }
  async getGroupFileSystemInfo(groupId) {
    return this.call("get_group_file_system_info", { group_id: Number(groupId) });
  }
  async getGroupRootFiles(groupId) {
    return this.call("get_group_root_files", { group_id: Number(groupId) });
  }
  async getGroupFilesByFolder(groupId, folderId) {
    return this.call("get_group_files_by_folder", { group_id: Number(groupId), folder_id: folderId });
  }
  async getGroupFileUrl(groupId, fileId, busid) {
    const res = await this.call("get_group_file_url", { group_id: Number(groupId), file_id: fileId, busid });
    return res.url;
  }
  async getEssenceMsgList(groupId) {
    return this.call("get_essence_msg_list", { group_id: Number(groupId) });
  }
  async setEssenceMsg(messageId) {
    await this.call("set_essence_msg", { message_id: messageId });
  }
  async deleteEssenceMsg(messageId) {
    await this.call("delete_essence_msg", { message_id: messageId });
  }
  async handleQuickOperation(context, operation) {
    await this.call(".handle_quick_operation", { context, operation });
  }
  async setModelShow(model, modelShow) {
    await this.call("_set_model_show", { model, model_show: modelShow });
  }
  async getModelShow(model) {
    return this.call("_get_model_show", { model });
  }
  async getOnlineClients() {
    return this.call("get_online_clients");
  }
  async setGroupSign(groupId) {
    await this.call("set_group_sign", { group_id: groupId });
  }
  async sendPoke(userId, groupId) {
    const params = { user_id: userId };
    if (groupId) params.group_id = groupId;
    await this.call("send_poke", params);
  }
  async arkSharePeer(userId, groupId, phoneNumber) {
    return this.call("ArkSharePeer", {
      ...userId ? { user_id: userId } : {},
      ...groupId ? { group_id: groupId } : {},
      ...phoneNumber ? { phoneNumber } : {}
    });
  }
  async arkShareGroup(groupId) {
    return this.call("ArkShareGroup", { group_id: groupId });
  }
  async getRobotUinRange() {
    return this.call("get_robot_uin_range");
  }
  async setOnlineStatus(status, extStatus, batteryStatus = 100) {
    await this.call("set_online_status", { status, ext_status: extStatus, battery_status: batteryStatus });
  }
  async getFriendsWithCategory() {
    return this.call("get_friends_with_category");
  }
  async setQqAvatar(file) {
    await this.call("set_qq_avatar", { file });
  }
  async getFile(fileId) {
    return this.call("get_file", { file_id: fileId });
  }
  async forwardFriendSingleMsg(messageId, userId) {
    await this.call("forward_friend_single_msg", { message_id: messageId, user_id: userId });
  }
  async forwardGroupSingleMsg(messageId, groupId) {
    await this.call("forward_group_single_msg", { message_id: messageId, group_id: groupId });
  }
  async translateEn2Zh(words) {
    return this.call("translate_en2zh", { words });
  }
  async setMsgEmojiLike(messageId, emojiId) {
    await this.call("set_msg_emoji_like", { message_id: messageId, emoji_id: emojiId });
  }
  async markPrivateMsgAsRead(userId) {
    await this.call("mark_private_msg_as_read", { user_id: userId });
  }
  async markGroupMsgAsRead(groupId) {
    await this.call("mark_group_msg_as_read", { group_id: groupId });
  }
  async getFriendMsgHistory(userId, messageSeq = "0", count = 20, reverseOrder = false) {
    return this.call("get_friend_msg_history", { user_id: userId, message_seq: messageSeq, count, reverseOrder });
  }
  async createCollection(rawData, brief) {
    await this.call("create_collection", { rawData, brief });
  }
  async getCollectionList() {
    return this.call("get_collection_list");
  }
  async setSelfLongnick(longNick) {
    return this.call("set_self_longnick", { longNick });
  }
  async getRecentContact(count = 10) {
    return this.call("get_recent_contact", { count });
  }
  async markAllAsRead() {
    await this.call("_mark_all_as_read");
  }
  async getProfileLike() {
    return this.call("get_profile_like");
  }
  async fetchCustomFace(count = 48) {
    return this.call("fetch_custom_face", { count });
  }
  async getAiRecord(character, groupId, text) {
    return this.call("get_ai_record", { character, group_id: groupId, text });
  }
  async getAiCharacters(groupId, chatType = 1) {
    return this.call("get_ai_characters", { group_id: groupId, chat_type: chatType });
  }
  async sendGroupAiRecord(character, groupId, text) {
    return this.call("send_group_ai_record", { character, group_id: groupId, text });
  }
}
class CommandParser {
  commands = [];
  cooldowns = /* @__PURE__ */ new Map();
  register(moduleId, command) {
    this.commands.push({ moduleId, def: command });
  }
  unregister(moduleId) {
    this.commands = this.commands.filter((c) => c.moduleId !== moduleId);
  }
  parse(rawMessage) {
    const trimmed = rawMessage.trim();
    if (!trimmed) return null;
    for (const entry of this.commands) {
      const { def } = entry;
      const prefix = def.prefix;
      let matchedAlias = null;
      for (const alias of def.aliases) {
        const fullPrefix2 = prefix + alias;
        if (trimmed === fullPrefix2 || trimmed.startsWith(fullPrefix2 + " ")) {
          matchedAlias = alias;
          break;
        }
      }
      if (!matchedAlias) continue;
      const fullPrefix = prefix + matchedAlias;
      const argsStr = trimmed === fullPrefix ? "" : trimmed.slice(fullPrefix.length + 1);
      const args = this.parseArgs(argsStr, def.args);
      if (args === null) continue;
      return {
        name: def.name,
        moduleId: entry.moduleId,
        args,
        rawArgs: argsStr,
        handler: def.handler
      };
    }
    return null;
  }
  checkCooldown(commandName, userId, cooldownSeconds) {
    const now = Date.now();
    const userCooldowns = this.cooldowns.get(commandName);
    if (!userCooldowns) {
      const newMap = /* @__PURE__ */ new Map();
      newMap.set(userId, now);
      this.cooldowns.set(commandName, newMap);
      return true;
    }
    const lastUsed = userCooldowns.get(userId);
    if (lastUsed && now - lastUsed < cooldownSeconds * 1e3) {
      return false;
    }
    userCooldowns.set(userId, now);
    return true;
  }
  getCommands() {
    return [...this.commands];
  }
  parseArgs(rawArgs, defs) {
    const result = {};
    const parts = this.splitArgs(rawArgs);
    let partIndex = 0;
    for (const def of defs) {
      if (def.type === "rest") {
        result[def.name] = parts.slice(partIndex).join(" ");
        return result;
      }
      if (partIndex >= parts.length) {
        if (def.required) return null;
        continue;
      }
      const value = parts[partIndex];
      switch (def.type) {
        case "string":
          result[def.name] = value;
          break;
        case "number":
          const num = Number(value);
          if (isNaN(num)) return null;
          result[def.name] = num;
          break;
        case "user":
          const match = value.match(/\[CQ:at,qq=(\d+)\]/);
          result[def.name] = match ? match[1] : value.replace(/\D/g, "");
          break;
      }
      partIndex++;
    }
    return result;
  }
  splitArgs(input) {
    if (!input) return [];
    const parts = [];
    let current = "";
    let inQuote = false;
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === " " && !inQuote) {
        if (current) {
          parts.push(current);
          current = "";
        }
      } else {
        current += char;
      }
    }
    if (current) parts.push(current);
    return parts;
  }
}
class EventRouter {
  handlers = [];
  groupQueues = /* @__PURE__ */ new Map();
  processing = /* @__PURE__ */ new Map();
  register(moduleId, eventType, handler, priority = 100) {
    const id = `${moduleId}_${eventType}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.handlers.push({ id, moduleId, eventType, handler, priority });
    this.handlers.sort((a, b) => a.priority - b.priority);
    log.debug(`Event handler registered`, { moduleId, eventType, priority });
  }
  async dispatch(event) {
    const eventType = this.buildEventType(event);
    const matched = this.handlers.filter((h) => h.eventType === eventType || h.eventType === "*");
    if (matched.length === 0) return;
    const groupId = event.group_id;
    if (groupId && eventType === "message.group") {
      await this.serializeGroupEvent(groupId, event, matched);
    } else {
      await this.runHandlers(event, matched);
    }
  }
  unregister(moduleId) {
    const before = this.handlers.length;
    this.handlers = this.handlers.filter((h) => h.moduleId !== moduleId);
    log.info(`Event handlers unregistered for module: ${moduleId}, removed ${before - this.handlers.length}`);
  }
  getHandlerCount() {
    return this.handlers.length;
  }
  async serializeGroupEvent(groupId, event, matched) {
    if (this.processing.get(groupId)) {
      const queue = this.groupQueues.get(groupId) || [];
      queue.push(event);
      this.groupQueues.set(groupId, queue);
      return;
    }
    this.processing.set(groupId, true);
    try {
      await this.runHandlers(event, matched);
    } finally {
      const queue = this.groupQueues.get(groupId);
      if (queue && queue.length > 0) {
        const next = queue.shift();
        if (queue.length === 0) {
          this.groupQueues.delete(groupId);
        }
        this.processing.set(groupId, false);
        await this.serializeGroupEvent(groupId, next, matched);
      } else {
        this.processing.delete(groupId);
      }
    }
  }
  async runHandlers(event, entries) {
    for (const entry of entries) {
      try {
        await entry.handler(event);
      } catch (err) {
        log.error(`Handler error`, {
          moduleId: entry.moduleId,
          eventType: entry.eventType,
          error: String(err)
        });
      }
    }
  }
  buildEventType(event) {
    const postType = event.post_type;
    if (postType === "message") {
      return `${postType}.${event.message_type}`;
    }
    if (postType === "notice") {
      const noticeType = event.notice_type;
      if (noticeType === "notify") {
        return `notice.notify.${event.sub_type}`;
      }
      return `notice.${noticeType}`;
    }
    if (postType === "request") {
      const reqType = event.request_type;
      const subType = event.sub_type;
      return subType ? `request.${reqType}.${subType}` : `request.${reqType}`;
    }
    if (postType === "meta_event") {
      return `meta_event.${event.meta_event_type}`;
    }
    return postType;
  }
}
class ModuleLoader {
  modules = /* @__PURE__ */ new Map();
  register(manifest) {
    this.modules.set(manifest.id, { manifest, loaded: false });
  }
  async loadAll() {
    for (const [id, entry] of this.modules) {
      if (entry.manifest.enabled && !entry.loaded) {
        try {
          await this.loadModule(id);
        } catch (err) {
          log.error(`Failed to load module: ${id}`, { error: String(err) });
          entry.loaded = false;
        }
      }
    }
  }
  async loadModule(id) {
    const entry = this.modules.get(id);
    if (!entry) throw new Error(`Module not found: ${id}`);
    await entry.manifest.load();
    entry.loaded = true;
    log.info(`Module loaded: ${id}`);
  }
  async unloadModule(id) {
    const entry = this.modules.get(id);
    if (!entry) throw new Error(`Module not found: ${id}`);
    if (!entry.loaded) return;
    await entry.manifest.unload();
    entry.loaded = false;
    log.info(`Module unloaded: ${id}`);
  }
  async reloadModule(id) {
    await this.unloadModule(id);
    await this.loadModule(id);
    log.info(`Module reloaded: ${id}`);
  }
  getModuleStatus() {
    const result = [];
    for (const [, entry] of this.modules) {
      result.push({
        id: entry.manifest.id,
        name: entry.manifest.name,
        version: entry.manifest.version,
        enabled: entry.manifest.enabled,
        loaded: entry.loaded
      });
    }
    return result;
  }
}
var task;
var hasRequiredTask;
function requireTask() {
  if (hasRequiredTask) return task;
  hasRequiredTask = 1;
  const EventEmitter = require$$0$5;
  class Task extends EventEmitter {
    constructor(execution) {
      super();
      if (typeof execution !== "function") {
        throw "execution must be a function";
      }
      this._execution = execution;
    }
    execute(now) {
      let exec;
      try {
        exec = this._execution(now);
      } catch (error) {
        return this.emit("task-failed", error);
      }
      if (exec instanceof Promise) {
        return exec.then(() => this.emit("task-finished")).catch((error) => this.emit("task-failed", error));
      } else {
        this.emit("task-finished");
        return exec;
      }
    }
  }
  task = Task;
  return task;
}
var monthNamesConversion;
var hasRequiredMonthNamesConversion;
function requireMonthNamesConversion() {
  if (hasRequiredMonthNamesConversion) return monthNamesConversion;
  hasRequiredMonthNamesConversion = 1;
  monthNamesConversion = /* @__PURE__ */ (() => {
    const months = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december"
    ];
    const shortMonths = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec"
    ];
    function convertMonthName(expression, items) {
      for (let i = 0; i < items.length; i++) {
        expression = expression.replace(new RegExp(items[i], "gi"), parseInt(i, 10) + 1);
      }
      return expression;
    }
    function interprete(monthExpression) {
      monthExpression = convertMonthName(monthExpression, months);
      monthExpression = convertMonthName(monthExpression, shortMonths);
      return monthExpression;
    }
    return interprete;
  })();
  return monthNamesConversion;
}
var weekDayNamesConversion;
var hasRequiredWeekDayNamesConversion;
function requireWeekDayNamesConversion() {
  if (hasRequiredWeekDayNamesConversion) return weekDayNamesConversion;
  hasRequiredWeekDayNamesConversion = 1;
  weekDayNamesConversion = /* @__PURE__ */ (() => {
    const weekDays = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday"
    ];
    const shortWeekDays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    function convertWeekDayName(expression, items) {
      for (let i = 0; i < items.length; i++) {
        expression = expression.replace(new RegExp(items[i], "gi"), parseInt(i, 10));
      }
      return expression;
    }
    function convertWeekDays(expression) {
      expression = expression.replace("7", "0");
      expression = convertWeekDayName(expression, weekDays);
      return convertWeekDayName(expression, shortWeekDays);
    }
    return convertWeekDays;
  })();
  return weekDayNamesConversion;
}
var asteriskToRangeConversion;
var hasRequiredAsteriskToRangeConversion;
function requireAsteriskToRangeConversion() {
  if (hasRequiredAsteriskToRangeConversion) return asteriskToRangeConversion;
  hasRequiredAsteriskToRangeConversion = 1;
  asteriskToRangeConversion = /* @__PURE__ */ (() => {
    function convertAsterisk(expression, replecement) {
      if (expression.indexOf("*") !== -1) {
        return expression.replace("*", replecement);
      }
      return expression;
    }
    function convertAsterisksToRanges(expressions) {
      expressions[0] = convertAsterisk(expressions[0], "0-59");
      expressions[1] = convertAsterisk(expressions[1], "0-59");
      expressions[2] = convertAsterisk(expressions[2], "0-23");
      expressions[3] = convertAsterisk(expressions[3], "1-31");
      expressions[4] = convertAsterisk(expressions[4], "1-12");
      expressions[5] = convertAsterisk(expressions[5], "0-6");
      return expressions;
    }
    return convertAsterisksToRanges;
  })();
  return asteriskToRangeConversion;
}
var rangeConversion;
var hasRequiredRangeConversion;
function requireRangeConversion() {
  if (hasRequiredRangeConversion) return rangeConversion;
  hasRequiredRangeConversion = 1;
  rangeConversion = /* @__PURE__ */ (() => {
    function replaceWithRange(expression, text, init, end) {
      const numbers = [];
      let last = parseInt(end);
      let first = parseInt(init);
      if (first > last) {
        last = parseInt(init);
        first = parseInt(end);
      }
      for (let i = first; i <= last; i++) {
        numbers.push(i);
      }
      return expression.replace(new RegExp(text, "i"), numbers.join());
    }
    function convertRange(expression) {
      const rangeRegEx = /(\d+)-(\d+)/;
      let match = rangeRegEx.exec(expression);
      while (match !== null && match.length > 0) {
        expression = replaceWithRange(expression, match[0], match[1], match[2]);
        match = rangeRegEx.exec(expression);
      }
      return expression;
    }
    function convertAllRanges(expressions) {
      for (let i = 0; i < expressions.length; i++) {
        expressions[i] = convertRange(expressions[i]);
      }
      return expressions;
    }
    return convertAllRanges;
  })();
  return rangeConversion;
}
var stepValuesConversion;
var hasRequiredStepValuesConversion;
function requireStepValuesConversion() {
  if (hasRequiredStepValuesConversion) return stepValuesConversion;
  hasRequiredStepValuesConversion = 1;
  stepValuesConversion = /* @__PURE__ */ (() => {
    function convertSteps(expressions) {
      var stepValuePattern = /^(.+)\/(\w+)$/;
      for (var i = 0; i < expressions.length; i++) {
        var match = stepValuePattern.exec(expressions[i]);
        var isStepValue = match !== null && match.length > 0;
        if (isStepValue) {
          var baseDivider = match[2];
          if (isNaN(baseDivider)) {
            throw baseDivider + " is not a valid step value";
          }
          var values = match[1].split(",");
          var stepValues = [];
          var divider = parseInt(baseDivider, 10);
          for (var j = 0; j <= values.length; j++) {
            var value = parseInt(values[j], 10);
            if (value % divider === 0) {
              stepValues.push(value);
            }
          }
          expressions[i] = stepValues.join(",");
        }
      }
      return expressions;
    }
    return convertSteps;
  })();
  return stepValuesConversion;
}
var convertExpression;
var hasRequiredConvertExpression;
function requireConvertExpression() {
  if (hasRequiredConvertExpression) return convertExpression;
  hasRequiredConvertExpression = 1;
  const monthNamesConversion2 = requireMonthNamesConversion();
  const weekDayNamesConversion2 = requireWeekDayNamesConversion();
  const convertAsterisksToRanges = requireAsteriskToRangeConversion();
  const convertRanges = requireRangeConversion();
  const convertSteps = requireStepValuesConversion();
  convertExpression = /* @__PURE__ */ (() => {
    function appendSeccondExpression(expressions) {
      if (expressions.length === 5) {
        return ["0"].concat(expressions);
      }
      return expressions;
    }
    function removeSpaces(str) {
      return str.replace(/\s{2,}/g, " ").trim();
    }
    function normalizeIntegers(expressions) {
      for (let i = 0; i < expressions.length; i++) {
        const numbers = expressions[i].split(",");
        for (let j = 0; j < numbers.length; j++) {
          numbers[j] = parseInt(numbers[j]);
        }
        expressions[i] = numbers;
      }
      return expressions;
    }
    function interprete(expression) {
      let expressions = removeSpaces(expression).split(" ");
      expressions = appendSeccondExpression(expressions);
      expressions[4] = monthNamesConversion2(expressions[4]);
      expressions[5] = weekDayNamesConversion2(expressions[5]);
      expressions = convertAsterisksToRanges(expressions);
      expressions = convertRanges(expressions);
      expressions = convertSteps(expressions);
      expressions = normalizeIntegers(expressions);
      return expressions.join(" ");
    }
    return interprete;
  })();
  return convertExpression;
}
var patternValidation;
var hasRequiredPatternValidation;
function requirePatternValidation() {
  if (hasRequiredPatternValidation) return patternValidation;
  hasRequiredPatternValidation = 1;
  const convertExpression2 = requireConvertExpression();
  const validationRegex = /^(?:\d+|\*|\*\/\d+)$/;
  function isValidExpression(expression, min, max) {
    const options = expression.split(",");
    for (const option of options) {
      const optionAsInt = parseInt(option, 10);
      if (!Number.isNaN(optionAsInt) && (optionAsInt < min || optionAsInt > max) || !validationRegex.test(option))
        return false;
    }
    return true;
  }
  function isInvalidSecond(expression) {
    return !isValidExpression(expression, 0, 59);
  }
  function isInvalidMinute(expression) {
    return !isValidExpression(expression, 0, 59);
  }
  function isInvalidHour(expression) {
    return !isValidExpression(expression, 0, 23);
  }
  function isInvalidDayOfMonth(expression) {
    return !isValidExpression(expression, 1, 31);
  }
  function isInvalidMonth(expression) {
    return !isValidExpression(expression, 1, 12);
  }
  function isInvalidWeekDay(expression) {
    return !isValidExpression(expression, 0, 7);
  }
  function validateFields(patterns, executablePatterns) {
    if (isInvalidSecond(executablePatterns[0]))
      throw new Error(`${patterns[0]} is a invalid expression for second`);
    if (isInvalidMinute(executablePatterns[1]))
      throw new Error(`${patterns[1]} is a invalid expression for minute`);
    if (isInvalidHour(executablePatterns[2]))
      throw new Error(`${patterns[2]} is a invalid expression for hour`);
    if (isInvalidDayOfMonth(executablePatterns[3]))
      throw new Error(
        `${patterns[3]} is a invalid expression for day of month`
      );
    if (isInvalidMonth(executablePatterns[4]))
      throw new Error(`${patterns[4]} is a invalid expression for month`);
    if (isInvalidWeekDay(executablePatterns[5]))
      throw new Error(`${patterns[5]} is a invalid expression for week day`);
  }
  function validate(pattern) {
    if (typeof pattern !== "string")
      throw new TypeError("pattern must be a string!");
    const patterns = pattern.split(" ");
    const executablePatterns = convertExpression2(pattern).split(" ");
    if (patterns.length === 5) patterns.unshift("0");
    validateFields(patterns, executablePatterns);
  }
  patternValidation = validate;
  return patternValidation;
}
var timeMatcher;
var hasRequiredTimeMatcher;
function requireTimeMatcher() {
  if (hasRequiredTimeMatcher) return timeMatcher;
  hasRequiredTimeMatcher = 1;
  const validatePattern = requirePatternValidation();
  const convertExpression2 = requireConvertExpression();
  function matchPattern(pattern, value) {
    if (pattern.indexOf(",") !== -1) {
      const patterns = pattern.split(",");
      return patterns.indexOf(value.toString()) !== -1;
    }
    return pattern === value.toString();
  }
  class TimeMatcher {
    constructor(pattern, timezone) {
      validatePattern(pattern);
      this.pattern = convertExpression2(pattern);
      this.timezone = timezone;
      this.expressions = this.pattern.split(" ");
      this.dtf = this.timezone ? new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
        fractionalSecondDigits: 3,
        timeZone: this.timezone
      }) : null;
    }
    match(date) {
      date = this.apply(date);
      const runOnSecond = matchPattern(this.expressions[0], date.getSeconds());
      const runOnMinute = matchPattern(this.expressions[1], date.getMinutes());
      const runOnHour = matchPattern(this.expressions[2], date.getHours());
      const runOnDay = matchPattern(this.expressions[3], date.getDate());
      const runOnMonth = matchPattern(this.expressions[4], date.getMonth() + 1);
      const runOnWeekDay = matchPattern(this.expressions[5], date.getDay());
      return runOnSecond && runOnMinute && runOnHour && runOnDay && runOnMonth && runOnWeekDay;
    }
    apply(date) {
      if (this.dtf) {
        return new Date(this.dtf.format(date));
      }
      return date;
    }
  }
  timeMatcher = TimeMatcher;
  return timeMatcher;
}
var scheduler;
var hasRequiredScheduler;
function requireScheduler() {
  if (hasRequiredScheduler) return scheduler;
  hasRequiredScheduler = 1;
  const EventEmitter = require$$0$5;
  const TimeMatcher = requireTimeMatcher();
  class Scheduler extends EventEmitter {
    constructor(pattern, timezone, autorecover) {
      super();
      this.timeMatcher = new TimeMatcher(pattern, timezone);
      this.autorecover = autorecover;
    }
    start() {
      this.stop();
      let lastCheck = process.hrtime();
      let lastExecution = this.timeMatcher.apply(/* @__PURE__ */ new Date());
      const matchTime = () => {
        const delay = 1e3;
        const elapsedTime = process.hrtime(lastCheck);
        const elapsedMs = (elapsedTime[0] * 1e9 + elapsedTime[1]) / 1e6;
        const missedExecutions = Math.floor(elapsedMs / 1e3);
        for (let i = missedExecutions; i >= 0; i--) {
          const date = new Date((/* @__PURE__ */ new Date()).getTime() - i * 1e3);
          let date_tmp = this.timeMatcher.apply(date);
          if (lastExecution.getTime() < date_tmp.getTime() && (i === 0 || this.autorecover) && this.timeMatcher.match(date)) {
            this.emit("scheduled-time-matched", date_tmp);
            date_tmp.setMilliseconds(0);
            lastExecution = date_tmp;
          }
        }
        lastCheck = process.hrtime();
        this.timeout = setTimeout(matchTime, delay);
      };
      matchTime();
    }
    stop() {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.timeout = null;
    }
  }
  scheduler = Scheduler;
  return scheduler;
}
var scheduledTask;
var hasRequiredScheduledTask;
function requireScheduledTask() {
  if (hasRequiredScheduledTask) return scheduledTask;
  hasRequiredScheduledTask = 1;
  const EventEmitter = require$$0$5;
  const Task = requireTask();
  const Scheduler = requireScheduler();
  const uuid = require$$3$2;
  class ScheduledTask extends EventEmitter {
    constructor(cronExpression, func, options) {
      super();
      if (!options) {
        options = {
          scheduled: true,
          recoverMissedExecutions: false
        };
      }
      this.options = options;
      this.options.name = this.options.name || uuid.v4();
      this._task = new Task(func);
      this._scheduler = new Scheduler(cronExpression, options.timezone, options.recoverMissedExecutions);
      this._scheduler.on("scheduled-time-matched", (now) => {
        this.now(now);
      });
      if (options.scheduled !== false) {
        this._scheduler.start();
      }
      if (options.runOnInit === true) {
        this.now("init");
      }
    }
    now(now = "manual") {
      let result = this._task.execute(now);
      this.emit("task-done", result);
    }
    start() {
      this._scheduler.start();
    }
    stop() {
      this._scheduler.stop();
    }
  }
  scheduledTask = ScheduledTask;
  return scheduledTask;
}
var backgroundScheduledTask;
var hasRequiredBackgroundScheduledTask;
function requireBackgroundScheduledTask() {
  if (hasRequiredBackgroundScheduledTask) return backgroundScheduledTask;
  hasRequiredBackgroundScheduledTask = 1;
  const EventEmitter = require$$0$5;
  const path = require$$1$1;
  const { fork } = require$$2$2;
  const uuid = require$$3$2;
  const daemonPath = `${__dirname}/daemon.js`;
  class BackgroundScheduledTask extends EventEmitter {
    constructor(cronExpression, taskPath, options) {
      super();
      if (!options) {
        options = {
          scheduled: true,
          recoverMissedExecutions: false
        };
      }
      this.cronExpression = cronExpression;
      this.taskPath = taskPath;
      this.options = options;
      this.options.name = this.options.name || uuid.v4();
      if (options.scheduled) {
        this.start();
      }
    }
    start() {
      this.stop();
      this.forkProcess = fork(daemonPath);
      this.forkProcess.on("message", (message) => {
        switch (message.type) {
          case "task-done":
            this.emit("task-done", message.result);
            break;
        }
      });
      let options = this.options;
      options.scheduled = true;
      this.forkProcess.send({
        type: "register",
        path: path.resolve(this.taskPath),
        cron: this.cronExpression,
        options
      });
    }
    stop() {
      if (this.forkProcess) {
        this.forkProcess.kill();
      }
    }
    pid() {
      if (this.forkProcess) {
        return this.forkProcess.pid;
      }
    }
    isRunning() {
      return !this.forkProcess.killed;
    }
  }
  backgroundScheduledTask = BackgroundScheduledTask;
  return backgroundScheduledTask;
}
var storage;
var hasRequiredStorage;
function requireStorage() {
  if (hasRequiredStorage) return storage;
  hasRequiredStorage = 1;
  storage = (() => {
    if (!commonjsGlobal.scheduledTasks) {
      commonjsGlobal.scheduledTasks = /* @__PURE__ */ new Map();
    }
    return {
      save: (task2) => {
        if (!task2.options) {
          const uuid = require$$3$2;
          task2.options = {};
          task2.options.name = uuid.v4();
        }
        commonjsGlobal.scheduledTasks.set(task2.options.name, task2);
      },
      getTasks: () => {
        return commonjsGlobal.scheduledTasks;
      }
    };
  })();
  return storage;
}
var nodeCron;
var hasRequiredNodeCron;
function requireNodeCron() {
  if (hasRequiredNodeCron) return nodeCron;
  hasRequiredNodeCron = 1;
  const ScheduledTask = requireScheduledTask();
  const BackgroundScheduledTask = requireBackgroundScheduledTask();
  const validation = requirePatternValidation();
  const storage2 = requireStorage();
  function schedule(expression, func, options) {
    const task2 = createTask(expression, func, options);
    storage2.save(task2);
    return task2;
  }
  function createTask(expression, func, options) {
    if (typeof func === "string")
      return new BackgroundScheduledTask(expression, func, options);
    return new ScheduledTask(expression, func, options);
  }
  function validate(expression) {
    try {
      validation(expression);
      return true;
    } catch (_) {
      return false;
    }
  }
  function getTasks() {
    return storage2.getTasks();
  }
  nodeCron = { schedule, validate, getTasks };
  return nodeCron;
}
var nodeCronExports = requireNodeCron();
const cron = /* @__PURE__ */ getDefaultExportFromCjs(nodeCronExports);
class CronScheduler {
  jobs = /* @__PURE__ */ new Map();
  taskExecutor = {};
  registerActionType(type, executor) {
    this.taskExecutor[type] = executor;
  }
  loadJobs(jobs) {
    for (const job of jobs) {
      if (job.enabled) {
        this.addJobFromConfig(job);
      }
    }
    log.info(`CronScheduler loaded ${this.jobs.size} jobs`);
  }
  addJobFromConfig(config) {
    if (!cron.validate(config.cron)) {
      log.warn(`Invalid cron expression for job: ${config.name}`, { cron: config.cron });
      return;
    }
    const task2 = cron.schedule(config.cron, async () => {
      await this.executeJob(config);
    });
    this.jobs.set(config.id, { config, task: task2 });
    log.info(`Cron job scheduled: ${config.name} (${config.cron})`);
  }
  removeJob(id) {
    const entry = this.jobs.get(id);
    if (entry) {
      entry.task.stop();
      this.jobs.delete(id);
      log.info(`Cron job removed: ${entry.config.name}`);
    }
  }
  listJobs() {
    const result = [];
    for (const entry of this.jobs.values()) {
      result.push({
        config: entry.config,
        running: true
      });
    }
    return result;
  }
  async triggerJob(id) {
    const entry = this.jobs.get(id);
    if (entry) {
      log.info(`Manually triggering job: ${entry.config.name}`);
      await this.executeJob(entry.config);
    } else {
      log.warn(`Job not found for trigger: ${id}`);
    }
  }
  stopAll() {
    for (const entry of this.jobs.values()) {
      entry.task.stop();
    }
    this.jobs.clear();
    log.info("All cron jobs stopped");
  }
  async executeJob(config) {
    try {
      const executor = this.taskExecutor[config.action.type];
      if (executor) {
        await executor(config);
      } else {
        log.warn(`No executor for action type: ${config.action.type}`);
      }
    } catch (err) {
      log.error(`Cron job execution failed: ${config.name}`, { error: String(err) });
    }
  }
}
class PointsCore {
  storage;
  minuteCounters = /* @__PURE__ */ new Map();
  constructor(dataDir2) {
    this.storage = new JsonStorage(`${dataDir2}/points.json`, { records: {} });
  }
  async init() {
    await this.storage.read();
    this.resetMinuteCounters();
    setInterval(() => this.resetMinuteCounters(), 6e4);
  }
  resetMinuteCounters() {
    this.minuteCounters.clear();
  }
  getRecordKey(userId, groupId) {
    return `${groupId}_${userId}`;
  }
  async getRecord(userId, groupId) {
    const key = this.getRecordKey(userId, groupId);
    const data = await this.storage.read();
    return data.records[key] || {
      userId: String(userId),
      groupId: String(groupId),
      points: 0,
      checkinStreak: 0,
      lastCheckinDate: "",
      totalPoints: 0
    };
  }
  async addPoints(userId, groupId, amount, perMinuteMax) {
    const counterKey = this.getRecordKey(userId, groupId);
    const current = this.minuteCounters.get(counterKey) || 0;
    if (perMinuteMax > 0 && current >= perMinuteMax) {
      return this.getRecord(userId, groupId);
    }
    this.minuteCounters.set(counterKey, current + amount);
    const key = this.getRecordKey(userId, groupId);
    const data = await this.storage.read();
    const record = data.records[key] || {
      userId: String(userId),
      groupId: String(groupId),
      points: 0,
      checkinStreak: 0,
      lastCheckinDate: "",
      totalPoints: 0
    };
    record.points += amount;
    record.totalPoints += amount;
    data.records[key] = record;
    await this.storage.write(data);
    return record;
  }
  async setPoints(userId, groupId, points) {
    const key = this.getRecordKey(userId, groupId);
    const data = await this.storage.read();
    const record = data.records[key] || {
      userId: String(userId),
      groupId: String(groupId),
      points: 0,
      checkinStreak: 0,
      lastCheckinDate: "",
      totalPoints: 0
    };
    const diff = points - record.points;
    record.points = points;
    if (diff > 0) record.totalPoints += diff;
    data.records[key] = record;
    await this.storage.write(data);
    return record;
  }
  async getRanking(groupId, limit = 10) {
    const data = await this.storage.read();
    const records = Object.values(data.records).filter((r) => r.groupId === String(groupId)).sort((a, b) => b.points - a.points).slice(0, limit);
    return records;
  }
}
class CheckinManager {
  pointsCore;
  constructor(pointsCore) {
    this.pointsCore = pointsCore;
  }
  async doCheckin(userId, groupId, dailyCheckin, streakBonus) {
    const today = this.getToday();
    const record = await this.pointsCore.getRecord(userId, groupId);
    if (record.lastCheckinDate === today) {
      return { record, message: "今天已签到过了" };
    }
    const yesterday = this.getYesterday();
    let streak = record.checkinStreak;
    if (record.lastCheckinDate === yesterday) {
      streak += 1;
    } else {
      streak = 1;
    }
    const bonusIndex = Math.min(streak, streakBonus.length) - 1;
    const bonus = streakBonus[bonusIndex] || 0;
    const totalReward = dailyCheckin + bonus;
    const updated = await this.pointsCore.addPoints(userId, groupId, totalReward, 999999);
    const key = this.pointsCore.getRecordKey(userId, groupId);
    const data = await this.pointsCore.storage.read();
    data.records[key].checkinStreak = streak;
    data.records[key].lastCheckinDate = today;
    await this.pointsCore.storage.write(data);
    let msg = `签到成功！获得 ${dailyCheckin} 积分`;
    if (bonus > 0) msg += `，连续签到第 ${streak} 天额外奖励 ${bonus} 积分`;
    msg += `，当前积分：${(await this.pointsCore.getRecord(userId, groupId)).points}`;
    return { record: updated, message: msg };
  }
  getToday() {
    const d = /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  getYesterday() {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
}
class CdkManager {
  storage;
  pointsCore;
  constructor(dataDir2, pointsCore) {
    this.storage = new JsonStorage(`${dataDir2}/cdk.json`, {
      entries: {},
      batches: []
    });
    this.pointsCore = pointsCore;
  }
  async init() {
    await this.storage.read();
  }
  async createBatch(name, amount, count, expireAt) {
    const batchId = randomBytes(4).toString("hex");
    const batch = {
      id: batchId,
      name,
      amount,
      count,
      usedCount: 0,
      expireAt,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const data = await this.storage.read();
    data.batches.push(batch);
    for (let i = 0; i < count; i++) {
      const code = this.generateCode();
      data.entries[code] = {
        code,
        batchId,
        amount,
        used: false,
        expireAt
      };
    }
    await this.storage.write(data);
    log.info(`CDK batch created: ${name} (${count} codes)`);
    return batch;
  }
  async redeem(code, userId, groupId) {
    const data = await this.storage.read();
    const entry = data.entries[code];
    if (!entry) {
      return { success: false, message: "CDK 无效", amount: 0 };
    }
    if (entry.used) {
      return { success: false, message: "CDK 已被使用", amount: 0 };
    }
    if (new Date(entry.expireAt) < /* @__PURE__ */ new Date()) {
      return { success: false, message: "CDK 已过期", amount: 0 };
    }
    entry.used = true;
    entry.usedBy = userId;
    entry.usedAt = (/* @__PURE__ */ new Date()).toISOString();
    const batch = data.batches.find((b) => b.id === entry.batchId);
    if (batch) batch.usedCount += 1;
    await this.storage.write(data);
    await this.pointsCore.addPoints(userId, groupId, entry.amount, 999999);
    return { success: true, message: `兑换成功，获得 ${entry.amount} 积分`, amount: entry.amount };
  }
  async getBatches() {
    const data = await this.storage.read();
    return data.batches;
  }
  async getUnusedCodes(batchId) {
    const data = await this.storage.read();
    return Object.values(data.entries).filter((e) => e.batchId === batchId && !e.used);
  }
  generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const code = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return code;
  }
}
class TitleManager {
  api;
  config;
  pointsCore;
  constructor(api, config, pointsCore) {
    this.api = api;
    this.config = config;
    this.pointsCore = pointsCore;
  }
  async setTitle(groupId, userId, title) {
    await this.api.setGroupSpecialTitle(groupId, userId, title);
  }
  async checkAndUpdateTitle(userId, groupId) {
    const titleMappings = this.config.get("points.titleMappings") || [];
    const record = await this.pointsCore.getRecord(userId, groupId);
    let matchedTitle = null;
    for (const mapping of titleMappings.sort((a, b) => b.points - a.points)) {
      if (record.totalPoints >= mapping.points) {
        matchedTitle = mapping.title;
        break;
      }
    }
    if (matchedTitle) {
      await this.api.setGroupSpecialTitle(groupId, userId, matchedTitle);
    }
    return matchedTitle;
  }
}
class ProfileManager {
  storage;
  pointsCore;
  constructor(dataDir2, pointsCore) {
    this.storage = new JsonStorage(`${dataDir2}/profile.json`, { profiles: {} });
    this.pointsCore = pointsCore;
  }
  async getProfile(userId, groupId) {
    const data = await this.storage.read();
    const profile = data.profiles[userId] || {
      userId,
      nickname: "",
      bio: "",
      customFields: {}
    };
    const points = await this.pointsCore.getRecord(userId, groupId);
    return { profile, points };
  }
  async updateProfile(userId, updates) {
    const data = await this.storage.read();
    const existing = data.profiles[userId] || {
      userId,
      nickname: "",
      bio: "",
      customFields: {}
    };
    const updated = { ...existing, ...updates, userId };
    data.profiles[userId] = updated;
    await this.storage.write(data);
    return updated;
  }
}
class StatsManager {
  storage;
  constructor(dataDir2) {
    this.storage = new JsonStorage(`${dataDir2}/msg_stats.json`, { stats: {} });
  }
  async init() {
    await this.storage.read();
  }
  async recordMessage(event) {
    const today = this.getToday();
    const key = `${event.group_id}_${event.user_id}_${today}`;
    const data = await this.storage.read();
    const existing = data.stats[key];
    if (existing) {
      existing.count += 1;
    } else {
      data.stats[key] = {
        groupId: String(event.group_id),
        userId: String(event.user_id),
        date: today,
        count: 1
      };
    }
    await this.storage.write(data);
  }
  async getGroupStats(groupId, period) {
    const data = await this.storage.read();
    const today = /* @__PURE__ */ new Date();
    let daysToInclude = 1;
    if (period === "week") daysToInclude = 7;
    if (period === "month") daysToInclude = 30;
    const validDates = /* @__PURE__ */ new Set();
    for (let i = 0; i < daysToInclude; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      validDates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    const userCounts = /* @__PURE__ */ new Map();
    for (const stat of Object.values(data.stats)) {
      if (stat.groupId === String(groupId) && validDates.has(stat.date)) {
        const current = userCounts.get(stat.userId) || 0;
        userCounts.set(stat.userId, current + stat.count);
      }
    }
    return Array.from(userCounts.entries()).map(([userId, count]) => ({ userId, count })).sort((a, b) => b.count - a.count);
  }
  async getGlobalStats(groupId, period) {
    return this.getGroupStats(groupId, period);
  }
  getToday() {
    const d = /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
}
function createPointsModule(ctx, api, config, dataDir2) {
  const pointsCore = new PointsCore(dataDir2);
  const checkinManager = new CheckinManager(pointsCore);
  const cdkManager = new CdkManager(dataDir2, pointsCore);
  const titleManager = new TitleManager(api, config, pointsCore);
  const profileManager = new ProfileManager(dataDir2, pointsCore);
  const statsManager = new StatsManager(dataDir2);
  pointsCore.init();
  cdkManager.init();
  statsManager.init();
  const prefix = config.get("bot").commandPrefix;
  ctx.registerEvent("message.group", async (event) => {
    const msgEvent = event;
    const pointsCfg = config.get("points");
    if (!pointsCfg.enabled) return;
    await pointsCore.addPoints(
      msgEvent.user_id,
      msgEvent.group_id,
      pointsCfg.perMessage,
      pointsCfg.maxPerMinute
    );
    await titleManager.checkAndUpdateTitle(msgEvent.user_id, msgEvent.group_id);
    await statsManager.recordMessage(msgEvent);
  }, 200);
  ctx.registerCommand({
    name: "签到",
    aliases: ["签到", "checkin", "qd"],
    prefix,
    args: [],
    permission: "all",
    cooldown: 5,
    handler: async (event) => {
      const msgEvent = event;
      const pointsCfg = config.get("points");
      const { message } = await checkinManager.doCheckin(
        msgEvent.user_id,
        msgEvent.group_id,
        pointsCfg.dailyCheckin,
        pointsCfg.streakBonus
      );
      return message;
    }
  });
  ctx.registerCommand({
    name: "积分",
    aliases: ["积分", "points", "jf", "my"],
    prefix,
    args: [],
    permission: "all",
    cooldown: 3,
    handler: async (event) => {
      const msgEvent = event;
      const record = await pointsCore.getRecord(msgEvent.user_id, msgEvent.group_id);
      return `当前积分：${record.points} | 累计：${record.totalPoints} | 连续签到：${record.checkinStreak}天`;
    }
  });
  ctx.registerCommand({
    name: "积分排行",
    aliases: ["积分排行", "rank", "phb"],
    prefix,
    args: [],
    permission: "all",
    cooldown: 10,
    handler: async (event) => {
      const msgEvent = event;
      const ranking = await pointsCore.getRanking(msgEvent.group_id, 10);
      if (ranking.length === 0) return "暂无积分数据";
      const lines = ranking.map((r, i) => `${i + 1}. ${r.userId} - ${r.points}分`);
      return `积分排行榜：
${lines.join("\n")}`;
    }
  });
  ctx.registerCommand({
    name: "cdk",
    aliases: ["cdk", "兑换", "dh"],
    prefix,
    args: [{ name: "code", type: "string", required: true }],
    permission: "all",
    cooldown: 5,
    handler: async (event, args) => {
      const msgEvent = event;
      const { message } = await cdkManager.redeem(
        String(args.code),
        String(msgEvent.user_id),
        String(msgEvent.group_id)
      );
      return message;
    }
  });
  ctx.registerCommand({
    name: "名片",
    aliases: ["名片", "profile", "mp"],
    prefix,
    args: [],
    permission: "all",
    cooldown: 5,
    handler: async (event) => {
      const msgEvent = event;
      const { profile, points } = await profileManager.getProfile(
        String(msgEvent.user_id),
        String(msgEvent.group_id)
      );
      const lines = [`用户：${profile.nickname || msgEvent.user_id}`];
      if (profile.bio) lines.push(`简介：${profile.bio}`);
      lines.push(`积分：${points.points} | 签到：${points.checkinStreak}天`);
      return lines.join("\n");
    }
  });
  ctx.registerCommand({
    name: "发言统计",
    aliases: ["发言统计", "stats", "fytj"],
    prefix,
    args: [{ name: "period", type: "string", required: false }],
    permission: "all",
    cooldown: 10,
    handler: async (event, args) => {
      const msgEvent = event;
      const periodStr = args.period || "week";
      const period = periodStr === "month" ? "month" : periodStr === "day" ? "day" : "week";
      const stats = await statsManager.getGroupStats(msgEvent.group_id, period);
      if (stats.length === 0) return "暂无发言统计";
      const top10 = stats.slice(0, 10);
      const periodLabel = { day: "今日", week: "本周", month: "本月" }[period];
      const lines = top10.map((s, i) => `${i + 1}. ${s.userId} - ${s.count}条`);
      return `${periodLabel}发言排行：
${lines.join("\n")}`;
    }
  });
  ctx.registerCommand({
    name: "创建CDK",
    aliases: ["创建cdk", "makecdk", "cjcdk"],
    prefix,
    args: [
      { name: "name", type: "string", required: true },
      { name: "amount", type: "number", required: true },
      { name: "count", type: "number", required: true }
    ],
    permission: "admin",
    cooldown: 10,
    handler: async (_event, args) => {
      const expireAt = new Date(Date.now() + 90 * 864e5).toISOString();
      const batch = await cdkManager.createBatch(String(args.name), Number(args.amount), Number(args.count), expireAt);
      return `CDK 批次已创建: ${batch.name} | ${batch.count} 个 | 面额 ${batch.amount} 积分 | ID: ${batch.id}`;
    }
  });
  ctx.registerCommand({
    name: "CDK列表",
    aliases: ["cdk列表", "cdklist"],
    prefix,
    args: [],
    permission: "admin",
    cooldown: 5,
    handler: async () => {
      const batches = await cdkManager.getBatches();
      if (batches.length === 0) return "暂无 CDK 批次";
      return batches.map((b) => `[${b.id}] ${b.name} | ${b.usedCount}/${b.count} 已用 | ${b.amount}积分`).join("\n");
    }
  });
  ctx.registerCommand({
    name: "CDK导出",
    aliases: ["cdk导出", "exportcdk"],
    prefix,
    args: [{ name: "batchId", type: "string", required: true }],
    permission: "admin",
    cooldown: 10,
    handler: async (_event, args) => {
      const codes = await cdkManager.getUnusedCodes(String(args.batchId));
      if (codes.length === 0) return "该批次无未使用 CDK";
      return `未使用 CDK (${codes.length}个):
${codes.map((c) => c.code).join("\n")}`;
    }
  });
  ctx.registerCommand({
    name: "加减分",
    aliases: ["加减分", "setpoints", "jjf"],
    prefix,
    args: [
      { name: "target", type: "user", required: true },
      { name: "amount", type: "number", required: true }
    ],
    permission: "admin",
    cooldown: 3,
    handler: async (event, args) => {
      const e = event;
      const record = await pointsCore.getRecord(Number(args.target), e.group_id);
      const newPoints = record.points + Number(args.amount);
      await pointsCore.setPoints(Number(args.target), e.group_id, Math.max(0, newPoints));
      return `用户 ${args.target} 积分已调整为 ${Math.max(0, newPoints)}`;
    }
  });
  ctx.registerCommand({
    name: "签到设置",
    aliases: ["签到设置", "checkinset", "qdsz"],
    prefix,
    args: [
      { name: "key", type: "string", required: true },
      { name: "value", type: "string", required: true }
    ],
    permission: "admin",
    cooldown: 3,
    handler: async (_event, args) => {
      const key = String(args.key);
      const val = String(args.value);
      if (key === "每日积分") {
        await config.set("points.dailyCheckin", Number(val));
        return `每日签到基础积分已设为 ${val}`;
      }
      if (key === "递增系数") {
        const tiers = val.split(",").map(Number);
        await config.set("points.streakBonus", tiers);
        return `签到递增系数已设为 ${val}`;
      }
      if (key === "开关" || key === "enabled") {
        await config.set("points.enabled", val === "on" || val === "开启" || val === "true");
        return `积分系统已${val === "on" || val === "开启" ? "开启" : "关闭"}`;
      }
      return "支持的设置项: 每日积分, 递增系数, 开关";
    }
  });
  ctx.registerCommand({
    name: "称号管理",
    aliases: ["称号", "title", "ch"],
    prefix,
    args: [
      { name: "action", type: "string", required: true },
      { name: "rest", type: "rest", required: false }
    ],
    permission: "admin",
    cooldown: 3,
    handler: async (_event, args) => {
      const action = String(args.action);
      const titles = [...config.get("points.titleMappings") || []];
      if (action === "列表" || action === "list") {
        if (titles.length === 0) return "暂无称号配置";
        return titles.map((t, i) => `${i + 1}. ${t.title} (需${t.points}积分)`).join("\n");
      }
      if (action === "添加" || action === "add") {
        const rest = String(args.rest || "");
        const parts = rest.split(/\s+/);
        const title = parts[0];
        const minPoints = Number(parts[1]);
        if (!title || isNaN(minPoints)) return "用法: /称号 添加 名称 最低积分";
        titles.push({ title, points: minPoints });
        await config.set("points.titleMappings", titles);
        return `称号已添加: ${title} (需${minPoints}积分)`;
      }
      if (action === "删除" || action === "del") {
        const idx = Number(args.rest) - 1;
        if (isNaN(idx) || idx < 0 || idx >= titles.length) return "无效的序号";
        const removed = titles.splice(idx, 1)[0];
        await config.set("points.titleMappings", titles);
        return `已删除称号: ${removed.title}`;
      }
      return "用法: /称号 列表|添加|删除";
    }
  });
}
function createGroupManagementModule(ctx, api, config, dataDir2) {
  const prefix = config.get("bot").commandPrefix;
  const blacklistStore = new JsonStorage(`${dataDir2}/blacklist.json`, { entries: [] });
  const muteLogStore = new JsonStorage(`${dataDir2}/mute_log.json`, { logs: [] });
  const recallLogStore = new JsonStorage(`${dataDir2}/recall_log.json`, { logs: [] });
  const floodCounters = /* @__PURE__ */ new Map();
  const captchaSessions = /* @__PURE__ */ new Map();
  const muteHistory = /* @__PURE__ */ new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, counter] of floodCounters) {
      if (now - counter.firstTime > config.get("groupManagement").floodDetect.windowSeconds * 1e3) {
        floodCounters.delete(key);
      }
    }
    for (const [key, session] of captchaSessions) {
      if (now > session.expiresAt) {
        const s = captchaSessions.get(key);
        captchaSessions.delete(key);
        if (s) {
          api.setGroupKick(s.groupId, s.userId, true).catch(() => {
          });
        }
      }
    }
  }, 1e4);
  blacklistStore.read();
  muteLogStore.read();
  recallLogStore.read();
  ctx.registerEvent("notice.group_increase", async (event) => {
    const e = event;
    const gmCfg = config.get("groupManagement");
    const blacklist = await blacklistStore.read();
    const isBanned = blacklist.entries.some(
      (b) => String(b.userId) === String(e.user_id) && (b.groupId === "*" || String(b.groupId) === String(e.group_id))
    );
    if (isBanned) {
      await api.setGroupKick(e.group_id, e.user_id, true);
      log.info(`Blacklisted user kicked: ${e.user_id} from ${e.group_id}`);
      return;
    }
    if (gmCfg.captcha.enabled) {
      const a = Math.floor(Math.random() * 20) + 1;
      const b = Math.floor(Math.random() * 20) + 1;
      const answer = a + b;
      const key = `${e.group_id}_${e.user_id}`;
      captchaSessions.set(key, {
        groupId: e.group_id,
        userId: e.user_id,
        answer,
        expiresAt: Date.now() + gmCfg.captcha.timeoutSeconds * 1e3
      });
      await api.sendGroupMsg(e.group_id, [
        { type: "at", data: { qq: String(e.user_id) } },
        { type: "text", data: { text: ` 欢迎入群！请在 ${gmCfg.captcha.timeoutSeconds} 秒内回复验证问题：${a} + ${b} = ?` } }
      ]);
    }
  }, 10);
  ctx.registerEvent("message.group", async (event) => {
    const e = event;
    const gmCfg = config.get("groupManagement");
    const raw = e.raw_message.trim();
    const captchaKey = `${e.group_id}_${e.user_id}`;
    const session = captchaSessions.get(captchaKey);
    if (session) {
      const userAnswer = parseInt(raw, 10);
      if (!isNaN(userAnswer) && userAnswer === session.answer) {
        captchaSessions.delete(captchaKey);
        await api.sendGroupMsg(e.group_id, [
          { type: "at", data: { qq: String(e.user_id) } },
          { type: "text", data: { text: " 验证通过！欢迎加入~" } }
        ]);
      }
      return;
    }
    const whitelist = config.get("groupManagement").whitelist;
    const groupWhitelist = whitelist[String(e.group_id)] || [];
    const isWhitelisted = groupWhitelist.includes(String(e.user_id));
    if (gmCfg.adDetect.enabled && !isWhitelisted) {
      for (const rule of gmCfg.adDetect.rules) {
        if (!rule.enabled) continue;
        let matched = false;
        if (rule.type === "keyword") {
          matched = raw.includes(rule.pattern);
        } else if (rule.type === "regex") {
          try {
            matched = new RegExp(rule.pattern).test(raw);
          } catch {
          }
        }
        if (matched || /https?:\/\/[^\s]+/.test(raw)) {
          log.info(`Ad detected: ${e.user_id} in ${e.group_id}`, { pattern: rule.pattern });
          switch (gmCfg.adDetect.action) {
            case "recall":
              await api.deleteMsg(e.message_id).catch(() => {
              });
              break;
            case "mute":
              await api.setGroupBan(e.group_id, e.user_id, gmCfg.mute.defaultDuration * 60);
              break;
            case "kick":
              await api.setGroupKick(e.group_id, e.user_id);
              break;
            case "warn":
              await api.sendGroupMsg(e.group_id, [
                { type: "at", data: { qq: String(e.user_id) } },
                { type: "text", data: { text: " 请勿发送广告信息！" } }
              ]);
              break;
          }
          return;
        }
      }
    }
    if (gmCfg.floodDetect.enabled && !isWhitelisted) {
      const floodKey = `${e.group_id}_${e.user_id}`;
      const now = Date.now();
      const existing = floodCounters.get(floodKey);
      if (existing && now - existing.firstTime < gmCfg.floodDetect.windowSeconds * 1e3) {
        existing.count += 1;
        if (existing.count >= gmCfg.floodDetect.maxMessages || existing.lastContent === raw) {
          floodCounters.delete(floodKey);
          switch (gmCfg.floodDetect.action) {
            case "mute":
              await api.setGroupBan(e.group_id, e.user_id, gmCfg.mute.defaultDuration * 60);
              await api.sendGroupMsg(e.group_id, [
                { type: "at", data: { qq: String(e.user_id) } },
                { type: "text", data: { text: ` 刷屏检测，已被禁言 ${gmCfg.mute.defaultDuration} 分钟` } }
              ]);
              break;
            case "warn":
              await api.sendGroupMsg(e.group_id, [
                { type: "at", data: { qq: String(e.user_id) } },
                { type: "text", data: { text: " 请勿刷屏！" } }
              ]);
              break;
          }
          return;
        }
        existing.lastContent = raw;
      } else {
        floodCounters.set(floodKey, { count: 1, firstTime: now, lastContent: raw });
      }
    }
  }, 60);
  ctx.registerCommand({
    name: "禁言",
    aliases: ["禁言", "mute", "jy"],
    prefix,
    args: [
      { name: "target", type: "user", required: true },
      { name: "duration", type: "number", required: false },
      { name: "reason", type: "rest", required: false }
    ],
    permission: "group_admin",
    cooldown: 3,
    handler: async (event, args) => {
      const e = event;
      const targetId = Number(args.target);
      const duration = args.duration || config.get("groupManagement").mute.defaultDuration;
      const reason = args.reason || "无";
      const gmCfg = config.get("groupManagement");
      await api.setGroupBan(e.group_id, targetId, duration * 60);
      const logData = await muteLogStore.read();
      logData.logs.push({
        userId: String(targetId),
        groupId: String(e.group_id),
        operatorId: String(e.user_id),
        duration,
        reason,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      await muteLogStore.write(logData);
      if (gmCfg.mute.escalate) {
        const muteKey = `${e.group_id}_${targetId}`;
        const count = (muteHistory.get(muteKey) || 0) + 1;
        muteHistory.set(muteKey, count);
        if (gmCfg.mute.thresholds[1] > 0 && count >= gmCfg.mute.thresholds[1] && gmCfg.mute.thresholds[2] < 0) {
          await api.setGroupKick(e.group_id, targetId);
          muteHistory.delete(muteKey);
          return `用户 ${targetId} 被禁言 ${count} 次，已自动移出群聊`;
        }
      }
      return `用户 ${targetId} 已被禁言 ${duration} 分钟。原因：${reason}`;
    }
  });
  ctx.registerCommand({
    name: "撤回",
    aliases: ["撤回", "recall", "ch"],
    prefix,
    args: [
      { name: "target", type: "user", required: false },
      { name: "count", type: "number", required: false }
    ],
    permission: "group_admin",
    cooldown: 2,
    handler: async (event, args) => {
      const e = event;
      if (e.message?.[0]?.type !== "reply" && !args.target) {
        return "请回复需要撤回的消息，或使用 /撤回 @用户 数量";
      }
      if (e.message?.[0]?.type === "reply") {
        await api.deleteMsg(e.message_id - 1 || e.message_id);
        const logData = await recallLogStore.read();
        logData.logs.push({
          groupId: String(e.group_id),
          operatorId: String(e.user_id),
          targetId: String(e.message?.[0]?.data?.id || "unknown"),
          count: 1,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        await recallLogStore.write(logData);
        return "消息已撤回";
      }
      return "撤回功能需要回复目标消息";
    }
  });
  ctx.registerCommand({
    name: "黑名单添加",
    aliases: ["拉黑", "黑名单添加", "blacklist"],
    prefix,
    args: [
      { name: "target", type: "user", required: true },
      { name: "reason", type: "rest", required: false }
    ],
    permission: "admin",
    cooldown: 3,
    handler: async (event, args) => {
      const e = event;
      const targetId = String(args.target);
      const reason = args.reason || "无";
      const groupId = String(e.group_id);
      const data = await blacklistStore.read();
      const exists = data.entries.some((b) => b.userId === targetId && b.groupId === groupId);
      if (exists) return "该用户已在黑名单中";
      data.entries.push({
        userId: targetId,
        groupId,
        reason,
        operatorId: String(e.user_id),
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      await blacklistStore.write(data);
      return `用户 ${targetId} 已加入黑名单。原因：${reason}`;
    }
  });
  ctx.registerCommand({
    name: "白名单添加",
    aliases: ["白名单添加", "whitelist"],
    prefix,
    args: [{ name: "target", type: "user", required: true }],
    permission: "admin",
    cooldown: 3,
    handler: async (event, args) => {
      const e = event;
      const targetId = String(args.target);
      const groupId = String(e.group_id);
      const whitelist = config.get("groupManagement").whitelist;
      const groupWhitelist = whitelist[groupId] || [];
      if (groupWhitelist.includes(targetId)) return "该用户已在白名单中";
      groupWhitelist.push(targetId);
      await config.set(`groupManagement.whitelist.${groupId}`, groupWhitelist);
      return `用户 ${targetId} 已加入白名单`;
    }
  });
  ctx.registerCommand({
    name: "广告规则管理",
    aliases: ["广告规则", "adrule", "gggz"],
    prefix,
    args: [
      { name: "action", type: "string", required: true },
      { name: "type", type: "string", required: false },
      { name: "rest", type: "rest", required: false }
    ],
    permission: "admin",
    cooldown: 3,
    handler: async (event, args) => {
      const action = String(args.action);
      const gmCfg = config.get("groupManagement");
      const rules = [...gmCfg.adDetect.rules];
      if (action === "列表" || action === "list") {
        if (rules.length === 0) return "暂无广告规则";
        return rules.map((r, i) => `${i + 1}. [${r.type}] ${r.pattern} ${r.enabled ? "启用" : "禁用"}`).join("\n");
      }
      if (action === "添加" || action === "add") {
        const ruleType = String(args.type || "keyword");
        const pattern = String(args.rest || "");
        if (!pattern) return "用法: /广告规则 添加 keyword|regex 规则内容";
        rules.push({ id: Date.now().toString(36), name: pattern.slice(0, 10), type: ruleType, pattern, enabled: true });
        await config.set("groupManagement.adDetect.rules", rules);
        return `广告规则已添加: ${pattern}`;
      }
      if (action === "删除" || action === "del") {
        const idx = Number(args.type) - 1;
        if (isNaN(idx) || idx < 0 || idx >= rules.length) return "无效的规则序号";
        const removed = rules.splice(idx, 1)[0];
        await config.set("groupManagement.adDetect.rules", rules);
        return `已删除规则: ${removed.pattern}`;
      }
      return "用法: /广告规则 列表|添加|删除";
    }
  });
  ctx.registerCommand({
    name: "刷屏设置",
    aliases: ["刷屏设置", "floodset", "spsz"],
    prefix,
    args: [
      { name: "windowSeconds", type: "number", required: true },
      { name: "maxMessages", type: "number", required: true }
    ],
    permission: "admin",
    cooldown: 3,
    handler: async (_event, args) => {
      const windowSec = Number(args.windowSeconds);
      const maxMsg = Number(args.maxMessages);
      await config.set("groupManagement.floodDetect.windowSeconds", windowSec);
      await config.set("groupManagement.floodDetect.maxMessages", maxMsg);
      return `刷屏检测已设置: ${windowSec}秒内超过${maxMsg}条触发`;
    }
  });
  ctx.registerCommand({
    name: "验证开关",
    aliases: ["验证开关", "captcha", "yzkz"],
    prefix,
    args: [{ name: "action", type: "string", required: true }],
    permission: "admin",
    cooldown: 3,
    handler: async (_event, args) => {
      const action = String(args.action);
      if (action === "开启" || action === "on" || action === "1") {
        await config.set("groupManagement.captcha.enabled", true);
        return "人机验证已开启";
      }
      if (action === "关闭" || action === "off" || action === "0") {
        await config.set("groupManagement.captcha.enabled", false);
        return "人机验证已关闭";
      }
      return "用法: /验证开关 开启|关闭";
    }
  });
  ctx.registerCommand({
    name: "验证超时",
    aliases: ["验证超时", "captchaTimeout"],
    prefix,
    args: [{ name: "seconds", type: "number", required: true }],
    permission: "admin",
    cooldown: 3,
    handler: async (_event, args) => {
      await config.set("groupManagement.captcha.timeoutSeconds", Number(args.seconds));
      return `验证超时已设为 ${args.seconds} 秒`;
    }
  });
  ctx.registerCommand({
    name: "黑名单移除",
    aliases: ["取消拉黑", "unblacklist"],
    prefix,
    args: [{ name: "target", type: "user", required: true }],
    permission: "admin",
    cooldown: 3,
    handler: async (event, args) => {
      const e = event;
      const targetId = String(args.target);
      const groupId = String(e.group_id);
      const data = await blacklistStore.read();
      const idx = data.entries.findIndex((b) => b.userId === targetId && (b.groupId === groupId || b.groupId === "*"));
      if (idx === -1) return "该用户不在黑名单中";
      data.entries.splice(idx, 1);
      await blacklistStore.write(data);
      return `用户 ${targetId} 已从黑名单移除`;
    }
  });
  ctx.registerCommand({
    name: "黑名单列表",
    aliases: ["黑名单列表", "bllist"],
    prefix,
    args: [],
    permission: "admin",
    cooldown: 5,
    handler: async (event) => {
      const e = event;
      const data = await blacklistStore.read();
      const groupEntries = data.entries.filter((b) => b.groupId === String(e.group_id) || b.groupId === "*");
      if (groupEntries.length === 0) return "黑名单为空";
      return groupEntries.map((b, i) => `${i + 1}. ${b.userId} (${b.groupId === "*" ? "全局" : "本群"}) - ${b.reason}`).join("\n");
    }
  });
}
function createSocialModule(ctx, api, config, dataDir2) {
  const prefix = config.get("bot").commandPrefix;
  const voteStore = new JsonStorage(`${dataDir2}/vote.json`, { votes: [] });
  const lotteryStore = new JsonStorage(`${dataDir2}/lottery.json`, { lotteries: [] });
  const qaStore = new JsonStorage(`${dataDir2}/qa.json`, { entries: [] });
  voteStore.read();
  lotteryStore.read();
  qaStore.read();
  ctx.registerCommand({
    name: "戳一戳",
    aliases: ["戳一戳", "poke", "c"],
    prefix,
    args: [{ name: "target", type: "user", required: true }],
    permission: "all",
    cooldown: config.get("social").poke.cooldown,
    handler: async (event, args) => {
      const e = event;
      await api.sendPoke(Number(args.target), e.group_id);
      return null;
    }
  });
  ctx.registerCommand({
    name: "投票",
    aliases: ["投票", "vote", "tp"],
    prefix,
    args: [
      { name: "title", type: "string", required: true },
      { name: "options", type: "rest", required: true }
    ],
    permission: "all",
    cooldown: 10,
    handler: async (event, args) => {
      const e = event;
      const optionTexts = args.options.split(/[,，|、]/).map((s) => s.trim()).filter(Boolean);
      if (optionTexts.length < 2) return "投票需要至少2个选项，用逗号或竖线分隔";
      const data = await voteStore.read();
      const vote = {
        id: Date.now().toString(36),
        groupId: String(e.group_id),
        creatorId: String(e.user_id),
        title: String(args.title),
        options: optionTexts.map((text, i) => ({ index: i + 1, text, voters: [] })),
        multiple: false,
        expiresAt: new Date(Date.now() + 24 * 36e5).toISOString(),
        closed: false
      };
      data.votes.push(vote);
      await voteStore.write(data);
      const lines = [`投票：${vote.title}`, `ID: ${vote.id}`, ""];
      vote.options.forEach((o) => lines.push(`${o.index}. ${o.text}`));
      lines.push("", `回复投票编号参与投票，如 "投票 ${vote.id} 1"`);
      return lines.join("\n");
    }
  });
  ctx.registerCommand({
    name: "投票参与",
    aliases: ["投票参与", "castvote"],
    prefix,
    args: [
      { name: "voteId", type: "string", required: true },
      { name: "option", type: "number", required: true }
    ],
    permission: "all",
    cooldown: 2,
    handler: async (event, args) => {
      const e = event;
      const data = await voteStore.read();
      const vote = data.votes.find((v) => v.id === String(args.voteId) && !v.closed);
      if (!vote) return "投票不存在或已结束";
      if (new Date(vote.expiresAt) < /* @__PURE__ */ new Date()) {
        vote.closed = true;
        await voteStore.write(data);
        return "投票已过期";
      }
      const option = vote.options[Number(args.option) - 1];
      if (!option) return "无效的选项编号";
      if (!vote.multiple) {
        const alreadyVoted = vote.options.some((o) => o.voters.includes(String(e.user_id)));
        if (alreadyVoted) return "你已经投过票了";
      }
      option.voters.push(String(e.user_id));
      await voteStore.write(data);
      return `已投票：${option.text} (当前 ${option.voters.length} 票)`;
    }
  });
  ctx.registerCommand({
    name: "投票结果",
    aliases: ["投票结果", "voteresult"],
    prefix,
    args: [{ name: "voteId", type: "string", required: true }],
    permission: "all",
    cooldown: 3,
    handler: async (event, args) => {
      const data = await voteStore.read();
      const vote = data.votes.find((v) => v.id === String(args.voteId));
      if (!vote) return "投票不存在";
      const lines = [`投票：${vote.title}`, ""];
      vote.options.forEach((o) => lines.push(`${o.index}. ${o.text} - ${o.voters.length} 票`));
      return lines.join("\n");
    }
  });
  ctx.registerCommand({
    name: "抽奖",
    aliases: ["抽奖", "lottery", "cj"],
    prefix,
    args: [{ name: "description", type: "rest", required: true }],
    permission: "group_admin",
    cooldown: 30,
    handler: async (event, args) => {
      const e = event;
      const parts = args.description.split(/[,，]/).map((s) => s.trim());
      const data = await lotteryStore.read();
      const lottery = {
        id: Date.now().toString(36),
        groupId: String(e.group_id),
        creatorId: String(e.user_id),
        description: parts[0] || "抽奖",
        prizeCount: parseInt(parts[1]) || 1,
        minPoints: parseInt(parts[2]) || 0,
        expiresAt: new Date(Date.now() + 36e5).toISOString(),
        participants: [],
        winners: [],
        closed: false
      };
      data.lotteries.push(lottery);
      await lotteryStore.write(data);
      return `抽奖：${lottery.description} | 奖品数量：${lottery.prizeCount} | ID: ${lottery.id} | 回复 "参与抽奖 ${lottery.id}" 参与`;
    }
  });
  ctx.registerCommand({
    name: "参与抽奖",
    aliases: ["参与抽奖", "joinlottery"],
    prefix,
    args: [{ name: "lotteryId", type: "string", required: true }],
    permission: "all",
    cooldown: 5,
    handler: async (event, args) => {
      const e = event;
      const data = await lotteryStore.read();
      const lottery = data.lotteries.find((l) => l.id === String(args.lotteryId) && !l.closed);
      if (!lottery) return "抽奖不存在或已结束";
      if (lottery.participants.includes(String(e.user_id))) return "已参与";
      lottery.participants.push(String(e.user_id));
      await lotteryStore.write(data);
      return `参与成功，当前参与人数：${lottery.participants.length}`;
    }
  });
  ctx.registerCommand({
    name: "开奖",
    aliases: ["开奖", "drawlottery"],
    prefix,
    args: [{ name: "lotteryId", type: "string", required: true }],
    permission: "group_admin",
    cooldown: 10,
    handler: async (event, args) => {
      const data = await lotteryStore.read();
      const lottery = data.lotteries.find((l) => l.id === String(args.lotteryId) && !l.closed);
      if (!lottery) return "抽奖不存在或已结束";
      if (lottery.participants.length === 0) return "无人参与";
      const winners = [];
      const pool = [...lottery.participants];
      for (let i = 0; i < Math.min(lottery.prizeCount, pool.length); i++) {
        const idx = Math.floor(Math.random() * pool.length);
        winners.push(pool.splice(idx, 1)[0]);
      }
      lottery.winners = winners;
      lottery.closed = true;
      await lotteryStore.write(data);
      return `开奖结果：${winners.join(", ")}`;
    }
  });
  ctx.registerCommand({
    name: "问答",
    aliases: ["问", "ask", "qa", "w"],
    prefix,
    args: [{ name: "keyword", type: "rest", required: true }],
    permission: "all",
    cooldown: 3,
    handler: async (_event, args) => {
      const keyword = String(args.keyword).trim();
      const qaCfg = config.get("social").qa;
      if (!qaCfg.enabled) return null;
      const data = await qaStore.read();
      const matches = data.entries.filter((entry) => {
        if (entry.matchMode === "exact") {
          return entry.keywords.some((kw) => kw === keyword);
        }
        return entry.keywords.some((kw) => keyword.includes(kw) || kw.includes(keyword));
      });
      if (matches.length === 0) return null;
      return matches[0].answer;
    }
  });
  ctx.registerCommand({
    name: "AI语音",
    aliases: ["ai语音", "aivoice", "aiyy"],
    prefix,
    args: [{ name: "text", type: "rest", required: true }],
    permission: "all",
    cooldown: config.get("social").aiVoice.cooldown,
    handler: async (event, args) => {
      const e = event;
      const aiCfg = config.get("social").aiVoice;
      if (!aiCfg.enabled) return "AI语音功能未启用";
      if (!aiCfg.defaultCharacter) return "请先配置默认AI角色";
      await api.sendGroupAiRecord(aiCfg.defaultCharacter, e.group_id, String(args.text));
      return null;
    }
  });
  ctx.registerCommand({
    name: "问答管理",
    aliases: ["问答", "qamanage", "wd"],
    prefix,
    args: [
      { name: "action", type: "string", required: true },
      { name: "rest", type: "rest", required: false }
    ],
    permission: "admin",
    cooldown: 3,
    handler: async (_event, args) => {
      const action = String(args.action);
      const data = await qaStore.read();
      const qaEntries = data.entries;
      if (action === "列表" || action === "list") {
        if (qaEntries.length === 0) return "暂无问答条目";
        return qaEntries.map((q, i) => `${i + 1}. [${q.keywords.join(",")}] => ${q.answer}`).join("\n");
      }
      if (action === "添加" || action === "add") {
        const rest = String(args.rest || "");
        const sepIdx = rest.indexOf("|");
        if (sepIdx === -1) return "用法: /问答 添加 关键词1,关键词2|回答内容";
        const kw = rest.slice(0, sepIdx).split(",").map((k) => k.trim()).filter(Boolean);
        const answer = rest.slice(sepIdx + 1).trim();
        if (!kw.length || !answer) return "关键词和回答不能为空";
        qaEntries.push({ id: Date.now().toString(36), keywords: kw, answer, matchMode: "keyword", groupId: "*" });
        await qaStore.write(data);
        return `问答已添加: [${kw.join(",")}] => ${answer}`;
      }
      if (action === "删除" || action === "del") {
        const idx = Number(args.rest) - 1;
        if (isNaN(idx) || idx < 0 || idx >= qaEntries.length) return "无效的序号";
        const removed = qaEntries.splice(idx, 1)[0];
        await qaStore.write(data);
        return `已删除问答: [${removed.keywords.join(",")}]`;
      }
      return "用法: /问答 列表|添加|删除";
    }
  });
}
function createMessageModule(ctx, api, config, dataDir2) {
  const prefix = config.get("bot").commandPrefix;
  const archiveStore = new JsonStorage(`${dataDir2}/archive.json`, { messages: [] });
  const stickerStore = new JsonStorage(`${dataDir2}/stickers.json`, { stickers: [] });
  archiveStore.read();
  stickerStore.read();
  ctx.registerEvent("message.group", async (event) => {
    const e = event;
    const retentionDays = config.get("message.archiveRetentionDays") || 7;
    const data = await archiveStore.read();
    data.messages.push({
      groupId: String(e.group_id),
      userId: String(e.user_id),
      nickname: e.sender.nickname,
      content: e.raw_message,
      time: (/* @__PURE__ */ new Date()).toISOString()
    });
    const cutoff = new Date(Date.now() - retentionDays * 864e5).toISOString();
    data.messages = data.messages.filter((m) => m.time > cutoff);
    if (data.messages.length > 1e4) {
      data.messages = data.messages.slice(-5e3);
    }
    await archiveStore.write(data);
  }, 300);
  ctx.registerEvent("notice.group_upload", async (event) => {
    const e = event;
    const fileCfg = config.get("automation").autoFileDownload;
    if (!fileCfg.enabled) return;
    try {
      const fileInfo = await api.getFile(e.file.id);
      log.info(`File uploaded in group ${e.group_id}: ${e.file.name}`);
    } catch (err) {
      log.error("Failed to get uploaded file", { error: String(err) });
    }
  }, 200);
  ctx.registerCommand({
    name: "翻译",
    aliases: ["翻译", "translate", "fy"],
    prefix,
    args: [{ name: "text", type: "rest", required: true }],
    permission: "all",
    cooldown: 3,
    handler: async (_event, args) => {
      const text = String(args.text);
      const results = await api.translateEn2Zh([text]);
      if (results.length > 0) {
        return `翻译：${results[0]}`;
      }
      return "翻译失败";
    }
  });
  ctx.registerCommand({
    name: "表情",
    aliases: ["表情", "sticker", "bq"],
    prefix,
    args: [{ name: "keyword", type: "rest", required: true }],
    permission: "all",
    cooldown: 2,
    handler: async (event, args) => {
      const e = event;
      const data = await stickerStore.read();
      const keyword = String(args.keyword).toLowerCase();
      const matches = data.stickers.filter(
        (s) => s.keywords.some((k) => k.toLowerCase().includes(keyword))
      );
      if (matches.length > 0) {
        await api.sendGroupMsg(e.group_id, [
          { type: "image", data: { file: matches[0].url } }
        ]);
        return null;
      }
      try {
        const faces = await api.fetchCustomFace(1);
        if (faces.length > 0) {
          await api.sendGroupMsg(e.group_id, [
            { type: "image", data: { file: faces[0] } }
          ]);
          return null;
        }
      } catch {
      }
      return "没有找到相关表情";
    }
  });
  ctx.registerCommand({
    name: "转发",
    aliases: ["转发", "forward", "fwd"],
    prefix,
    args: [
      { name: "target", type: "number", required: true },
      { name: "msgId", type: "string", required: false }
    ],
    permission: "admin",
    cooldown: 5,
    handler: async (event, args) => {
      const e = event;
      if (e.message?.[0]?.type === "reply") {
        const replyId = Number(e.message[0].data.id);
        await api.forwardGroupSingleMsg(replyId, Number(args.target));
        return "消息已转发";
      }
      return "请回复要转发的消息";
    }
  });
}
function createOperationsModule(ctx, api, config, _dataDir) {
  const prefix = config.get("bot").commandPrefix;
  ctx.registerEvent("notice.group_increase", async (event) => {
    const e = event;
    const opsCfg = config.get("operations");
    if (opsCfg.welcome.enabled) {
      const template = opsCfg.welcome.template.replace("{user}", `[CQ:at,qq=${e.user_id}]`).replace("{group}", String(e.group_id));
      await api.sendGroupMsg(e.group_id, [
        { type: "text", data: { text: template } }
      ]);
    }
  }, 10);
  ctx.registerCommand({
    name: "引流",
    aliases: ["引流", "referral", "yl"],
    prefix,
    args: [],
    permission: "all",
    cooldown: 10,
    handler: async (_event) => {
      const opsCfg = config.get("operations");
      if (!opsCfg.referral.enabled || opsCfg.referral.targets.length === 0) {
        return "暂无引流目标群";
      }
      const targets = opsCfg.referral.targets.map((t) => `${t.name} (群号: ${t.groupId})，加入可得 ${t.bonus} 积分`).join("\n");
      return `引流目标群：
${targets}
加入后使用 "${prefix}引流签到 群号" 领取奖励`;
    }
  });
  ctx.registerCommand({
    name: "引流签到",
    aliases: ["引流签到", "ylsign"],
    prefix,
    args: [{ name: "groupId", type: "string", required: true }],
    permission: "all",
    cooldown: 30,
    handler: async (event, args) => {
      const e = event;
      const opsCfg = config.get("operations");
      const target = opsCfg.referral.targets.find((t) => t.groupId === String(args.groupId));
      if (!target) return "无效的引流群号";
      try {
        const memberInfo = await api.getGroupMemberInfo(Number(target.groupId), e.user_id);
        if (memberInfo) {
          return `引流签到成功！请在 ${prefix}cdk ${target.groupId}_${e.user_id} 领取 ${target.bonus} 奖励积分`;
        }
      } catch {
        return "请先加入目标群后再签到";
      }
      return "请先加入目标群后再签到";
    }
  });
  ctx.registerCommand({
    name: "欢迎消息",
    aliases: ["欢迎消息", "welcome", "hyxx"],
    prefix,
    args: [{ name: "action", type: "string", required: true }],
    permission: "admin",
    cooldown: 3,
    handler: async (_event, args) => {
      const action = String(args.action);
      const opsCfg = config.get("operations");
      if (action === "开启" || action === "on") {
        await config.set("operations.welcome.enabled", true);
        return `欢迎消息已开启。当前模板: ${opsCfg.welcome.template}`;
      }
      if (action === "关闭" || action === "off") {
        await config.set("operations.welcome.enabled", false);
        return "欢迎消息已关闭";
      }
      return "用法: /欢迎消息 开启|关闭";
    }
  });
  ctx.registerCommand({
    name: "欢迎模板",
    aliases: ["欢迎模板", "welcomeTpl"],
    prefix,
    args: [{ name: "text", type: "rest", required: true }],
    permission: "admin",
    cooldown: 3,
    handler: async (_event, args) => {
      await config.set("operations.welcome.template", String(args.text));
      return `欢迎模板已更新: ${args.text}`;
    }
  });
  ctx.registerCommand({
    name: "引流目标",
    aliases: ["引流管理", "refmanage"],
    prefix,
    args: [
      { name: "action", type: "string", required: true },
      { name: "groupId", type: "string", required: false },
      { name: "rest", type: "rest", required: false }
    ],
    permission: "admin",
    cooldown: 3,
    handler: async (_event, args) => {
      const action = String(args.action);
      const opsCfg = config.get("operations");
      const targets = [...opsCfg.referral.targets];
      if (action === "列表" || action === "list") {
        if (targets.length === 0) return "暂无引流目标群";
        return targets.map((t, i) => `${i + 1}. ${t.name} (${t.groupId}) +${t.bonus}积分`).join("\n");
      }
      if (action === "添加" || action === "add") {
        const rest = String(args.rest || "");
        const parts = rest.split(/\s+/);
        const groupId = String(args.groupId || parts[0] || "");
        const name = parts[1] || groupId;
        const bonus = Number(parts[2]) || 50;
        if (!groupId) return "用法: /引流管理 添加 群号 名称 积分";
        targets.push({ groupId, name, bonus: Math.max(1, bonus) });
        await config.set("operations.referral.targets", targets);
        return `引流目标已添加: ${name} (${groupId})`;
      }
      if (action === "删除" || action === "del") {
        const gid = String(args.groupId || "");
        const idx = targets.findIndex((t) => t.groupId === gid);
        if (idx === -1) return "未找到该引流目标";
        const removed = targets.splice(idx, 1)[0];
        await config.set("operations.referral.targets", targets);
        return `已删除引流目标: ${removed.name} (${removed.groupId})`;
      }
      return "用法: /引流管理 列表|添加|删除";
    }
  });
  ctx.registerCommand({
    name: "引流开关",
    aliases: ["引流开关"],
    prefix,
    args: [{ name: "action", type: "string", required: true }],
    permission: "admin",
    cooldown: 3,
    handler: async (_event, args) => {
      if (String(args.action) === "开启" || String(args.action) === "on") {
        await config.set("operations.referral.enabled", true);
        return "引流功能已开启";
      }
      if (String(args.action) === "关闭" || String(args.action) === "off") {
        await config.set("operations.referral.enabled", false);
        return "引流功能已关闭";
      }
      return "用法: /引流开关 开启|关闭";
    }
  });
}
function createAutomationModule(ctx, api, config, dataDir2, cron2) {
  const prefix = config.get("bot").commandPrefix;
  cron2.registerActionType("send_message", async (job) => {
    if (job.action.type !== "send_message") return;
    await api.sendGroupMsg(job.action.group_id, [
      { type: "text", data: { text: job.action.message } }
    ]);
  });
  cron2.registerActionType("group_sign", async (job) => {
    if (job.action.type !== "group_sign") return;
    await api.setGroupSign(job.action.group_id);
    log.info(`Auto sign completed for group: ${job.action.group_id}`);
  });
  cron2.registerActionType("notification", async (job) => {
    if (job.action.type !== "notification") return;
    await api.sendGroupMsg(job.action.group_id, [
      { type: "text", data: { text: job.action.message } }
    ]);
  });
  const autoCfg = config.get("automation");
  cron2.loadJobs(autoCfg.cronJobs);
  if (autoCfg.autoSign.enabled) {
    for (const groupId of autoCfg.autoSign.groups) {
      cron2.addJobFromConfig({
        id: `auto-sign-${groupId}`,
        name: `自动签到-${groupId}`,
        cron: autoCfg.autoSign.cron,
        action: { type: "group_sign", group_id: groupId },
        enabled: true
      });
    }
  }
  ctx.registerEvent("message.group", async (event) => {
    const e = event;
    const autoReadCfg = config.get("automation").autoRead;
    if (!autoReadCfg.enabled) return;
    const whitelist = autoReadCfg.whitelist;
    if (whitelist.length === 0 || whitelist.includes(String(e.group_id)) || whitelist.includes("*")) {
      await api.markGroupMsgAsRead(e.group_id).catch(() => {
      });
    }
  }, 300);
  ctx.registerEvent("notice.group_upload", async (event) => {
    const e = event;
    const fileCfg = config.get("automation").autoFileDownload;
    if (!fileCfg.enabled) return;
    try {
      const fileInfo = await api.getFile(e.file.id);
      const ext = e.file.name.split(".").pop() || "";
      if (fileCfg.filters.length > 0 && !fileCfg.filters.includes(ext)) return;
      const dir = fileCfg.directory || join(dataDir2, "files");
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, e.file.name), Buffer.from(fileInfo.base64, "base64"));
      log.info(`File downloaded: ${e.file.name}`);
    } catch (err) {
      log.error("Auto download failed", { error: String(err) });
    }
  }, 200);
  ctx.registerCommand({
    name: "定时任务",
    aliases: ["定时", "cron", "ds"],
    prefix,
    args: [],
    permission: "admin",
    cooldown: 5,
    handler: async () => {
      const jobs = cron2.listJobs();
      if (jobs.length === 0) return "暂无定时任务";
      const lines = jobs.map((j) => `[${j.config.enabled ? "启用" : "禁用"}] ${j.config.name} (${j.config.cron})`);
      return `定时任务列表：
${lines.join("\n")}`;
    }
  });
  ctx.registerCommand({
    name: "创建定时任务",
    aliases: ["创建定时", "addcron", "cjds"],
    prefix,
    args: [
      { name: "name", type: "string", required: true },
      { name: "cronExpr", type: "string", required: true },
      { name: "message", type: "rest", required: true }
    ],
    permission: "admin",
    cooldown: 5,
    handler: async (_event, args) => {
      const id = Date.now().toString(36);
      cron2.addJobFromConfig({
        id,
        name: String(args.name),
        cron: String(args.cronExpr),
        action: { type: "send_message", group_id: "", message: String(args.message) },
        enabled: true
      });
      return `定时任务已创建: ${args.name} | ${args.cronExpr} | ${args.message}`;
    }
  });
  ctx.registerCommand({
    name: "删除定时任务",
    aliases: ["删除定时", "delcron", "scds"],
    prefix,
    args: [{ name: "id", type: "string", required: true }],
    permission: "admin",
    cooldown: 3,
    handler: async (_event, args) => {
      cron2.removeJob(String(args.id));
      return `定时任务 ${args.id} 已删除`;
    }
  });
  ctx.registerCommand({
    name: "自动签到管理",
    aliases: ["自动签到", "autosign", "zdqd"],
    prefix,
    args: [
      { name: "action", type: "string", required: true },
      { name: "groupId", type: "string", required: false }
    ],
    permission: "admin",
    cooldown: 3,
    handler: async (_event, args) => {
      const action = String(args.action);
      const groups = [...config.get("automation").autoSign.groups];
      if (action === "列表" || action === "list") {
        if (groups.length === 0) return "暂无自动签到群";
        return groups.map((g, i) => `${i + 1}. ${g}`).join("\n");
      }
      if (action === "添加" || action === "add") {
        const gid = String(args.groupId || "");
        if (!gid) return "用法: /自动签到 添加 群号";
        if (groups.includes(gid)) return "该群已在自动签到列表中";
        groups.push(gid);
        await config.set("automation.autoSign.groups", groups);
        return `群 ${gid} 已加入自动签到列表`;
      }
      if (action === "删除" || action === "del") {
        const gid = String(args.groupId || "");
        const idx = groups.indexOf(gid);
        if (idx === -1) return "该群不在自动签到列表中";
        groups.splice(idx, 1);
        await config.set("automation.autoSign.groups", groups);
        return `群 ${gid} 已从自动签到列表移除`;
      }
      if (action === "开启" || action === "on") {
        await config.set("automation.autoSign.enabled", true);
        return "自动签到已开启";
      }
      if (action === "关闭" || action === "off") {
        await config.set("automation.autoSign.enabled", false);
        return "自动签到已关闭";
      }
      return "用法: /自动签到 列表|添加|删除|开启|关闭";
    }
  });
  ctx.registerCommand({
    name: "自动已读管理",
    aliases: ["自动已读", "autoread", "zdyd"],
    prefix,
    args: [
      { name: "action", type: "string", required: true },
      { name: "groupId", type: "string", required: false }
    ],
    permission: "admin",
    cooldown: 3,
    handler: async (_event, args) => {
      const action = String(args.action);
      const groups = [...config.get("automation").autoRead.whitelist];
      if (action === "列表" || action === "list") {
        if (groups.length === 0) return "暂无自动已读群";
        return groups.map((g, i) => `${i + 1}. ${g}`).join("\n");
      }
      if (action === "添加" || action === "add") {
        const gid = String(args.groupId || "");
        if (!gid) return "用法: /自动已读 添加 群号";
        if (groups.includes(gid)) return "该群已在自动已读列表中";
        groups.push(gid);
        await config.set("automation.autoRead.whitelist", groups);
        return `群 ${gid} 已加入自动已读列表`;
      }
      if (action === "删除" || action === "del") {
        const gid = String(args.groupId || "");
        const idx = groups.indexOf(gid);
        if (idx === -1) return "该群不在自动已读列表中";
        groups.splice(idx, 1);
        await config.set("automation.autoRead.whitelist", groups);
        return `群 ${gid} 已从自动已读列表移除`;
      }
      if (action === "开启" || action === "on") {
        await config.set("automation.autoRead.enabled", true);
        return "自动已读已开启";
      }
      if (action === "关闭" || action === "off") {
        await config.set("automation.autoRead.enabled", false);
        return "自动已读已关闭";
      }
      return "用法: /自动已读 列表|添加|删除|开启|关闭";
    }
  });
}
function createAccountModule(ctx, api, config, _dataDir, cron2) {
  const prefix = config.get("bot").commandPrefix;
  const accCfg = config.get("account");
  if (accCfg.avatarRotation.enabled && accCfg.avatarRotation.avatars.length > 0) {
    let avaIdx = 0;
    cron2.addJobFromConfig({
      id: "avatar-rotate",
      name: "头像轮换",
      cron: accCfg.avatarRotation.cron,
      action: { type: "avatar_rotate" },
      enabled: true
    });
    cron2.registerActionType("avatar_rotate", async () => {
      const avatar = accCfg.avatarRotation.avatars[avaIdx % accCfg.avatarRotation.avatars.length];
      avaIdx++;
      await api.setQqAvatar(avatar);
      log.info(`Avatar rotated to: ${avatar}`);
    });
  }
  if (accCfg.dynamicSignature.enabled && accCfg.dynamicSignature.templates.length > 0) {
    let sigIdx = 0;
    cron2.addJobFromConfig({
      id: "signature-update",
      name: "签名更新",
      cron: accCfg.dynamicSignature.cron,
      action: { type: "signature_update" },
      enabled: true
    });
    cron2.registerActionType("signature_update", async () => {
      let template = accCfg.dynamicSignature.templates[sigIdx % accCfg.dynamicSignature.templates.length];
      sigIdx++;
      const now = /* @__PURE__ */ new Date();
      template = template.replace("{time}", now.toLocaleTimeString()).replace("{date}", now.toLocaleDateString()).replace("{weekday}", ["日", "一", "二", "三", "四", "五", "六"][now.getDay()]);
      await api.setSelfLongnick(template);
      log.info(`Signature updated: ${template}`);
    });
  }
  if (accCfg.onlineStatus.enabled && accCfg.onlineStatus.schedule.length > 0) {
    for (const sched of accCfg.onlineStatus.schedule) {
      const [fromH, fromM] = sched.from.split(":").map(Number);
      const [toH, toM] = sched.to.split(":").map(Number);
      cron2.addJobFromConfig({
        id: `status-${sched.from}`,
        name: `状态切换-${sched.from}`,
        cron: `${fromM} ${fromH} * * *`,
        action: { type: "status_change", status: sched.status, ext_status: sched.ext_status },
        enabled: true
      });
      cron2.addJobFromConfig({
        id: `status-reset-${sched.to}`,
        name: `状态恢复-${sched.to}`,
        cron: `${toM} ${toH} * * *`,
        action: { type: "status_change", status: 10, ext_status: 0 },
        enabled: true
      });
    }
  }
  cron2.registerActionType("status_change", async (job) => {
    if (job.action.type !== "status_change") return;
    await api.setOnlineStatus(job.action.status, job.action.ext_status, 100);
    log.info(`Online status changed: ${job.action.status}`);
  });
  ctx.registerCommand({
    name: "好友列表",
    aliases: ["好友", "friends", "hy"],
    prefix,
    args: [],
    permission: "admin",
    cooldown: 30,
    handler: async () => {
      try {
        const friends = await api.getFriendsWithCategory();
        if (friends.length === 0) return "暂无好友数据";
        const lines = friends.map((cat) => {
          const buddyNames = cat.buddyList.slice(0, 5).map((b) => b.nick).join(", ");
          const more = cat.buddyList.length > 5 ? `...等${cat.buddyList.length}人` : "";
          return `[${cat.categoryName}] ${buddyNames}${more}`;
        });
        return `好友列表：
${lines.join("\n")}`;
      } catch {
        return "获取好友列表失败";
      }
    }
  });
  ctx.registerCommand({
    name: "点赞统计",
    aliases: ["点赞", "likes", "dz"],
    prefix,
    args: [],
    permission: "admin",
    cooldown: 30,
    handler: async () => {
      try {
        const data = await api.getProfileLike();
        return `点赞统计：总数 ${data.total_count} | 新增 ${data.new_count}`;
      } catch {
        return "获取点赞数据失败";
      }
    }
  });
  ctx.registerCommand({
    name: "头像管理",
    aliases: ["头像", "avatar", "tx"],
    prefix,
    args: [
      { name: "action", type: "string", required: true },
      { name: "url", type: "string", required: false }
    ],
    permission: "admin",
    cooldown: 5,
    handler: async (_event, args) => {
      const avatars = [...config.get("account").avatarRotation.avatars];
      if (String(args.action) === "列表" || String(args.action) === "list") {
        if (avatars.length === 0) return "头像列表为空";
        return avatars.map((a, i) => `${i + 1}. ${a}`).join("\n");
      }
      if (String(args.action) === "添加" || String(args.action) === "add") {
        const url = String(args.url || "");
        if (!url) return "用法: /头像 添加 图片URL";
        avatars.push(url);
        await config.set("account.avatarRotation.avatars", avatars);
        return `头像已添加: ${url} (共 ${avatars.length} 个)`;
      }
      if (String(args.action) === "删除" || String(args.action) === "del") {
        const idx = Number(args.url) - 1;
        if (isNaN(idx) || idx < 0 || idx >= avatars.length) return "无效的序号";
        avatars.splice(idx, 1);
        await config.set("account.avatarRotation.avatars", avatars);
        return `头像已删除 (剩余 ${avatars.length} 个)`;
      }
      return "用法: /头像 列表|添加|删除";
    }
  });
  ctx.registerCommand({
    name: "签名管理",
    aliases: ["签名", "signature", "qm"],
    prefix,
    args: [
      { name: "action", type: "string", required: true },
      { name: "rest", type: "rest", required: false }
    ],
    permission: "admin",
    cooldown: 5,
    handler: async (_event, args) => {
      const tmpls = [...config.get("account").dynamicSignature.templates];
      if (String(args.action) === "列表" || String(args.action) === "list") {
        if (tmpls.length === 0) return "签名模板为空";
        return tmpls.map((t, i) => `${i + 1}. ${t}`).join("\n");
      }
      if (String(args.action) === "添加" || String(args.action) === "add") {
        const text = String(args.rest || "");
        if (!text) return "用法: /签名 添加 模板文本 (可用: {time} {date} {weekday})";
        tmpls.push(text);
        await config.set("account.dynamicSignature.templates", tmpls);
        return `签名模板已添加: ${text}`;
      }
      if (String(args.action) === "删除" || String(args.action) === "del") {
        const idx = Number(args.rest) - 1;
        if (isNaN(idx) || idx < 0 || idx >= tmpls.length) return "无效的序号";
        tmpls.splice(idx, 1);
        await config.set("account.dynamicSignature.templates", tmpls);
        return `签名模板已删除 (剩余 ${tmpls.length} 个)`;
      }
      return "用法: /签名 列表|添加|删除";
    }
  });
  ctx.registerCommand({
    name: "状态开关",
    aliases: ["状态开关", "status"],
    prefix,
    args: [{ name: "action", type: "string", required: true }],
    permission: "admin",
    cooldown: 3,
    handler: async (_event, args) => {
      const action = String(args.action);
      if (action === "开启" || action === "on") {
        await config.set("account.onlineStatus.enabled", true);
        return "在线状态自动切换已开启";
      }
      if (action === "关闭" || action === "off") {
        await config.set("account.onlineStatus.enabled", false);
        return "在线状态自动切换已关闭";
      }
      return "用法: /状态开关 开启|关闭";
    }
  });
}
let eventRouter = new EventRouter();
let commandParser = new CommandParser();
let apiWrapper = new ApiWrapper();
let configManager;
let moduleLoader = new ModuleLoader();
let cronScheduler = new CronScheduler();
let dataDir = "";
const plugin_init = async (ctx) => {
  ctx.logger.info("========================================");
  ctx.logger.info("  Philip v1.0.0");
  ctx.logger.info("  Command prefix: /");
  ctx.logger.info("========================================");
  pluginState.ctx = ctx;
  dataDir = ctx.dataPath;
  const initCfg = loadConfigFile(ctx.configPath);
  configManager = ConfigManager.fromObject(initCfg);
  pluginState.config = initCfg;
  await configManager.init();
  eventRouter = new EventRouter();
  commandParser = new CommandParser();
  apiWrapper = new ApiWrapper();
  moduleLoader = new ModuleLoader();
  cronScheduler = new CronScheduler();
  registerCoreFeatures();
  registerModules();
  setupWebUI(ctx);
  const cfg = configManager.getAll();
  if (cfg.automation?.cronJobs) {
    cronScheduler.loadJobs(cfg.automation.cronJobs);
  }
  ctx.logger.info("NapCat Bot Plugin Suite loaded successfully");
};
const plugin_onmessage = async (_ctx, event) => {
  if (event.post_type !== "message" || event.message_type !== "group") return;
  await eventRouter.dispatch(event);
};
const plugin_cleanup = () => {
  cronScheduler.stopAll();
  pluginState.ctx = null;
};
const plugin_get_config = async () => {
  return configManager?.getAll() || {};
};
const plugin_set_config = async (_ctx, config) => {
  pluginState.config = config;
};
const plugin_config_ui = [
  { key: "bot.name", label: "机器人名称", type: "string", default: "群管机器人" },
  { key: "bot.commandPrefix", label: "命令前缀", type: "string", default: "/" },
  { key: "points.enabled", label: "积分系统", type: "boolean", default: true },
  { key: "points.dailyCheckin", label: "每日签到积分", type: "number", default: 10 },
  { key: "groupManagement.enabled", label: "群管系统", type: "boolean", default: true },
  { key: "groupManagement.floodDetect.enabled", label: "刷屏检测", type: "boolean", default: true },
  { key: "groupManagement.adDetect.enabled", label: "广告检测", type: "boolean", default: true },
  { key: "groupManagement.captcha.enabled", label: "人机验证", type: "boolean", default: false },
  { key: "operations.welcome.enabled", label: "入群欢迎", type: "boolean", default: true },
  { key: "operations.referral.enabled", label: "引流功能", type: "boolean", default: false },
  { key: "automation.autoSign.enabled", label: "自动签到", type: "boolean", default: false },
  { key: "automation.autoRead.enabled", label: "自动已读", type: "boolean", default: true },
  { key: "account.avatarRotation.enabled", label: "头像轮换", type: "boolean", default: false },
  { key: "account.dynamicSignature.enabled", label: "动态签名", type: "boolean", default: false }
];
function registerCoreFeatures() {
  eventRouter.register("core", "message.group", async (event) => {
    const msg = event;
    if (!msg.raw_message) return;
    const parsed = commandParser.parse(String(msg.raw_message));
    if (!parsed) return;
    const cmdEntry = commandParser.getCommands().find((c) => c.def.name === parsed.name);
    if (!cmdEntry) return;
    const cooldown = cmdEntry.def.cooldown || 0;
    if (!commandParser.checkCooldown(parsed.name, String(msg.user_id), cooldown)) {
      await apiWrapper.sendGroupMsg(Number(msg.group_id), [{ type: "text", data: { text: "命令冷却中，请稍后再试" } }]);
      return;
    }
    const userId = String(msg.user_id);
    const sender = msg.sender || {};
    const admins = configManager.get("bot").admins || [];
    switch (cmdEntry.def.permission) {
      case "admin":
        if (!admins.includes(userId)) return;
        break;
      case "group_admin":
        if (sender.role !== "owner" && sender.role !== "admin") return;
        break;
    }
    try {
      const result = await parsed.handler(event, parsed.args);
      if (result) {
        await apiWrapper.sendGroupMsg(Number(msg.group_id), [{ type: "text", data: { text: result } }]);
      }
    } catch (err) {
      pluginState.ctx?.logger.error("Command handler error", String(err));
      await apiWrapper.sendGroupMsg(Number(msg.group_id), [{ type: "text", data: { text: "命令执行出错" } }]);
    }
  }, 50);
}
function registerModules() {
  const cfg = configManager.getAll();
  moduleLoader.register({
    id: "points",
    name: "积分与会员",
    version: "1.0.0",
    enabled: cfg.points?.enabled ?? true,
    load: async () => {
      createPointsModule(getCtx("points"), apiWrapper, configManager, dataDir);
    },
    unload: async () => {
      eventRouter.unregister("points");
      commandParser.unregister("points");
    }
  });
  moduleLoader.register({
    id: "group-management",
    name: "群管系统",
    version: "1.0.0",
    enabled: cfg.groupManagement?.enabled ?? true,
    load: async () => {
      createGroupManagementModule(getCtx("group-management"), apiWrapper, configManager, dataDir);
    },
    unload: async () => {
      eventRouter.unregister("group-management");
      commandParser.unregister("group-management");
    }
  });
  moduleLoader.register({
    id: "social",
    name: "社交互动",
    version: "1.0.0",
    enabled: cfg.social?.poke?.enabled ?? true,
    load: async () => {
      createSocialModule(getCtx("social"), apiWrapper, configManager, dataDir);
    },
    unload: async () => {
      eventRouter.unregister("social");
      commandParser.unregister("social");
    }
  });
  moduleLoader.register({
    id: "message",
    name: "消息处理",
    version: "1.0.0",
    enabled: true,
    load: async () => {
      createMessageModule(getCtx("message"), apiWrapper, configManager, dataDir);
    },
    unload: async () => {
      eventRouter.unregister("message");
      commandParser.unregister("message");
    }
  });
  moduleLoader.register({
    id: "operations",
    name: "运营工具",
    version: "1.0.0",
    enabled: cfg.operations?.welcome?.enabled ?? true,
    load: async () => {
      createOperationsModule(getCtx("operations"), apiWrapper, configManager);
    },
    unload: async () => {
      eventRouter.unregister("operations");
      commandParser.unregister("operations");
    }
  });
  moduleLoader.register({
    id: "automation",
    name: "自动化",
    version: "1.0.0",
    enabled: true,
    load: async () => {
      createAutomationModule(getCtx("automation"), apiWrapper, configManager, dataDir, cronScheduler);
    },
    unload: async () => {
      eventRouter.unregister("automation");
      commandParser.unregister("automation");
    }
  });
  moduleLoader.register({
    id: "account",
    name: "账号管理",
    version: "1.0.0",
    enabled: true,
    load: async () => {
      createAccountModule(getCtx("account"), apiWrapper, configManager, dataDir, cronScheduler);
    },
    unload: async () => {
      eventRouter.unregister("account");
      commandParser.unregister("account");
    }
  });
  moduleLoader.loadAll();
}
function getCtx(moduleId) {
  const cfg = configManager.getAll();
  return {
    registerEvent: (eventType, handler, priority) => {
      eventRouter.register(moduleId, eventType, handler, priority);
    },
    registerCommand: (command) => {
      commandParser.register(moduleId, command);
    },
    isAdmin: (userId) => (cfg.bot?.admins || []).includes(userId)
  };
}
function setupWebUI(ctx) {
  try {
    ctx.router.page({
      path: "dashboard",
      title: "群管控制面板",
      htmlFile: "webui/index.html",
      description: "管理群管、积分、社交等模块"
    });
    ctx.router.static("/static", "webui");
    ctx.router.get("/api/modules", (_req, res) => {
      res.status(200).json(moduleLoader.getModuleStatus());
    });
    ctx.router.get("/api/config", (_req, res) => {
      res.status(200).json(configManager.getAll());
    });
    ctx.router.put("/api/config", async (req, res) => {
      try {
        pluginState.config = req.body;
        res.status(200).json({ success: true });
      } catch (err) {
        res.status(400).json({ error: String(err) });
      }
    });
  } catch {
    pluginState.ctx?.logger.warn("WebUI routes not available");
  }
}
function loadConfigFile(configPath) {
  try {
    const fs = require("fs");
    return JSON.parse(fs.readFileSync(configPath + "/config.json", "utf-8"));
  } catch {
    return {};
  }
}
export {
  plugin_cleanup,
  plugin_config_ui,
  plugin_get_config,
  plugin_init,
  plugin_onmessage,
  plugin_set_config
};
