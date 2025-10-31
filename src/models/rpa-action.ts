export interface RPAActionTarget {
  selector?: string;
  description?: string;
  coordinates?: {
    x: number;
    y: number;
  };
  element?: string;
}

export interface RPAActionParameters {
  [key: string]: any;
  clickType?: 'LeftClick' | 'RightClick' | 'DoubleClick';
  waitBefore?: number;
  waitAfter?: number;
  timeout?: number;
  retries?: number;
}

export interface RPAErrorHandling {
  strategy: 'RetryOnFail' | 'ContinueOnError' | 'StopOnError' | 'CustomHandler';
  maxRetries?: number;
  timeoutMs?: number;
  fallbackAction?: string;
  errorMessage?: string;
}

export interface RPAActionValidation {
  expectedResult?: string;
  validationMethod?: string;
  validationValue?: string;
  successCriteria?: string[];
}

export interface RPAAction {
  id: string;
  step: number;
  description: string;
  actionType: string;
  category?: 'UI_AUTOMATION' | 'DATA_OPERATION' | 'FILE_OPERATION' | 'WEB_AUTOMATION' | 'SYSTEM_OPERATION';
  target?: RPAActionTarget;
  parameters?: RPAActionParameters;
  prerequisites?: string[];
  errorHandling?: RPAErrorHandling;
  validation?: RPAActionValidation;
  estimatedDuration?: string;
  complexity?: 'LOW' | 'MEDIUM' | 'HIGH';
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}