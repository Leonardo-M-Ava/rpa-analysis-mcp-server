// ... (continuazione del file precedente)

  private generateFileName(processName: string, extension: string): string {
    const sanitizedName = processName
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    return `analisi_funzionale_${sanitizedName}_${timestamp}.${extension}`;
  }

  private async generateMarkdownDocument(options: DocumentGenerationOptions): Promise<string> {
    const content = this.buildMarkdownContent(options);
    
    const fileName = this.generateFileName(options.processName, 'md');
    const filePath = path.join(this.outputDir, fileName);

    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  private buildMarkdownContent(options: DocumentGenerationOptions): string {
    let content = `# 📋 Documento di Analisi Funzionale - ${options.processName}\n\n`;
    
    // Informazioni generali
    content += `## 📊 1. Informazioni Generali\n\n`;
    content += `| Campo | Valore |\n`;
    content += `|-------|--------|\n`;
    content += `| **Nome del Processo** | ${options.processName} |\n`;
    content += `| **Data di Creazione** | ${new Date().toLocaleDateString('it-IT')} |\n`;
    content += `| **Versione** | ${options.version || '1.0'} |\n`;
    content += `| **Autore** | ${options.author || 'Sistema Automatico RPA'} |\n`;
    content += `| **Azioni RPA** | ${options.rpaActions.length} |\n`;
    content += `| **Test Case** | ${options.testCases.length} |\n\n`;

    // Sommario esecutivo
    content += `## 🎯 2. Sommario Esecutivo\n\n`;
    content += `### Obiettivo\n`;
    content += `Questo documento presenta l'analisi funzionale del processo "${options.processName}" per l'implementazione di un'automazione RPA utilizzando Microsoft Power Automate Desktop.\n\n`;
    
    content += `### Risultati dell'Analisi\n`;
    content += `${options.summary}\n\n`;

    content += `### Benefici Attesi\n`;
    content += `- ⚡ Riduzione del tempo di esecuzione del processo\n`;
    content += `- 🎯 Eliminazione degli errori manuali\n`;
    content += `- 📊 Miglioramento della tracciabilità delle operazioni\n`;
    content += `- 👥 Liberazione di risorse umane per attività a maggior valore aggiunto\n\n`;

    // Azioni RPA
    content += `## 🤖 3. Azioni RPA Identificate\n\n`;
    content += `### Panoramica\n`;
    content += `Sono state identificate **${options.rpaActions.length}** azioni automatizzabili nel processo.\n\n`;

    options.rpaActions.forEach((action, index) => {
      content += `### 3.${index + 1} Azione ${action.step}: ${action.description}\n\n`;
      content += `| Attributo | Valore |\n`;
      content += `|-----------|--------|\n`;
      content += `| **ID** | \`${action.id}\` |\n`;
      content += `| **Tipo** | \`${action.actionType}\` |\n`;
      content += `| **Categoria** | ${action.category || 'N/A'} |\n`;
      
      if (action.target) {
        content += `| **Target** | \`${JSON.stringify(action.target, null, 2)}\` |\n`;
      }
      
      if (action.parameters && Object.keys(action.parameters).length > 0) {
        content += `| **Parametri** | \`${JSON.stringify(action.parameters, null, 2)}\` |\n`;
      }
      
      if (action.prerequisites && action.prerequisites.length > 0) {
        content += `| **Prerequisiti** | ${action.prerequisites.join('<br>')} |\n`;
      }

      content += `\n`;
    });

    // Test Cases
    content += `## 🧪 4. Test Cases\n\n`;
    
    const testGroups = this.groupTestCasesByType(options.testCases);
    
    Object.entries(testGroups).forEach(([type, testCases]) => {
      const emoji = type === 'positive' ? '✅' : type === 'negative' ? '❌' : '⚠️';
      const typeTitle = this.getTestTypeTitle(type);
      
      content += `### ${emoji} 4.1 ${typeTitle}\n\n`;
      
      testCases.forEach((testCase, index) => {
        content += `#### Test Case ${testCase.id}: ${testCase.title}\n\n`;
        content += `| Attributo | Valore |\n`;
        content += `|-----------|--------|\n`;
        content += `| **Tipo** | ${testCase.type.toUpperCase()} |\n`;
        content += `| **Priorità** | ${(testCase.priority || 'medium').toUpperCase()} |\n`;
        content += `| **Descrizione** | ${testCase.description} |\n`;
        
        if (testCase.preconditions && testCase.preconditions.length > 0) {
          content += `| **Precondizioni** | ${testCase.preconditions.join('<br>')} |\n`;
        }
        
        if (testCase.steps && testCase.steps.length > 0) {
          content += `\n**Passi da eseguire:**\n`;
          testCase.steps.forEach(step => {
            content += `${step.step}. ${step.action}\n`;
            content += `   - *Risultato atteso*: ${step.expectedResult}\n`;
          });
        }
        
        if (testCase.expectedResult) {
          content += `\n**Risultato Finale**: ${testCase.expectedResult}\n`;
        }
        
        content += `\n---\n\n`;
      });
    });

    // Raccomandazioni
    content += `## 💡 5. Raccomandazioni\n\n`;
    content += `### Raccomandazioni Specifiche\n`;
    
    if (options.recommendations.length > 0) {
      options.recommendations.forEach((recommendation, index) => {
        content += `${index + 1}. ${recommendation}\n`;
      });
    } else {
      content += `Nessuna raccomandazione specifica identificata.\n`;
    }
    
    content += `\n### Best Practices Generali\n`;
    content += `- 📝 Implementare logging dettagliato per tutte le operazioni\n`;
    content += `- ⏱️ Configurare timeout appropriati per evitare blocchi\n`;
    content += `- 🎯 Utilizzare selettori robusti per gli elementi UI\n`;
    content += `- 🔄 Implementare retry logic per operazioni critiche\n`;
    content += `- 📦 Mantenere versioning del codice RPA\n\n`;

    // Appendici
    content += `## 📚 6. Appendici\n\n`;
    content += `### Glossario\n`;
    content += `- **RPA**: Robotic Process Automation - Automazione dei processi robotici\n`;
    content += `- **Power Automate Desktop**: Piattaforma Microsoft per l'automazione dei processi desktop\n`;
    content += `- **UI Automation**: Automazione dell'interfaccia utente\n\n`;

    content += `### Informazioni Tecniche\n`;
    content += `| Campo | Valore |\n`;
    content += `|-------|--------|\n`;
    content += `| Tool di Analisi | Azure OpenAI GPT-4 Vision |\n`;
    content += `| Metodo di Estrazione | Analisi frame video automatica |\n`;
    content += `| Data Generazione | ${new Date().toISOString()} |\n`;
    content += `| Formato Documento | Markdown (.md) |\n\n`;

    content += `---\n`;
    content += `*Documento generato automaticamente dal Sistema di Analisi RPA*\n`;

    return content;
  }
}