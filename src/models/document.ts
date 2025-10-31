import { RPAAction } from './rpa-action.js';
import { TestCase } from './test-case.js';

export interface DocumentMetadata {
  processName: string;
  author: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  documentType: 'FUNCTIONAL_ANALYSIS' | 'TECHNICAL_SPECIFICATION' | 'USER_MANUAL';
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'ARCHIVED';
}

export interface ProcessDocument {
  metadata: DocumentMetadata;
  summary: string;
  rpaActions: RPAAction[];
  testCases: TestCase[];
  recommendations: string[];
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedDevelopmentTime: string;
  riskAssessment: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  type: 'standard' | 'detailed' | 'minimal';
  sections: DocumentSection[];
}

export interface DocumentSection {
  id: string;
  title: string;
  order: number;
  required: boolean;
  template: string;
}