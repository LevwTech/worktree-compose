export interface PortMapping {
    serviceName: string;
    envVar: string | null;
    defaultPort: number;
    containerPort: number;
    raw: string;
}
export interface PortAllocation {
    serviceName: string;
    envVar: string;
    port: number;
    containerPort: number;
}
