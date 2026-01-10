import { AIInsights, ChartData, DataSummary, WaterQualityData } from '../interfaces/ai-report.interface';

class ReportTemplateService {
  /**
   * Generate complete HTML report with AI insights and charts
   */
  generateHTML(
    insights: AIInsights,
    charts: ChartData,
    summary: DataSummary,
    data: WaterQualityData[],
    uploadFilename: string
  ): string {
    const generatedDate = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI-Powered Water Quality Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: #ffffff;
    }
    
    .page {
      page-break-after: always;
      padding: 40px;
    }
    
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #0A3D62 0%, #0d4a75 100%);
      color: white;
      text-align: center;
    }
    
    .cover-title {
      font-size: 48px;
      font-weight: bold;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    
    .cover-subtitle {
      font-size: 24px;
      margin-bottom: 40px;
      opacity: 0.9;
    }
    
    .cover-info {
      font-size: 18px;
      margin-top: 60px;
    }
    
    .cover-info div {
      margin: 10px 0;
    }
    
    h1 {
      color: #0A3D62;
      font-size: 32px;
      margin-bottom: 20px;
      border-bottom: 3px solid #0A3D62;
      padding-bottom: 10px;
    }
    
    h2 {
      color: #0d4a75;
      font-size: 24px;
      margin-top: 30px;
      margin-bottom: 15px;
    }
    
    h3 {
      color: #334155;
      font-size: 18px;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin: 30px 0;
    }
    
    .stat-card {
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #0A3D62;
      display: block;
      margin-bottom: 8px;
    }
    
    .stat-label {
      font-size: 14px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .summary-box {
      background: #f0f9ff;
      border-left: 4px solid #3b82f6;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    
    .finding-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 15px;
      margin: 10px 0;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .finding-item:before {
      content: "✓";
      color: #22c55e;
      font-weight: bold;
      margin-right: 10px;
      font-size: 18px;
    }
    
    .recommendation-item {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    
    .critical-box {
      background: #fee2e2;
      border-left: 4px solid #dc2626;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    
    .chart-container {
      margin: 30px 0;
      text-align: center;
      page-break-inside: avoid;
    }
    
    .chart-container img {
      max-width: 100%;
      height: auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .chart-title {
      font-size: 16px;
      font-weight: bold;
      color: #475569;
      margin-bottom: 15px;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 14px;
    }
    
    .data-table th {
      background: #0A3D62;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    
    .data-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .data-table tr:nth-child(even) {
      background: #f8fafc;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .badge-critical {
      background: #fee2e2;
      color: #dc2626;
    }
    
    .badge-poor {
      background: #fed7aa;
      color: #ea580c;
    }
    
    .badge-moderate {
      background: #fef3c7;
      color: #d97706;
    }
    
    .badge-good {
      background: #d1fae5;
      color: #059669;
    }
    
    .badge-excellent {
      background: #ccfbf1;
      color: #0d9488;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="page cover-page">
    <div class="cover-title">🌊 AI-Powered Water Quality Report</div>
    <div class="cover-subtitle">Comprehensive Analysis & Insights</div>
    <div class="cover-info">
      <div><strong>Generated:</strong> ${generatedDate}</div>
      <div><strong>Dataset:</strong> ${uploadFilename}</div>
      <div><strong>Total Stations:</strong> ${summary.totalStations}</div>
      <div><strong>Powered by:</strong> Gemini AI & Nirmaya Analytics</div>
    </div>
  </div>

  <!-- Executive Summary Page -->
  <div class="page">
    <h1>📊 Executive Summary</h1>
    
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">${summary.totalStations}</span>
        <span class="stat-label">Total Stations</span>
      </div>
      <div class="stat-card">
        <span class="stat-value" style="color: #dc2626;">${summary.criticalStations}</span>
        <span class="stat-label">Critical Stations</span>
      </div>
      <div class="stat-card">
        <span class="stat-value" style="color: #22c55e;">${summary.excellentStations}</span>
        <span class="stat-label">Safe Stations</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${summary.states.length}</span>
        <span class="stat-label">States Covered</span>
      </div>
    </div>

    ${summary.avgHPI !== null ? `<div class="stat-card"><span class="stat-value">${summary.avgHPI.toFixed(2)}</span><span class="stat-label">Average HPI</span></div>` : ''}
    ${summary.avgMI !== null ? `<div class="stat-card"><span class="stat-value">${summary.avgMI.toFixed(2)}</span><span class="stat-label">Average MI</span></div>` : ''}
    ${summary.avgWQI !== null ? `<div class="stat-card"><span class="stat-value">${summary.avgWQI.toFixed(2)}</span><span class="stat-label">Average WQI</span></div>` : ''}

    <div class="summary-box">
      <h2 style="margin-top: 0;">AI-Generated Summary</h2>
      <p>${insights.executiveSummary}</p>
    </div>

    ${insights.criticalStations.length > 0 ? `
    <div class="critical-box">
      <h3 style="margin-top: 0; color: #dc2626;">⚠️ Critical Stations Requiring Immediate Attention</h3>
      <p><strong>Stations:</strong> ${insights.criticalStations.slice(0, 10).join(', ')}</p>
    </div>
    ` : ''}
  </div>

  <!-- Key Findings Page -->
  <div class="page">
    <h1>🔍 Key Findings</h1>
    
    ${insights.keyFindings.map((finding, index) => `
      <div class="finding-item">
        <strong>Finding ${index + 1}:</strong> ${finding}
      </div>
    `).join('')}

    <h2>🌍 Geographical Analysis</h2>
    <p>${insights.geographicalAnalysis}</p>

    ${insights.temporalTrends ? `
    <h2>📈 Temporal Trends</h2>
    <p>${insights.temporalTrends}</p>
    ` : ''}
  </div>

  <!-- Charts Page -->
  <div class="page">
    <h1>📊 Visual Analysis</h1>

    ${charts.classificationPieChart ? `
    <div class="chart-container">
      <div class="chart-title">Water Quality Classification Distribution</div>
      <img src="${charts.classificationPieChart}" alt="Classification Distribution" />
    </div>
    ` : ''}

    ${charts.wqiDistributionChart ? `
    <div class="chart-container">
      <div class="chart-title">WQI Distribution Across Stations</div>
      <img src="${charts.wqiDistributionChart}" alt="WQI Distribution" />
    </div>
    ` : ''}
  </div>

  <!-- More Charts Page -->
  ${charts.hpiMiComparisonChart || charts.geographicalChart ? `
  <div class="page">
    <h1>📊 Additional Analysis</h1>

    ${charts.hpiMiComparisonChart ? `
    <div class="chart-container">
      <div class="chart-title">HPI vs MI Comparison</div>
      <img src="${charts.hpiMiComparisonChart}" alt="HPI vs MI" />
    </div>
    ` : ''}

    ${charts.geographicalChart ? `
    <div class="chart-container">
      <div class="chart-title">Geographical Distribution by District</div>
      <img src="${charts.geographicalChart}" alt="Geographical Distribution" />
    </div>
    ` : ''}
  </div>
  ` : ''}

  <!-- Recommendations Page -->
  <div class="page">
    <h1>💡 AI-Generated Recommendations</h1>
    
    ${insights.recommendations.map((rec, index) => `
      <div class="recommendation-item">
        <strong>${index + 1}.</strong> ${rec}
      </div>
    `).join('')}

    <div class="footer">
      <p><strong>Report Generated by Nirmaya AI Analytics</strong></p>
      <p>This report uses Google Gemini Pro AI for intelligent insights and recommendations</p>
      <p>Generated on ${generatedDate}</p>
    </div>
  </div>

  <!-- Data Appendix -->
  <div class="page">
    <h1>📋 Data Appendix</h1>
    <h2>Top 20 Critical Stations</h2>
    
    <table class="data-table">
      <thead>
        <tr>
          <th>Station ID</th>
          ${summary.hasHPI ? '<th>HPI</th>' : ''}
          ${summary.hasMI ? '<th>MI</th>' : ''}
          ${summary.hasWQI ? '<th>WQI</th>' : ''}
          <th>Classification</th>
          <th>Location</th>
        </tr>
      </thead>
      <tbody>
        ${this.getWorstStations(data, 20).map(station => `
          <tr>
            <td><strong>${station.stationId}</strong></td>
            ${summary.hasHPI ? `<td>${Number(station.hpi || 0).toFixed(2)}</td>` : ''}
            ${summary.hasMI ? `<td>${Number(station.mi || 0).toFixed(2)}</td>` : ''}
            ${summary.hasWQI ? `<td>${Number(station.wqi || 0).toFixed(2)}</td>` : ''}
            <td>${this.getBadge(station, summary)}</td>
            <td>${[station.district, station.state].filter(Boolean).join(', ')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

</body>
</html>
    `.trim();
  }

  /**
   * Get worst performing stations
   */
  private getWorstStations(data: WaterQualityData[], count: number): WaterQualityData[] {
    return data
      .sort((a, b) => {
        const scoreA = (a.hpi || 0) + (a.mi || 0) * 30 + (a.wqi || 0);
        const scoreB = (b.hpi || 0) + (b.mi || 0) * 30 + (b.wqi || 0);
        return scoreB - scoreA;
      })
      .slice(0, count);
  }

  /**
   * Get badge HTML for classification
   */
  private getBadge(station: WaterQualityData, summary: DataSummary): string {
    let classification = 'Unknown';
    let badgeClass = '';

    if (summary.hasWQI && station.wqiClassification) {
      classification = station.wqiClassification;
    } else if (summary.hasHPI && station.hpiClassification) {
      classification = station.hpiClassification;
    } else if (summary.hasMI && station.miClassification) {
      classification = station.miClassification;
    }

    const cl = classification.toLowerCase();
    if (cl.includes('unsuitable') || cl.includes('critical') || cl.includes('high')) {
      badgeClass = 'badge-critical';
    } else if (cl.includes('very poor') || cl.includes('seriously')) {
      badgeClass = 'badge-poor';
    } else if (cl.includes('poor') || cl.includes('medium') || cl.includes('strongly') || cl.includes('moderate')) {
      badgeClass = 'badge-moderate';
    } else if (cl.includes('good') || cl.includes('low') || cl.includes('slight')) {
      badgeClass = 'badge-good';
    } else if (cl.includes('excellent') || cl.includes('pure')) {
      badgeClass = 'badge-excellent';
    }

    return `<span class="badge ${badgeClass}">${classification}</span>`;
  }
}

export default new ReportTemplateService();
