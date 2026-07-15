import { build } from "esbuild";

await build({
  entryPoints: ["./src/index.js"],
  bundle: true,
  format: "iife",
  globalName: "smartdict",
  outfile: "./dist/smartdict.browser.js",
  sourcemap: true,
  banner: {
    js: "/* smartdict v0.5.1 */"
  }
});
