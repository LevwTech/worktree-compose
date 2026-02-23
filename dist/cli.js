#!/usr/bin/env node
import { Command } from "commander";
import { startCommand } from "./commands/start.js";
import { stopCommand } from "./commands/stop.js";
import { restartCommand } from "./commands/restart.js";
import { listCommand } from "./commands/list.js";
import { promoteCommand } from "./commands/promote.js";
import { cleanCommand } from "./commands/clean.js";
import { startMcpServer } from "./mcp/server.js";
import { error } from "./utils/log.js";
const program = new Command();
program
    .name("wtc")
    .description("Zero-config Docker Compose isolation for git worktrees")
    .version("0.1.0");
program
    .command("start")
    .description("Start Docker Compose stacks for worktrees")
    .argument("[indices...]", "Worktree indices to start (omit for all)")
    .action((indices) => {
    wrap(() => startCommand(indices.map(Number)));
});
program
    .command("stop")
    .description("Stop Docker Compose stacks for worktrees")
    .argument("[indices...]", "Worktree indices to stop (omit for all)")
    .action((indices) => {
    wrap(() => stopCommand(indices.map(Number)));
});
program
    .command("restart")
    .description("Restart Docker Compose stacks for worktrees")
    .argument("[indices...]", "Worktree indices to restart (omit for all)")
    .action((indices) => {
    wrap(() => restartCommand(indices.map(Number)));
});
program
    .command("list")
    .alias("ls")
    .description("List all worktrees with ports and URLs")
    .action(() => {
    wrap(() => listCommand());
});
program
    .command("promote")
    .description("Copy changed files from a worktree into the current branch")
    .argument("<index>", "Worktree index to promote")
    .action((index) => {
    wrap(() => promoteCommand(Number(index)));
});
program
    .command("clean")
    .description("Stop all containers, remove all worktrees, prune everything")
    .action(() => {
    wrap(() => cleanCommand());
});
program
    .command("mcp")
    .description("Start the MCP server (stdio transport)")
    .action(() => {
    startMcpServer().catch((err) => {
        error(String(err));
        process.exit(1);
    });
});
function wrap(fn) {
    try {
        fn();
    }
    catch (err) {
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
program.parse();
