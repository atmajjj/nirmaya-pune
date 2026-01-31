import { GoogleGenerativeAI } from '@google/generative-ai';
import { DataSummary, WaterQualityData, AIInsights } from '../interfaces/ai-report.interface';
import { logger } from '../../../utils/logger';

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error('GEMINI_API_KEY is not configured in environment variables');
      throw new Error('GEMINI_API_KEY is not configured. Please add it to your environment variables.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Using gemini-2.0-flash - has higher daily quota than 2.5-flash (50 vs 20 per day)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    logger.info('Gemini service initialized successfully');
  }

  /**
   * Generate AI-powered insights from water quality data
   */
  async generateInsights(
    data: WaterQualityData[],
    summary: DataSummary
  ): Promise<AIInsights> {
    try {
      logger.info('Generating AI insights using Gemini Pro');

      // Prepare data context for AI
      const dataContext = this.prepareDataContext(data, summary);

      // Generate executive summary
      const executiveSummary = await this.generateExecutiveSummary(dataContext);

      // Generate key findings
      const keyFindings = await this.generateKeyFindings(dataContext);

      // Generate geographical analysis
      const geographicalAnalysis = await this.generateGeographicalAnalysis(dataContext);

      // Identify critical stations
      const criticalStations = this.identifyCriticalStations(data);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(dataContext, criticalStations);

      // Generate temporal trends if multiple years
      const temporalTrends = summary.years.length > 1
        ? await this.generateTemporalTrends(dataContext)
        : undefined;

      return {
        executiveSummary,
        keyFindings,
        geographicalAnalysis,
        criticalStations,
        recommendations,
        temporalTrends,
      };
    } catch (error: any) {
      logger.error('Error generating AI insights:', error);
      throw new Error(`Failed to generate AI insights: ${error.message}`);
    }
  }

  /**
   * Prepare data context for AI prompts
   */
  private prepareDataContext(data: WaterQualityData[], summary: DataSummary): string {
    const context = `
Water Quality Analysis Dataset:
- Total Monitoring Stations: ${summary.totalStations}
- Geographic Coverage: ${summary.states.length} states, ${summary.districts.length} districts
- Time Period: ${summary.years.join(', ')}

Pollution Indices Analyzed:
${summary.hasHPI ? `- Heavy Metal Pollution Index (HPI): Average ${summary.avgHPI?.toFixed(2) || 'N/A'}` : ''}
${summary.hasMI ? `- Metal Index (MI): Average ${summary.avgMI?.toFixed(2) || 'N/A'}` : ''}
${summary.hasWQI ? `- Water Quality Index (WQI): Average ${summary.avgWQI?.toFixed(2) || 'N/A'}` : ''}

Station Status:
- Critical/Unsafe Stations: ${summary.criticalStations} (${((summary.criticalStations / summary.totalStations) * 100).toFixed(1)}%)
- Excellent/Safe Stations: ${summary.excellentStations} (${((summary.excellentStations / summary.totalStations) * 100).toFixed(1)}%)

Geographic Distribution:
- States: ${summary.states.join(', ')}
- Districts: ${summary.districts.slice(0, 10).join(', ')}${summary.districts.length > 10 ? '...' : ''}

Sample Station Data (worst performing):
${this.getWorstStations(data, 5).map(s => 
  `  - ${s.stationId}: ${s.hpi ? `HPI ${Number(s.hpi).toFixed(2)}` : ''}${s.mi ? ` MI ${Number(s.mi).toFixed(2)}` : ''}${s.wqi ? ` WQI ${Number(s.wqi).toFixed(2)}` : ''}`
).join('\n')}
    `.trim();

    return context;
  }

  /**
   * Generate executive summary
   */
  private async generateExecutiveSummary(dataContext: string): Promise<string> {
    const prompt = `
Based on the following water quality analysis data, generate a concise executive summary (100-150 words) highlighting the overall water quality status, major concerns, and immediate actions needed.

${dataContext}

Guidelines:
- Focus on key metrics and overall water quality status
- Highlight percentage of critical vs safe stations
- Mention major pollution sources if evident
- Keep it factual and actionable
- Use professional, scientific language
    `.trim();

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  }

  /**
   * Generate key findings
   */
  private async generateKeyFindings(dataContext: string): Promise<string[]> {
    const prompt = `
Based on the following water quality data, identify 5-7 key findings. Each finding should be a single, impactful statement.

${dataContext}

Guidelines:
- Focus on significant patterns, trends, or anomalies
- Include specific numbers and percentages
- Highlight critical pollution levels
- Mention geographic patterns if relevant
- Keep each finding to 1-2 sentences

Return ONLY the findings as a numbered list (1., 2., 3., etc.), one per line.
    `.trim();

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse numbered list
    const findings = text
      .split('\n')
      .filter((line: string) => line.match(/^\d+\./))
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);

    return findings.slice(0, 7);
  }

  /**
   * Generate geographical analysis
   */
  private async generateGeographicalAnalysis(dataContext: string): Promise<string> {
    const prompt = `
Based on the water quality data, provide a geographical analysis (80-120 words) identifying:
- Which states/districts have the most severe pollution
- Geographic patterns or hotspots
- Regional variations in water quality
- Potential reasons for geographic differences

${dataContext}

Keep it concise and data-driven.
    `.trim();

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  }

  /**
   * Generate recommendations
   */
  private async generateRecommendations(dataContext: string, criticalStations: string[]): Promise<string[]> {
    const prompt = `
Based on the water quality analysis and these critical stations: ${criticalStations.slice(0, 5).join(', ')}, provide 5-8 actionable recommendations for policymakers and water management authorities.

${dataContext}

Guidelines:
- Prioritize immediate actions for critical stations
- Include both short-term and long-term measures
- Be specific and actionable
- Consider regulatory, technical, and monitoring aspects
- Keep each recommendation to 1-2 sentences

Return ONLY the recommendations as a numbered list (1., 2., 3., etc.), one per line.
    `.trim();

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse numbered list
    const recommendations = text
      .split('\n')
      .filter((line: string) => line.match(/^\d+\./))
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);

    return recommendations.slice(0, 8);
  }

  /**
   * Generate temporal trends analysis
   */
  private async generateTemporalTrends(dataContext: string): Promise<string> {
    const prompt = `
Based on the multi-year water quality data, analyze temporal trends (60-100 words):
- Are pollution levels increasing or decreasing?
- Which indices show significant changes?
- What might be driving these trends?

${dataContext}

Keep it concise and focused on observable trends.
    `.trim();

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  }

  /**
   * Identify critical stations requiring immediate attention
   */
  private identifyCriticalStations(data: WaterQualityData[]): string[] {
    const criticalStations: { id: string; score: number }[] = [];

    data.forEach(station => {
      let score = 0;

      // HPI scoring (>100 = critical)
      const hpiVal = station.hpi ? Number(station.hpi) : 0;
      if (hpiVal > 100) {
        score += 3;
      } else if (hpiVal > 50) {
        score += 2;
      }

      // MI scoring (>3 = seriously affected)
      const miVal = station.mi ? Number(station.mi) : 0;
      if (miVal > 3) {
        score += 3;
      } else if (miVal > 2) {
        score += 2;
      }

      // WQI scoring (>100 = unsuitable)
      const wqiVal = station.wqi ? Number(station.wqi) : 0;
      if (wqiVal > 100) {
        score += 3;
      } else if (wqiVal > 75) {
        score += 2;
      }

      if (score >= 2) {
        criticalStations.push({ id: station.stationId, score });
      }
    });

    // Sort by score and return top stations
    return criticalStations
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(s => s.id);
  }

  /**
   * Get worst performing stations
   */
  private getWorstStations(data: WaterQualityData[], count: number): WaterQualityData[] {
    return data
      .sort((a, b) => {
        const scoreA = Number(a.hpi || 0) + Number(a.mi || 0) * 30 + Number(a.wqi || 0);
        const scoreB = Number(b.hpi || 0) + Number(b.mi || 0) * 30 + Number(b.wqi || 0);
        return scoreB - scoreA;
      })
      .slice(0, count);
  }
}

export default new GeminiService();
