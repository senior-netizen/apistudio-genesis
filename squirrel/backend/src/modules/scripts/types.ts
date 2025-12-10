export interface ScriptContext {
    pm: PM;
    console: Console;
}

export interface PM {
    environment: EnvironmentAPI;
    variables: VariablesAPI;
    request: RequestData;
    response?: ResponseData;
    test: (name: string, fn: () => void) => void;
    expect: (value: any) => any;
}

export interface EnvironmentAPI {
    get(key: string): any;
    set(key: string, value: any): void;
    unset(key: string): void;
    clear(): void;
    has(key: string): boolean;
}

export interface VariablesAPI {
    get(key: string): any;
    set(key: string, value: any): void;
    unset(key: string): void;
    has(key: string): boolean;
}

export interface RequestData {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
}

export interface ResponseData {
    code: number;
    status: string;
    headers: Record<string, string>;
    body: any;
    time: number;
    json(): any;
    text(): string;
}

export interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
}

export interface ScriptExecutionResult {
    success: boolean;
    tests: TestResult[];
    logs: string[];
    updatedVariables: Record<string, any>;
    error?: string;
}
