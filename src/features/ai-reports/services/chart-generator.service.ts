import { WaterQualityData, DataSummary, ChartData } from '../interfaces/ai-report.interface';
import { logger } from '../../../utils/logger';

class ChartGeneratorService {
  private readonly QUICKCHART_BASE_URL = 'https://quickchart.io/chart';

  /**
   * Generate all charts for the report
   */
  async generateCharts(data: WaterQualityData[], summary: DataSummary): Promise<ChartData> {
    try {
      logger.info('Generating charts using QuickChart.io');

      const charts: ChartData = {};

      // Generate WQI distribution bar chart
      if (summary.hasWQI) {
        charts.wqiDistributionChart = await this.generateWQIDistributionChart(data);
      }

      // Generate classification pie chart
      charts.classificationPieChart = await this.generateClassificationPieChart(data, summary);

      // Generate HPI vs MI comparison if both available
      if (summary.hasHPI && summary.hasMI) {
        charts.hpiMiComparisonChart = await this.generateHPIMIComparisonChart(data);
      }

      // Generate geographical chart
      if (summary.districts.length > 0) {
        charts.geographicalChart = await this.generateGeographicalChart(data, summary);
      }

      logger.info('Charts generated successfully');
      return charts;
    } catch (error: any) {
      logger.error('Error generating charts:', error);
      throw new Error(`Failed to generate charts: ${error.message}`);
    }
  }

  /**
   * Generate WQI Distribution Bar Chart
   */
  private async generateWQIDistributionChart(data: WaterQualityData[]): Promise<string> {
    // Get top 20 stations with WQI data, sorted by WQI
    const wqiData = data
      .filter(s => s.wqi !== null && s.wqi !== undefined)
      .sort((a, b) => (b.wqi || 0) - (a.wqi || 0))
      .slice(0, 20);

    const labels = wqiData.map(s => s.stationId);
    const values = wqiData.map(s => s.wqi || 0);
    const colors = values.map(v => {
      if (v > 100) return '#dc2626'; // Red (Unsuitable)
      if (v > 75) return '#ea580c'; // Orange (Very Poor)
      if (v > 50) return '#f59e0b'; // Yellow (Poor)
      if (v > 25) return '#22c55e'; // Green (Good)
      return '#16a34a'; // Dark Green (Excellent)
    });

    const chartConfig = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Water Quality Index',
          data: values,
          backgroundColor: colors,
          borderColor: colors.map(c => c + 'cc'),
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Top 20 Stations - WQI Distribution',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'WQI Value'
            }
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          }
        }
      }
    };

    return this.generateChartURL(chartConfig, 800, 400);
  }

  /**
   * Generate Classification Pie Chart
   */
  private async generateClassificationPieChart(data: WaterQualityData[], summary: DataSummary): Promise<string> {
    const classifications: { [key: string]: number } = {};

    // Count classifications
    data.forEach(station => {
      let classification = 'Unknown';
      
      if (summary.hasWQI && station.wqiClassification) {
        classification = station.wqiClassification;
      } else if (summary.hasHPI && station.hpiClassification) {
        classification = station.hpiClassification;
      } else if (summary.hasMI && station.miClassification) {
        classification = station.miClassification;
      }

      classifications[classification] = (classifications[classification] || 0) + 1;
    });

    const labels = Object.keys(classifications);
    const values = Object.values(classifications);
    const colors = labels.map(label => {
      const l = label.toLowerCase();
      if (l.includes('unsuitable') || l.includes('critical') || l.includes('high')) return '#dc2626';
      if (l.includes('very poor') || l.includes('seriously')) return '#ea580c';
      if (l.includes('poor') || l.includes('medium') || l.includes('strongly')) return '#f59e0b';
      if (l.includes('moderate') || l.includes('affected')) return '#fbbf24';
      if (l.includes('good') || l.includes('low') || l.includes('slight')) return '#22c55e';
      if (l.includes('excellent') || l.includes('pure')) return '#16a34a';
      return '#94a3b8';
    });

    const chartConfig = {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Water Quality Classification Distribution',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            position: 'right'
          }
        }
      }
    };

    return this.generateChartURL(chartConfig, 600, 400);
  }

  /**
   * Generate HPI vs MI Comparison Chart
   */
  private async generateHPIMIComparisonChart(data: WaterQualityData[]): Promise<string> {
    // Get top 15 stations with both HPI and MI data
    const comparisonData = data
      .filter(s => s.hpi !== null && s.mi !== null)
      .sort((a, b) => ((b.hpi || 0) + (b.mi || 0) * 30) - ((a.hpi || 0) + (a.mi || 0) * 30))
      .slice(0, 15);

    const labels = comparisonData.map(s => s.stationId);
    const hpiValues = comparisonData.map(s => s.hpi || 0);
    const miValues = comparisonData.map(s => s.mi || 0);

    const chartConfig = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'HPI',
            data: hpiValues,
            backgroundColor: '#3b82f6',
            borderColor: '#2563eb',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: 'MI',
            data: miValues,
            backgroundColor: '#f59e0b',
            borderColor: '#d97706',
            borderWidth: 1,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'HPI vs MI Comparison (Top 15 Stations)',
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'HPI Value'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'MI Value'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    };

    return this.generateChartURL(chartConfig, 800, 400);
  }

  /**
   * Generate Geographical Chart
   */
  private async generateGeographicalChart(data: WaterQualityData[], summary: DataSummary): Promise<string> {
    // Aggregate data by district
    const districtData: { [key: string]: { count: number; avgPollution: number } } = {};

    data.forEach(station => {
      const district = station.district || 'Unknown';
      if (!districtData[district]) {
        districtData[district] = { count: 0, avgPollution: 0 };
      }
      
      districtData[district].count += 1;
      
      // Calculate average pollution score
      let pollutionScore = 0;
      let scoreCount = 0;
      
      if (station.hpi) {
        pollutionScore += station.hpi;
        scoreCount += 1;
      }
      if (station.mi) {
        pollutionScore += station.mi * 30;
        scoreCount += 1;
      }
      if (station.wqi) {
        pollutionScore += station.wqi;
        scoreCount += 1;
      }
      
      if (scoreCount > 0) {
        districtData[district].avgPollution += pollutionScore / scoreCount;
      }
    });

    // Calculate averages and sort
    const districts = Object.keys(districtData)
      .map(district => ({
        name: district,
        avgPollution: districtData[district].avgPollution / districtData[district].count,
        count: districtData[district].count
      }))
      .sort((a, b) => b.avgPollution - a.avgPollution)
      .slice(0, 10);

    const labels = districts.map(d => `${d.name} (${d.count})`);
    const values = districts.map(d => d.avgPollution);
    const colors = values.map(v => {
      if (v > 100) return '#dc2626';
      if (v > 75) return '#ea580c';
      if (v > 50) return '#f59e0b';
      if (v > 25) return '#22c55e';
      return '#16a34a';
    });

    const chartConfig = {
      type: 'horizontalBar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Average Pollution Score',
          data: values,
          backgroundColor: colors,
          borderColor: colors.map(c => c + 'cc'),
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Top 10 Districts - Average Pollution Levels',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Average Pollution Score'
            }
          }
        }
      }
    };

    return this.generateChartURL(chartConfig, 700, 400);
  }

  /**
   * Generate QuickChart URL
   */
  private generateChartURL(chartConfig: any, width: number = 600, height: number = 400): string {
    const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
    return `${this.QUICKCHART_BASE_URL}?width=${width}&height=${height}&chart=${encodedConfig}`;
  }
}

export default new ChartGeneratorService();
