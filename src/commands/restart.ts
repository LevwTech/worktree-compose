import { stopCommand } from "./stop.js";
import { startCommand } from "./start.js";

export function restartCommand(indices: number[]): void {
  stopCommand(indices);
  startCommand(indices);
}
