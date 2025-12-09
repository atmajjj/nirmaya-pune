import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from 'chart.js';
import type { ReportData, ChartImages } from '../shared/interface';

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Chart Generator Service
 * Generates chart images for HMPI reports using Chart.js
 */
export class ChartGeneratorService {
  private static readonly CHART_WIDTH = 800;
  private static readonly CHART_HEIGHT = 500;
  private static readonly CHART_BACKGROUND_COLOR = 'white';

  // Color palettes for different chart types
  private static readonly HPI_COLORS = {
    'Excellent - Low pollution': '#10b981', // green
    'Good - Low to medium pollution': '#3b82f6', // blue
    'Poor - Medium pollution': '#f59e0b', // amber
    'Very Poor - High pollution': '#ef4444', // red
    'Unsuitable - Critical pollution': '#7f1d1d', // dark red
  };

  private static readonly MI_COLORS = {
    'Very Pure': '#059669', // green
    'Pure': '#10b981', // light green
    'Slightly Affected': '#3b82f6', // blue
    'Moderately Affected': '#f59e0b', // amber
    'Strongly Affected': '#ef4444', // red
    'Seriously Affected': '#7f1d1d', // dark red
  };

  /**
   * Generate all charts for a report
   * Returns base64-encoded image buffers
   */
  static async generateAllCharts(reportData: ReportData): Promise<ChartImages> {
    const [
      hpiDistribution,
      miDistribution,
      hpiClassification,
      miClassification,
      topPollutedStations,
      geographicDistribution,
    ] = await Promise.all([
      this.generateHPIDistributionChart(reportData),
      this.generateMIDistributionChart(reportData),
      this.generateHPIClassificationPieChart(reportData),
      this.generateMIClassificationPieChart(reportData),
      this.generateTopPollutedStationsChart(reportData),
      this.generateGeographicDistributionChart(reportData),
    ]);

    return {
      hpiDistribution,
      miDistribution,
      hpiClassification,
      miClassification,
      topPollutedStations,
      geographicDistribution,
    };
  }

  /**
   * Generate HPI distribution bar chart
   */
  private static async generateHPIDistributionChart(reportData: ReportData): Promise<string> {
    const { classificationCounts } = reportData.hpiStats;
    
    const labels = Object.keys(classificationCounts);
    const data = Object.values(classificationCounts);
    const colors = labels.map(label => this.HPI_COLORS[label as keyof typeof this.HPI_COLORS] || '#6b7280');

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Number of Stations',
          data,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'HPI Classification Distribution',
            font: { size: 18, weight: 'bold' },
          },
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
            title: {
              display: true,
              text: 'Number of Stations',
            },
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45,
            },
          },
        },
      },
    };

    return this.renderChart(config);
  }

  /**
   * Generate MI distribution bar chart
   */
  private static async generateMIDistributionChart(reportData: ReportData): Promise<string> {
    const { classificationCounts } = reportData.miStats;
    
    const labels = Object.keys(classificationCounts);
    const data = Object.values(classificationCounts);
    const colors = labels.map(label => this.MI_COLORS[label as keyof typeof this.MI_COLORS] || '#6b7280');

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Number of Stations',
          data,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'MI Classification Distribution',
            font: { size: 18, weight: 'bold' },
          },
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
            title: {
              display: true,
              text: 'Number of Stations',
            },
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45,
            },
          },
        },
      },
    };

    return this.renderChart(config);
  }

  /**
   * Generate HPI classification pie chart
   */
  private static async generateHPIClassificationPieChart(reportData: ReportData): Promise<string> {
    const { classificationCounts } = reportData.hpiStats;
    
    const labels = Object.keys(classificationCounts);
    const data = Object.values(classificationCounts);
    const colors = labels.map(label => this.HPI_COLORS[label as keyof typeof this.HPI_COLORS] || '#6b7280');

    const config: ChartConfiguration = {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'HPI Classification Breakdown',
            font: { size: 18, weight: 'bold' },
          },
          legend: {
            display: true,
            position: 'bottom',
          },
        },
      },
    };

    return this.renderChart(config);
  }

  /**
   * Generate MI classification pie chart
   */
  private static async generateMIClassificationPieChart(reportData: ReportData): Promise<string> {
    const { classificationCounts } = reportData.miStats;
    
    const labels = Object.keys(classificationCounts);
    const data = Object.values(classificationCounts);
    const colors = labels.map(label => this.MI_COLORS[label as keyof typeof this.MI_COLORS] || '#6b7280');

    const config: ChartConfiguration = {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'MI Classification Breakdown',
            font: { size: 18, weight: 'bold' },
          },
          legend: {
            display: true,
            position: 'bottom',
          },
        },
      },
    };

    return this.renderChart(config);
  }

  /**
   * Generate top 10 polluted stations horizontal bar chart
   */
  private static async generateTopPollutedStationsChart(reportData: ReportData): Promise<string> {
    const { topPollutedStations } = reportData.hpiStats;
    
    // Take top 10 stations
    const top10 = topPollutedStations.slice(0, 10);
    const labels = top10.map(s => s.stationId);
    const data = top10.map(s => s.hpi);
    
    // Color based on HPI value
    const colors = data.map(hpi => {
      if (hpi >= 100) return this.HPI_COLORS['Unsuitable - Critical pollution'];
      if (hpi >= 75) return this.HPI_COLORS['Very Poor - High pollution'];
      if (hpi >= 50) return this.HPI_COLORS['Poor - Medium pollution'];
      if (hpi >= 25) return this.HPI_COLORS['Good - Low to medium pollution'];
      return this.HPI_COLORS['Excellent - Low pollution'];
    });

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'HPI Value',
          data,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Top 10 Most Polluted Stations (by HPI)',
            font: { size: 18, weight: 'bold' },
          },
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'HPI Value',
            },
          },
        },
      },
    };

    return this.renderChart(config);
  }

  /**
   * Generate geographic distribution bar chart (by state)
   */
  private static async generateGeographicDistributionChart(reportData: ReportData): Promise<string> {
    const { states } = reportData.geoData;
    
    // Take top 10 states
    const top10States = states.slice(0, 10);
    const labels = top10States.map(s => s.state);
    const data = top10States.map(s => s.count);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Number of Stations',
          data,
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Geographic Distribution (Top 10 States)',
            font: { size: 18, weight: 'bold' },
          },
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
            title: {
              display: true,
              text: 'Number of Stations',
            },
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45,
            },
          },
        },
      },
    };

    return this.renderChart(config);
  }

  /**
   * Render a chart configuration to base64 image string
   * @private
   */
  private static async renderChart(config: ChartConfiguration): Promise<string> {
    const chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: this.CHART_WIDTH,
      height: this.CHART_HEIGHT,
      backgroundColour: this.CHART_BACKGROUND_COLOR,
    });

    const buffer = await chartJSNodeCanvas.renderToBuffer(config);
    return buffer.toString('base64');
  }

  /**
   * Get chart as buffer (useful for direct file writing)
   */
  static async renderChartToBuffer(config: ChartConfiguration): Promise<Buffer> {
    const chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: this.CHART_WIDTH,
      height: this.CHART_HEIGHT,
      backgroundColour: this.CHART_BACKGROUND_COLOR,
    });

    return chartJSNodeCanvas.renderToBuffer(config);
  }
}
