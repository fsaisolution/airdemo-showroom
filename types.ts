
export enum DemoStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED'
}

export interface DemoStep {
  id: number;
  title: string;
  component: string;
  script: string;
  value: string;
  fallback: string;
}

export interface Demo {
  id: string;
  title: string;
  valueProp: string;
  url?: string;
  cover?: string;
  points?: string[];
  audience?: string;
  steps: { 
    id: string | number; 
    title: string; 
    desc?: string;
    component?: string;
    script?: string;
    value?: string;
    fallback?: string;
  }[];
  mainTable?: any[];
  secondaryTable?: any[];
  secondaryTables?: {
    management?: any[];
    equipment?: any[];
    factory?: any[];
  };
  aiInsights?: {
    conclusion: string;
    risks: string[];
    actions: string[];
    next: string;
  };
  isPlaceholder?: boolean;
}

export interface BotCard {
  title: string;
  fields: { label: string; value: string }[];
  actions: { label: string; primary?: boolean }[];
}

export interface BusinessContextScenario {
  background: string;
  goal: string;
  inputs: string[];
  constraints: string[];
  outputs: string[];
}

export interface McpTool {
  name: string;
  description: string;
}

export interface McpCapability {
  name: string;
  description: string;
  tools: McpTool[];
}

export interface EfficiencyTool {
  id: string;
  name: string;
  title: string;
  url: string;
  skills: string[];
  highlight: string;
  avatarUrl?: string;
}

export interface AgentProfile {
  name: string;
  role: string;
  responsibilities: string[];
}

export interface BusinessContext {
  id: string;
  title: string;
  category: string;
  description: string;
  scenario: BusinessContextScenario;
  mcps: McpCapability[];
  skills: string[];
  agents: AgentProfile[];
  prompt: string;
}
