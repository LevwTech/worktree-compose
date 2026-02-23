import { stopCommand } from "./stop.js";
import { startCommand } from "./start.js";
export function restartCommand(indices) {
    stopCommand(indices);
    startCommand(indices);
}
