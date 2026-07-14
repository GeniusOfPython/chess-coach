import { readFile, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { aiCoachDevelopmentPlugin } from "./server/viteAiCoachPlugin";
import { resolveCoachCostSettings } from "./server/coachCostController";
import {
  buildServiceWorker,
  type ServiceWorkerBuildFile,
} from "./server/serviceWorkerBuild";

async function collectPublicFiles(
  directory: string,
  relativeDirectory = "",
): Promise<ServiceWorkerBuildFile[]> {
  const entries = await readdir(resolve(directory, relativeDirectory), {
    withFileTypes: true,
  });
  const files = await Promise.all(entries.map(async (entry) => {
    const relativePath = join(relativeDirectory, entry.name);

    if (entry.isDirectory()) {
      return collectPublicFiles(directory, relativePath);
    }

    return [{
      path: relativePath,
      content: await readFile(resolve(directory, relativePath)),
    }];
  }));

  return files.flat();
}

function automaticServiceWorkerVersion(): Plugin {
  let rootDirectory = "";
  let publicDirectory: string | false = false;
  let outputDirectory = "";

  return {
    name: "chess-coach-service-worker-version",
    apply: "build",
    configResolved(config) {
      rootDirectory = config.root;
      publicDirectory = config.publicDir;
      outputDirectory = resolve(config.root, config.build.outDir);
    },
    async buildStart() {
      await rm(resolve(outputDirectory, "sw.js"), { force: true });
    },
    async generateBundle(_options, bundle) {
      const bundleFiles: ServiceWorkerBuildFile[] = Object.values(bundle).map(
        (output) => ({
          path: output.fileName,
          content: output.type === "chunk" ? output.code : output.source,
        }),
      );
      const publicFiles = publicDirectory
        ? await collectPublicFiles(publicDirectory)
        : [];
      const template = await readFile(
        resolve(rootDirectory, "src/platform/serviceWorkerTemplate.js"),
        "utf8",
      );
      const serviceWorker = buildServiceWorker({
        template,
        files: [
          ...bundleFiles,
          ...publicFiles,
          {
            path: "index.html",
            content: await readFile(resolve(rootDirectory, "index.html")),
          },
        ],
      });

      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: serviceWorker.source,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      aiCoachDevelopmentPlugin({
        enabled: environment.AI_COACH_SERVER_ENABLED === "true",
        apiKey: environment.OPENAI_API_KEY,
        model: environment.OPENAI_MODEL,
        costSettings: resolveCoachCostSettings(environment),
      }),
      automaticServiceWorkerVersion(),
    ],
  };
});
