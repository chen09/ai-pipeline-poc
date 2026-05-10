import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PLUGIN_ID = "research-inbox-writer";
const DEFAULT_PROJECT_ROOT = "/Volumes/WDC2T/Project/ai-pipeline-poc";
const FILENAME_RE = /^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*-openclaw\.md$/;

function textResult(value) {
  return {
    content: [{ type: "text", text: String(value) }],
    details: {},
  };
}

function resolveInboxDir(projectRoot) {
  return path.resolve(projectRoot, "agent", "research", "inbox");
}

function validateFilename(filename) {
  const value = String(filename || "").trim();
  if (!value) throw new Error("filename is required");
  if (value.includes("/") || value.includes("\\")) {
    throw new Error("filename must not contain path separators");
  }
  if (!FILENAME_RE.test(value)) {
    throw new Error("filename must match YYYY-MM-DD-topic-openclaw.md");
  }
  return value;
}

function validateMarkdown(markdown) {
  const value = String(markdown || "").trimEnd();
  if (!value.trim()) throw new Error("markdown is required");
  if (!value.includes("# OpenClaw Daily Discovery Report")) {
    throw new Error("markdown must include '# OpenClaw Daily Discovery Report'");
  }
  return `${value}\n`;
}

function resolveOutputPath(inboxDir, filename) {
  const outputPath = path.resolve(inboxDir, filename);
  const relative = path.relative(inboxDir, outputPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("resolved output path escapes research inbox");
  }
  return outputPath;
}

export default {
  id: PLUGIN_ID,
  configSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      projectRoot: { type: "string" },
    },
  },
  register(api) {
    const projectRoot = String(api.pluginConfig?.projectRoot || DEFAULT_PROJECT_ROOT);
    const inboxDir = resolveInboxDir(projectRoot);
    api.logger.info(`[${PLUGIN_ID}] initialized (inboxDir=${inboxDir})`);

    api.registerTool(
      () => ({
        name: "research_inbox_write",
        label: "Research Inbox Write",
        description:
          "Write an OpenClaw daily discovery Markdown report to ai-pipeline-poc agent/research/inbox. Only YYYY-MM-DD-topic-openclaw.md filenames are allowed.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            filename: {
              type: "string",
              description: "Basename only, matching YYYY-MM-DD-topic-openclaw.md.",
            },
            markdown: {
              type: "string",
              description: "Full Markdown report content.",
            },
          },
          required: ["filename", "markdown"],
        },
        async execute(_toolCallId, args) {
          try {
            const filename = validateFilename(args?.filename);
            const markdown = validateMarkdown(args?.markdown);
            const outputPath = resolveOutputPath(inboxDir, filename);
            await mkdir(inboxDir, { recursive: true });
            await writeFile(outputPath, markdown, { encoding: "utf8", flag: "wx" });
            return textResult(
              JSON.stringify({
                ok: true,
                path: outputPath,
                bytes: Buffer.byteLength(markdown, "utf8"),
              }),
            );
          } catch (error) {
            return textResult(
              JSON.stringify({
                ok: false,
                error: "research_inbox_write_failed",
                message: String(error?.message || error),
              }),
            );
          }
        },
      }),
      { name: "research_inbox_write", optional: false },
    );
  },
};
