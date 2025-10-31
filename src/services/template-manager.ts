import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../utils/logger.js';
import { FileUtils } from '../utils/file-utils.js';
import { DocumentTemplate, DocumentSection } from '../models/document.js';

export class TemplateManager {
  private templatesDir: string;
  private templates: Map<string, DocumentTemplate> = new Map();

  constructor(private logger: Logger) {
    this.templatesDir = path.join(process.cwd(), 'src', 'templates');
    this.initializeTemplates();
  }

  private async initializeTemplates() {
    await FileUtils.ensureDirectory(this.templatesDir);
    await this.loadDefaultTemplates();
  }

  private async loadDefaultTemplates() {
    const standardTemplate: DocumentTemplate = {
      id: 'standard',
      name: 'Standard RPA Analysis',
      description: 'Template standard per analisi funzionale RPA',
      type: 'standard',
      sections: [
        {
          id: 'general_info',
          title: 'Informazioni Generali',
          order: 1,
          required: true,
          template: 'general_info_template'
        },
        {
          id: 'executive_summary',
          title: 'Sommario Esecutivo',
          order: 2,
          required: true,
          template: 'executive_summary_template'
        },
        {
          id: 'rpa_actions',
          title: 'Azioni RPA',
          order: 3,
          required: true,
          template: 'rpa_actions_template'
        },
        {
          id: 'test_cases',
          title: 'Test Cases',
          order: 4,
          required: true,
          template: 'test_cases_template'
        },
        {
          id: 'recommendations',
          title: 'Raccomandazioni',
          order: 5,
          required: false,
          template: 'recommendations_template'
        }
      ]
    };

    this.templates.set('standard', standardTemplate);
    
    // Crea template markdown di base
    await this.createDefaultMarkdownTemplate();
  }

  private async createDefaultMarkdownTemplate() {
    const templateContent = `# 📋 Documento di Analisi Funzionale RPA

## {{PROCESS_NAME}}

---

### 📊 Informazioni Generali

| Campo | Valore |
|-------|--------|
| **Nome del Processo** | {{PROCESS_NAME}} |
| **Data di Creazione** | {{CREATION_DATE}} |
| **Versione** | {{VERSION}} |
| **Autore** | {{AUTHOR}} |
| **Azioni RPA Identificate** | {{RPA_ACTIONS_COUNT}} |
| **Test Case Generati** | {{TEST_CASES_COUNT}} |

---

### 🎯 Sommario Esecutivo

{{EXECUTIVE_SUMMARY}}

---

### 🤖 Azioni RPA Identificate

{{#RPA_ACTIONS}}
#### Azione {{STEP}}: {{DESCRIPTION}}

- **Tipo**: \`{{ACTION_TYPE}}\`
- **Categoria**: {{CATEGORY}}
- **Target**: \`{{TARGET}}\`
- **Parametri**: \`{{PARAMETERS}}\`

{{#PREREQUISITES}}
**Prerequisiti:**
{{#EACH}}
- {{.}}
{{/EACH}}
{{/PREREQUISITES}}

---
{{/RPA_ACTIONS}}

### 🧪 Test Cases

{{#TEST_CASES_BY_TYPE}}
#### {{TYPE_TITLE}}

{{#CASES}}
##### {{TITLE}}

- **ID**: {{ID}}
- **Priorità**: {{PRIORITY}}
- **Descrizione**: {{DESCRIPTION}}

{{#PRECONDITIONS}}
**Precondizioni:**
{{#EACH}}
- {{.}}
{{/EACH}}
{{/PRECONDITIONS}}

{{#STEPS}}
**Passi:**
{{#EACH}}
{{STEP}}. {{ACTION}}
   - *Risultato atteso*: {{EXPECTED_RESULT}}
{{/EACH}}
{{/STEPS}}

**Risultato finale**: {{EXPECTED_RESULT}}

---
{{/CASES}}
{{/TEST_CASES_BY_TYPE}}

### 💡 Raccomandazioni

{{#RECOMMENDATIONS}}
- {{.}}
{{/RECOMMENDATIONS}}

---

*Documento generato automaticamente dal Sistema di Analisi RPA*
`;

    const templatePath = path.join(this.templatesDir, 'functional-analysis-template.md');
    await fs.writeFile(templatePath, templateContent, 'utf-8');
    
    this.logger.info('✅ Template Markdown predefinito creato');
  }

  async getTemplate(templateId: string): Promise<DocumentTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async listTemplates(): Promise<DocumentTemplate[]> {
    return Array.from(this.templates.values());
  }

  async renderTemplate(templateId: string, data: Record<string, any>): Promise<string> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template non trovato: ${templateId}`);
    }

    const templatePath = path.join(this.templatesDir, `${templateId}-template.md`);
    
    try {
      let templateContent = await fs.readFile(templatePath, 'utf-8');
      
      // Simple template rendering (può essere sostituito con un engine più robusto come Handlebars)
      templateContent = this.simpleTemplateReplace(templateContent, data);
      
      return templateContent;
    } catch (error) {
      this.logger.error(`Errore nel rendering del template ${templateId}`, error);
      throw new Error(`Errore nel rendering del template: ${error}`);
    }
  }

  private simpleTemplateReplace(template: string, data: Record<string, any>): string {
    let result = template;
    
    // Replace simple variables {{VARIABLE}}
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    });
    
    // Handle arrays (basic implementation)
    if (data.RPA_ACTIONS && Array.isArray(data.RPA_ACTIONS)) {
      const actionsRegex = /{{#RPA_ACTIONS}}([\s\S]*?){{\/RPA_ACTIONS}}/g;
      const actionTemplate = result.match(actionsRegex)?.[0];
      
      if (actionTemplate) {
        let actionsContent = '';
        data.RPA_ACTIONS.forEach((action: any) => {
          let actionContent = actionTemplate
            .replace('{{#RPA_ACTIONS}}', '')
            .replace('{{/RPA_ACTIONS}}', '');
          
          Object.entries(action).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            actionContent = actionContent.replace(regex, String(value));
          });
          
          actionsContent += actionContent;
        });
        
        result = result.replace(actionsRegex, actionsContent);
      }
    }
    
    return result;
  }

  async validateTemplate(templateContent: string): Promise<boolean> {
    try {
      // Basic validation - check for required placeholders
      const requiredPlaceholders = [
        '{{PROCESS_NAME}}',
        '{{CREATION_DATE}}',
        '{{AUTHOR}}'
      ];
      
      return requiredPlaceholders.every(placeholder => 
        templateContent.includes(placeholder)
      );
    } catch (error) {
      this.logger.error('Errore nella validazione del template', error);
      return false;
    }
  }
}