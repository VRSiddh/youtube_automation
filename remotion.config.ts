import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { Config } from "@remotion/cli/config";
import { nvencFfmpegOverride } from "./src/remotion/nvencFfmpegOverride.ts";
import { resolveGlRenderer } from "./src/remotion/resolveGlRenderer.ts";

/** Remotion loads this config as CJS — do not use `import.meta.url` (it is undefined). Assume CLI cwd is project root. */
const projectRoot = process.cwd();

/** Prepared by `prepareRemotion` — only voice + chosen background + SFX (not the whole `public/` tree). */
const remotionPublic = join(projectRoot, "remotion-public");
if (!existsSync(remotionPublic)) {
  mkdirSync(remotionPublic, { recursive: true });
}
Config.setPublicDir(remotionPublic);

Config.setEntryPoint("./src/remotion/entry.tsx");

const gl = resolveGlRenderer();
Config.setChromiumOpenGlRenderer(gl);

/** Still set — macOS can use VideoToolbox; Windows/Linux NVENC is applied in override below. */
Config.setHardwareAcceleration("if-possible");

/** Browser / FFmpeg chatter (helps diagnose GPU + encode). */
Config.setLevel("verbose");

let loggedNvenc = false;
Config.overrideFfmpegCommand((info) => {
  const next = nvencFfmpegOverride(info);
  if (
    !loggedNvenc &&
    next.includes("h264_nvenc")
  ) {
    loggedNvenc = true;
    console.error(
      "[remotion.config] REMOTION_NVENC=1 — using h264_nvenc. Requires a full FFmpeg with NVENC. Remotion’s bundled FFmpeg is CPU-only (libx264)."
    );
  }
  return next;
});
