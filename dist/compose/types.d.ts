export interface ComposeService {
    name: string;
    ports: string[];
    build?: {
        context?: string;
        dockerfile?: string;
    };
    envFile?: string[];
}
export interface ComposeFile {
    services: ComposeService[];
    composePath: string;
}
