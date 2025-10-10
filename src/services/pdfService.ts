import pdf from 'pdf-parse';
import fs from 'fs';
import path from 'path';

export class PDFService {
  /**
   * Extrai texto de um arquivo PDF
   */
  async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      // Verificar se arquivo existe
      if (!fs.existsSync(filePath)) {
        throw new Error('Arquivo PDF não encontrado');
      }

      // Ler arquivo
      const dataBuffer = fs.readFileSync(filePath);

      // Extrair texto usando pdf-parse
      const data = await pdf(dataBuffer);

      // Limpar texto extraído
      const cleanedText = this.cleanExtractedText(data.text);

      return cleanedText;

    } catch (error: any) {
      console.error('❌ PDFService: Erro ao extrair texto:', error.message);
      throw new Error(`Erro ao processar PDF: ${error.message}`);
    }
  }

  /**
   * Limpa e normaliza o texto extraído do PDF
   */
  private cleanExtractedText(text: string): string {
    return text
      // Remover múltiplas quebras de linha
      .replace(/\n{3,}/g, '\n\n')
      // Remover espaços extras
      .replace(/[ \t]+/g, ' ')
      // Remover espaços no início e fim de linhas
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // Remover linhas vazias consecutivas
      .replace(/\n\n+/g, '\n\n')
      .trim();
  }

  /**
   * Extrai texto de diferentes tipos de arquivo
   */
  async extractTextFromFile(filePath: string, mimeType?: string): Promise<string> {
    const extension = path.extname(filePath).toLowerCase();

    // PDF
    if (extension === '.pdf' || mimeType === 'application/pdf') {
      return await this.extractTextFromPDF(filePath);
    }

    // Arquivos de texto simples
    if (extension === '.txt' || mimeType === 'text/plain') {
      const content = fs.readFileSync(filePath, 'utf-8');
      return this.cleanExtractedText(content);
    }

    // Para outros tipos de arquivo, retornar mensagem informativa
    console.warn('⚠️ PDFService: Tipo de arquivo não suportado para extração de texto:', extension);
    throw new Error(
      'Extração de texto disponível apenas para arquivos PDF e TXT. ' +
      'Para outros formatos, o resumo será baseado nos metadados do material.'
    );
  }

  /**
   * Verificar se um arquivo suporta extração de texto
   */
  supportsTextExtraction(fileName: string): boolean {
    const extension = path.extname(fileName).toLowerCase();
    return ['.pdf', '.txt'].includes(extension);
  }
}

// Export singleton
export const pdfService = new PDFService();
