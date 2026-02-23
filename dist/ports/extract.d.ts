import type { ComposeService } from "../compose/types.js";
import type { PortMapping } from "./types.js";
export declare function extractPortMappings(services: ComposeService[]): PortMapping[];
export declare function suggestEnvVar(serviceName: string): string;
