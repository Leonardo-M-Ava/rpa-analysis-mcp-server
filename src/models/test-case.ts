export interface TestCaseStep {
  step: number;
  action: string;
  expectedResult: string;
  rpaActionId?: string;
  data?: Record<string, any>;
}

export interface TestCaseDataRequirements {
  [key: string]: any;
  inputFiles?: string[];
  databases?: string[];
  credentials?: string[];
  environment?: string;
}

export interface TestCase {
  id: string;
  type: 'positive' | 'negative' | 'edge';
  category?: 'FUNCTIONAL' | 'INTEGRATION' | 'PERFORMANCE' | 'SECURITY' | 'USABILITY';
  title: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
  preconditions?: string[];
  steps?: TestCaseStep[];
  expectedResult?: string;
  dataRequirements?: TestCaseDataRequirements;
  estimatedDuration?: string;
  tags?: string[];
  automationLevel?: 'MANUAL' | 'SEMI_AUTOMATED' | 'FULLY_AUTOMATED';
}