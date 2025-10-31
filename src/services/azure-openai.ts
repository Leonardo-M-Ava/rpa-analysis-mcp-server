import { OpenAI } from '@azure/openai';
import { Logger } from '../utils/logger.js';
import { RPAAction } from '../models/rpa-action.js';
import { TestCase } from '../models/test-case.js';
import { VideoFrame } from './video-processor.js';

export interface AnalysisResult {
  summary: string;
  rpaActions: RPAAction[];
  testCases: TestCase[];
  recommendations: string[];
  confidence: number;
}

export class AzureOpenAIService {
  private client: OpenAI;
  private deploymentName: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(private logger: Logger) {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4-vision';

    if (!endpoint || !apiKey) {
      throw new Error('Configurazione Azure OpenAI mancante. Verifica AZURE_OPENAI_ENDPOINT e AZURE_OPENAI_API_KEY');
    }

    this.client = new OpenAI({
      endpoint,
      apiKey,
      apiVersion: '2024-02-01',
    });

    this.logger.info('✅ Client Azure OpenAI inizializzato');
  }

  async analyzeFramesForRPA(frames: VideoFrame[], processName: string): Promise<AnalysisResult> {
    this.logger.info(`🤖 Inizio analisi di ${frames.length} frame con Azure OpenAI`);

    const prompt = this.buildRPAAnalysisPrompt(processName);
    const messages = this.buildAnalysisMessages(prompt, frames);

    try {
      const response = await this.callOpenAIWithRetry(messages);
      const result = this.parseAnalysisResponse(response);
      
      this.logger.info(`✅ Analisi completata: ${result.rpaActions.length} azioni, ${result.testCases.length} test case`);
      
      return result;
    } catch (error) {
      this.logger.error('Errore durante l\'analisi con Azure OpenAI', error);
      throw new Error(`Errore nell'analisi AI: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }

  private buildRPAAnalysisPrompt(processName: string): string {
    return `
# Analisi Video per Automazione RPA con Power Automate Desktop

Sei un esperto analista di processi RPA specializzato in Power Automate Desktop. 
Analizza attentamente i frame del video forniti per il processo: "${processName}".

## Obiettivi dell'Analisi:

1. **Identificare Azioni RPA**: Trova tutte le azioni che possono essere automatizzate
2. **Mappare su Power Automate Desktop**: Associa ogni azione al corretto tipo di action
3. **Creare Test Case Completi**: Genera scenari di test per validare l'automazione

## Power Automate Desktop Actions da Considerare:

**UI Automation:**
- Click, DoubleClick, RightClick
- SendKeys (Type text)
- GetText, GetAttribute
- WaitForElement, ElementExists
- TakeScreenshot

**Window Management:**
- ActivateWindow, CloseWindow
- MaximizeWindow, MinimizeWindow
- GetWindowDetails

**File/Folder Operations:**
- CopyFile, MoveFile, DeleteFile
- CreateFolder, GetFileInfo
- ReadTextFile, WriteTextFile

**Web Automation:**
- NavigateToUrl, ClickElement
- FillTextField, SelectDropdown
- ExtractData, WaitForPageLoad

**Data Operations:**
- ReadFromExcel, WriteToExcel
- DatabaseQuery, ReadCSV
- ConvertData, FilterData

**Control Flow:**
- If/Else conditions
- Loop operations
- Wait actions
- Error handling (Try/Catch)

## Formato Risposta Richiesto:

Fornisci la risposta in formato JSON valido:

\`\`\`json
{
  "summary": "Descrizione dettagliata del processo identificato e degli obiettivi dell'automazione",
  "confidence": 85,
  "rpaActions": [
    {
      "id": "action_001",
      "step": 1,
      "description": "Descrizione specifica dell'azione da automatizzare",
      "actionType": "ClickElement",
      "category": "UI_AUTOMATION",
      "target": {
        "selector": "css:button[id='login-btn']",
        "description": "Pulsante di login principale",
        "coordinates": { "x": 450, "y": 300 }
      },
      "parameters": {
        "clickType": "LeftClick",
        "waitBefore": 1000,
        "waitAfter": 2000
      },
      "prerequisites": [
        "Applicazione deve essere aperta",
        "Campi username e password compilati"
      ],
      "errorHandling": {
        "strategy": "RetryOnFail",
        "maxRetries": 3,
        "timeoutMs": 5000,
        "fallbackAction": "TakeScreenshot"
      },
      "validation": {
        "expectedResult": "Redirect alla dashboard",
        "validationMethod": "CheckUrlContains",
        "validationValue": "/dashboard"
      }
    }
  ],
  "testCases": [
    {
      "id": "tc_001",
      "type": "positive",
      "category": "FUNCTIONAL",
      "title": "Login con credenziali valide",
      "description": "Verifica che il processo di login funzioni correttamente con credenziali valide",
      "priority": "high",
      "preconditions": [
        "Applicazione accessibile",
        "Credenziali valide disponibili",
        "Connessione internet attiva"
      ],
      "steps": [
        {
          "step": 1,
          "action": "Aprire l'applicazione",
          "expectedResult": "Pagina di login visualizzata",
          "rpaActionId": "action_001"
        }
      ],
      "expectedResult": "Utente loggato con successo nella dashboard",
      "dataRequirements": {
        "username": "test_user",
        "password": "test_password"
      },
      "estimatedDuration": "30 secondi"
    }
  ],
  "recommendations": [
    "Implementare retry logic per azioni critiche",
    "Aggiungere screenshot per debugging",
    "Configurare timeout appropriati per elementi lenti"
  ],
  "technicalNotes": {
    "complexity": "medium",
    "estimatedDevelopmentTime": "2-3 giorni",
    "riskFactors": [
      "Possibili cambiamenti UI",
      "Dipendenza da connessione network"
    ]
  }
}
\`\`\`

## Linee Guida per l'Analisi:

1. **Precisione**: Ogni azione deve essere implementabile in Power Automate Desktop
2. **Robustezza**: Considera gestione errori e scenari edge case
3. **Manutenibilità**: Usa selettori stabili e parametri configurabili
4. **Performance**: Ottimizza wait times e timeout
5. **Testabilità**: Ogni azione deve essere verificabile

Analizza ora i frame forniti e genera l'analisi completa.
`;
  }

  private buildAnalysisMessages(prompt: string, frames: VideoFrame[]): any[] {
    const messages: any[] = [
      {
        role: 'system',
        content: prompt,
      },
    ];

    // Limita il numero di frame per evitare di superare i limiti di token
    const maxFrames = Math.min(frames.length, 15);
    const selectedFrames = this.selectBestFrames(frames, maxFrames);

    const imageContents = selectedFrames.map((frame, index) => ({
      type: 'image_url',
      image_url: {
        url: `data:image/png;base64,${frame.base64}`,
        detail: 'high',
      },
    }));

    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analizza questi ${selectedFrames.length} frame del video (su ${frames.length} totali) per identificare le azioni RPA e creare i test case. Ogni frame rappresenta un momento significativo del processo da automatizzare.`,
        },
        ...imageContents,
      ],
    });

    return messages;
  }

  private selectBestFrames(frames: VideoFrame[], maxFrames: number): VideoFrame[] {
    if (frames.length <= maxFrames) {
      return frames;
    }

    // Seleziona frame distribuiti uniformemente nel tempo
    const step = frames.length / maxFrames;
    const selectedFrames: VideoFrame[] = [];

    for (let i = 0; i < maxFrames; i++) {
      const index = Math.floor(i * step);
      selectedFrames.push(frames[index]);
    }

    return selectedFrames;
  }

  private async callOpenAIWithRetry(messages: any[]): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.info(`🔄 Tentativo ${attempt}/${this.maxRetries} chiamata Azure OpenAI`);

        const response = await this.client.chat.completions.create({
          model: this.deploymentName,
          messages,
          max_tokens: 4000,
          temperature: 0.1, // Bassa temperatura per risultati più deterministici
          top_p: 0.95,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Nessuna risposta ricevuta da Azure OpenAI');
        }

        this.logger.info('✅ Risposta ricevuta da Azure OpenAI');
        return content;

      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`⚠️  Tentativo ${attempt} fallito: ${lastError.message}`);

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          this.logger.info(`⏳ Attesa ${delay}ms prima del prossimo tentativo`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Errore Azure OpenAI dopo ${this.maxRetries} tentativi: ${lastError?.message}`);
  }

  private parseAnalysisResponse(content: string): AnalysisResult {
    try {
      // Estrai il JSON dalla risposta (potrebbe essere incluso in markdown)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Nessun JSON valido trovato nella risposta');
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      // Validazione della struttura
      if (!parsed.summary || !Array.isArray(parsed.rpaActions) || !Array.isArray(parsed.testCases)) {
        throw new Error('Struttura JSON non valida');
      }

      return {
        summary: parsed.summary,
        rpaActions: parsed.rpaActions.map(this.validateRPAAction),
        testCases: parsed.testCases.map(this.validateTestCase),
        recommendations: parsed.recommendations || [],
        confidence: parsed.confidence || 75,
      };

    } catch (error) {
      this.logger.error('Errore nel parsing della risposta AI', error);
      this.logger.debug('Contenuto risposta:', content);
      
      // Fallback con dati minimi
      return {
        summary: 'Errore nell\'analisi automatica del video. Analisi manuale richiesta.',
        rpaActions: [],
        testCases: [],
        recommendations: ['Verificare la qualità del video', 'Controllare la visibilità delle azioni'],
        confidence: 0,
      };
    }
  }

  private validateRPAAction(action: any): RPAAction {
    return {
      id: action.id || `action_${Date.now()}`,
      step: action.step || 1,
      description: action.description || 'Azione non specificata',
      actionType: action.actionType || 'Unknown',
      category: action.category || 'UI_AUTOMATION',
      target: action.target,
      parameters: action.parameters || {},
      prerequisites: action.prerequisites || [],
      errorHandling: action.errorHandling,
      validation: action.validation,
    };
  }

  private validateTestCase(testCase: any): TestCase {
    return {
      id: testCase.id || `tc_${Date.now()}`,
      type: testCase.type || 'positive',
      category: testCase.category || 'FUNCTIONAL',
      title: testCase.title || 'Test case senza titolo',
      description: testCase.description || 'Descrizione non disponibile',
      priority: testCase.priority || 'medium',
      preconditions: testCase.preconditions || [],
      steps: testCase.steps || [],
      expectedResult: testCase.expectedResult || 'Risultato non specificato',
      dataRequirements: testCase.dataRequirements,
      estimatedDuration: testCase.estimatedDuration,
    };
  }

  // Metodo per testare la connessione
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 10,
      });

      return !!response.choices[0]?.message?.content;
    } catch (error) {
      this.logger.error('Test connessione Azure OpenAI fallito', error);
      return false;
    }
  }
}