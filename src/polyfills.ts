/* Import as Globals for Turbo Dependencies*/
import processPolyfill from "process/browser";
import { Buffer } from "buffer";

const globalScope = globalThis as typeof globalThis & {
  process?: typeof processPolyfill;
  Buffer?: typeof Buffer;
  global?: typeof globalThis;
};

globalScope.process = processPolyfill as typeof processPolyfill;
globalScope.Buffer = Buffer;
if (!globalScope.global) {
  globalScope.global = globalThis;
}
