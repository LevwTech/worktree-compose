export interface WtcConfig {
    sync?: string[];
    envOverrides?: Record<string, string>;
}
export declare function loadConfig(repoRoot: string): WtcConfig;
