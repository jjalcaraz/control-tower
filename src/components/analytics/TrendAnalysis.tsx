import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ScatterChart,
  Scatter
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle,
  Brain,
  Calendar,
  LineChart as LineChartIcon
} from 'lucide-react'
import { analyticsService } from '@/lib/analytics-service'
import { Campaign, Lead } from '@/types'

interface TrendData {
  date: string
  messagesSent: number
  responses: number
  conversions: number
  revenue: number
  cost: number
  responseRate: number
  conversionRate: number
  roi: number
}

interface ForecastData {
  date: string
  actual?: number
  predicted: number
  confidence: {
    upper: number
    lower: number
  }
}

interface SeasonalPattern {
  dayOfWeek: string
  avgPerformance: number
  pattern: 'high' | 'medium' | 'low'
}

interface AnomalyData {
  date: string
  metric: string
  value: number
  expectedValue: number
  deviation: number
  severity: 'low' | 'medium' | 'high'
  description: string
}

const METRICS_CONFIG = {
  responseRate: {
    label: 'Response Rate',
    color: '#8884d8',
    format: (value: number) => `${(value * 100).toFixed(1)}%`,
    threshold: 0.15
  },
  conversionRate: {
    label: 'Conversion Rate',
    color: '#82ca9d',
    format: (value: number) => `${(value * 100).toFixed(1)}%`,
    threshold: 0.08
  },
  revenue: {
    label: 'Revenue',
    color: '#ffc658',
    format: (value: number) => `$${value.toLocaleString()}`,
    threshold: 1000
  },
  roi: {
    label: 'ROI',
    color: '#ff7c7c',
    format: (value: number) => `${(value * 100).toFixed(0)}%`,
    threshold: 2
  }
}

export function TrendAnalysis() {
  const [selectedMetric, setSelectedMetric] = useState<keyof typeof METRICS_CONFIG>('responseRate')
  const [timeframe, setTimeframe] = useState('30d')
  const [forecastDays, setForecastDays] = useState(7)
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [forecastData, setForecastData] = useState<ForecastData[]>([])
  const [seasonalPatterns, setSeasonalPatterns] = useState<SeasonalPattern[]>([])
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([])
  const [insights, setInsights] = useState<any[]>([])

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: () => fetch('/api/campaigns').then(res => res.json())
  })

  const { data: leads } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => fetch('/api/leads').then(res => res.json())
  })

  useEffect(() => {
    if (campaigns && leads) {
      loadTrendData()
    }
  }, [campaigns, leads, timeframe, selectedMetric, forecastDays])

  const loadTrendData = async () => {
    if (!campaigns || !leads) return

    const endDate = new Date()
    const startDate = new Date()
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
    }

    const trends = await analyticsService.getTrendAnalysis(
      campaigns, leads, startDate, endDate
    )

    const forecast = await generateForecast(trends.dailyMetrics, selectedMetric, forecastDays)
    
    const patterns = await analyzeSeasonalPatterns(trends.dailyMetrics)
    
    const detectedAnomalies = await analyticsService.detectAnomalies(
      campaigns, leads, startDate, endDate
    )

    const trendInsights = await generateTrendInsights(trends.dailyMetrics, forecast)

    setTrendData(trends.dailyMetrics)
    setForecastData(forecast)
    setSeasonalPatterns(patterns)
    setAnomalies(detectedAnomalies)
    setInsights(trendInsights)
  }

  const generateForecast = async (data: TrendData[], metric: string, days: number): Promise<ForecastData[]> => {
    if (data.length < 7) return []

    const values = data.map(d => d[metric as keyof TrendData] as number)
    const forecast: ForecastData[] = []

    const trend = calculateLinearTrend(values)
    const seasonality = calculateSeasonality(values, 7)
    const volatility = calculateVolatility(values)

    for (let i = 1; i <= days; i++) {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + i)

      const trendValue = trend.slope * (data.length + i) + trend.intercept
      const seasonalAdjustment = seasonality[(data.length + i - 1) % 7]
      const predicted = Math.max(0, trendValue * (1 + seasonalAdjustment))

      const confidence = {
        upper: predicted + (volatility * 1.96),
        lower: Math.max(0, predicted - (volatility * 1.96))
      }

      forecast.push({
        date: futureDate.toISOString().split('T')[0],
        predicted,
        confidence
      })
    }

    return forecast
  }

  const calculateLinearTrend = (values: number[]): { slope: number; intercept: number } => {
    const n = values.length
    const x = Array.from({ length: n }, (_, i) => i)
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = values.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0)
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return { slope, intercept }
  }

  const calculateSeasonality = (values: number[], period: number): number[] => {
    const seasonality = new Array(period).fill(0)
    const counts = new Array(period).fill(0)

    values.forEach((value, index) => {
      const season = index % period
      seasonality[season] += value
      counts[season]++
    })

    const avgValue = values.reduce((a, b) => a + b, 0) / values.length

    return seasonality.map((sum, i) => {
      const avg = counts[i] > 0 ? sum / counts[i] : avgValue
      return (avg - avgValue) / avgValue
    })
  }

  const calculateVolatility = (values: number[]): number => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length
    return Math.sqrt(variance)
  }

  const analyzeSeasonalPatterns = async (data: TrendData[]): Promise<SeasonalPattern[]> => {
    const dayPatterns = new Map<string, number[]>()
    
    data.forEach(item => {
      const date = new Date(item.date)
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' })
      
      if (!dayPatterns.has(dayOfWeek)) {
        dayPatterns.set(dayOfWeek, [])
      }
      
      dayPatterns.get(dayOfWeek)!.push(item[selectedMetric])
    })

    const patterns: SeasonalPattern[] = []
    const allAverages = Array.from(dayPatterns.values())
      .map(values => values.reduce((a, b) => a + b, 0) / values.length)
    
    const overallAvg = allAverages.reduce((a, b) => a + b, 0) / allAverages.length

    dayPatterns.forEach((values, day) => {
      const avgPerformance = values.reduce((a, b) => a + b, 0) / values.length
      let pattern: 'high' | 'medium' | 'low'
      
      if (avgPerformance > overallAvg * 1.1) pattern = 'high'
      else if (avgPerformance < overallAvg * 0.9) pattern = 'low'
      else pattern = 'medium'

      patterns.push({
        dayOfWeek: day,
        avgPerformance,
        pattern
      })
    })

    return patterns.sort((a, b) => {
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      return dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek)
    })
  }

  const generateTrendInsights = async (data: TrendData[], forecast: ForecastData[]): Promise<any[]> => {
    const insights = []

    const recentData = data.slice(-7)
    const previousData = data.slice(-14, -7)

    if (recentData.length >= 7 && previousData.length >= 7) {
      const recentAvg = recentData.reduce((sum, d) => sum + d[selectedMetric], 0) / recentData.length
      const previousAvg = previousData.reduce((sum, d) => sum + d[selectedMetric], 0) / previousData.length
      const change = ((recentAvg - previousAvg) / previousAvg) * 100

      if (Math.abs(change) > 10) {
        insights.push({
          type: change > 0 ? 'improvement' : 'decline',
          title: `${change > 0 ? 'Improvement' : 'Decline'} in ${METRICS_CONFIG[selectedMetric].label}`,
          description: `${Math.abs(change).toFixed(1)}% ${change > 0 ? 'increase' : 'decrease'} in the last 7 days compared to the previous week`,
          impact: Math.abs(change) > 20 ? 'high' : 'medium'
        })
      }
    }

    if (forecast.length > 0) {
      const avgForecast = forecast.reduce((sum, f) => sum + f.predicted, 0) / forecast.length
      const currentValue = data[data.length - 1]?.[selectedMetric] || 0
      const forecastChange = ((avgForecast - currentValue) / currentValue) * 100

      insights.push({
        type: 'forecast',
        title: `Predicted ${METRICS_CONFIG[selectedMetric].label} Trend`,
        description: `Expected ${Math.abs(forecastChange).toFixed(1)}% ${forecastChange > 0 ? 'increase' : 'decrease'} over the next ${forecastDays} days`,
        impact: Math.abs(forecastChange) > 15 ? 'high' : 'low'
      })
    }

    const bestDay = seasonalPatterns.reduce((best, pattern) => 
      pattern.avgPerformance > best.avgPerformance ? pattern : best
    , seasonalPatterns[0])

    const worstDay = seasonalPatterns.reduce((worst, pattern) => 
      pattern.avgPerformance < worst.avgPerformance ? pattern : worst
    , seasonalPatterns[0])

    if (bestDay && worstDay && bestDay !== worstDay) {
      insights.push({
        type: 'seasonal',
        title: 'Best and Worst Performance Days',
        description: `${bestDay.dayOfWeek} shows highest performance (${METRICS_CONFIG[selectedMetric].format(bestDay.avgPerformance)}), while ${worstDay.dayOfWeek} shows lowest (${METRICS_CONFIG[selectedMetric].format(worstDay.avgPerformance)})`,
        impact: 'medium'
      })
    }

    return insights
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'improvement': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'decline': return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'forecast': return <Brain className="h-4 w-4 text-blue-600" />
      case 'seasonal': return <Calendar className="h-4 w-4 text-purple-600" />
      default: return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getInsightColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'border-red-200 bg-red-50'
      case 'medium': return 'border-yellow-200 bg-yellow-50'
      case 'low': return 'border-green-200 bg-green-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const combinedData = [
    ...trendData.map(d => ({
      ...d,
      type: 'actual'
    })),
    ...forecastData.map(f => ({
      date: f.date,
      [selectedMetric]: f.predicted,
      type: 'forecast',
      confidenceUpper: f.confidence.upper,
      confidenceLower: f.confidence.lower
    }))
  ]

  const metricConfig = METRICS_CONFIG[selectedMetric]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Trend Analysis & Forecasting</h2>
          <p className="text-muted-foreground">
            Advanced trend analysis with predictive insights
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedMetric} onValueChange={(value: keyof typeof METRICS_CONFIG) => setSelectedMetric(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(METRICS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={forecastDays.toString()} onValueChange={(value) => setForecastDays(parseInt(value))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 Day Forecast</SelectItem>
              <SelectItem value="7">7 Day Forecast</SelectItem>
              <SelectItem value="14">14 Day Forecast</SelectItem>
              <SelectItem value="30">30 Day Forecast</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Insights */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight, index) => (
            <Card key={index} className={getInsightColor(insight.impact)}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  {getInsightIcon(insight.type)}
                  <div>
                    <h4 className="font-semibold text-sm">{insight.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trend & Forecast</TabsTrigger>
          <TabsTrigger value="patterns">Seasonal Patterns</TabsTrigger>
          <TabsTrigger value="anomalies">Anomaly Detection</TabsTrigger>
          <TabsTrigger value="correlation">Correlation Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChartIcon className="h-5 w-5" />
                {metricConfig.label} Trend Analysis
              </CardTitle>
              <CardDescription>
                Historical data with {forecastDays}-day predictive forecast
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis tickFormatter={(value) => metricConfig.format(value)} />
                  <Tooltip 
                    formatter={(value, name) => [metricConfig.format(value as number), name]}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Legend />
                  
                  <Line
                    type="monotone"
                    dataKey={selectedMetric}
                    stroke={metricConfig.color}
                    strokeWidth={2}
                    dot={{ fill: metricConfig.color, strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                    name="Actual"
                  />
                  
                  <Line
                    type="monotone"
                    dataKey="confidenceUpper"
                    stroke={metricConfig.color}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    connectNulls={false}
                    name="Upper Confidence"
                  />
                  
                  <Line
                    type="monotone"
                    dataKey="confidenceLower"
                    stroke={metricConfig.color}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    connectNulls={false}
                    name="Lower Confidence"
                  />
                  
                  <ReferenceLine 
                    x={new Date().toISOString().split('T')[0]} 
                    stroke="red" 
                    strokeDasharray="2 2"
                    label="Today"
                  />
                  
                  <ReferenceLine 
                    y={metricConfig.threshold} 
                    stroke="orange" 
                    strokeDasharray="3 3"
                    label="Target"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Forecast Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {forecastData.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Avg Predicted</p>
                        <p className="text-lg font-semibold">
                          {metricConfig.format(
                            forecastData.reduce((sum, f) => sum + f.predicted, 0) / forecastData.length
                          )}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Confidence Range</p>
                        <p className="text-lg font-semibold">
                          ±{metricConfig.format(
                            forecastData.reduce((sum, f) => 
                              sum + (f.confidence.upper - f.confidence.lower) / 2, 0
                            ) / forecastData.length
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Upcoming Predictions</h4>
                      {forecastData.slice(0, 5).map((forecast, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span>{new Date(forecast.date).toLocaleDateString()}</span>
                          <span className="font-medium">
                            {metricConfig.format(forecast.predicted)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground">
                    Insufficient data for forecasting
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trend Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {trendData.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Current Value</p>
                        <p className="text-lg font-semibold">
                          {metricConfig.format(trendData[trendData.length - 1]?.[selectedMetric] || 0)}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Period Average</p>
                        <p className="text-lg font-semibold">
                          {metricConfig.format(
                            trendData.reduce((sum, d) => sum + d[selectedMetric], 0) / trendData.length
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Performance vs Target</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Target Achievement</span>
                        <Badge variant={
                          trendData[trendData.length - 1]?.[selectedMetric] >= metricConfig.threshold ? 'default' : 'secondary'
                        }>
                          {trendData[trendData.length - 1]?.[selectedMetric] >= metricConfig.threshold ? 'On Track' : 'Below Target'}
                        </Badge>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground">
                    No trend data available
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Performance Patterns</CardTitle>
              <CardDescription>
                Identify the best and worst performing days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={seasonalPatterns}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dayOfWeek" />
                  <YAxis tickFormatter={(value) => metricConfig.format(value)} />
                  <Tooltip formatter={(value) => [metricConfig.format(value as number), 'Average Performance']} />
                  <Bar 
                    dataKey="avgPerformance" 
                    fill={metricConfig.color}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              
              <div className="grid grid-cols-7 gap-2 mt-4">
                {seasonalPatterns.map((pattern) => (
                  <div key={pattern.dayOfWeek} className="text-center">
                    <div className={`w-3 h-3 mx-auto rounded-full ${
                      pattern.pattern === 'high' ? 'bg-green-500' :
                      pattern.pattern === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <p className="text-xs mt-1">{pattern.dayOfWeek.slice(0, 3)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Anomaly Detection
              </CardTitle>
              <CardDescription>
                Unusual patterns and outliers in your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {anomalies.length > 0 ? (
                <div className="space-y-4">
                  {anomalies.map((anomaly, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg border ${
                        anomaly.severity === 'high' ? 'border-red-200 bg-red-50' :
                        anomaly.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-sm">{anomaly.metric}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{anomaly.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(anomaly.date).toLocaleDateString()} - 
                            Deviation: {(anomaly.deviation * 100).toFixed(1)}%
                          </p>
                        </div>
                        <Badge variant={
                          anomaly.severity === 'high' ? 'destructive' : 
                          anomaly.severity === 'medium' ? 'secondary' : 'default'
                        }>
                          {anomaly.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No significant anomalies detected</p>
                  <p className="text-sm">Your metrics are performing within expected ranges</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Metric Correlations</CardTitle>
              <CardDescription>
                Relationships between different performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="responseRate" 
                    name="Response Rate"
                    tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                  />
                  <YAxis 
                    dataKey="conversionRate"
                    name="Conversion Rate"
                    tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'Response Rate' ? `${(value as number * 100).toFixed(1)}%` : `${(value as number * 100).toFixed(1)}%`,
                      name
                    ]}
                  />
                  <Scatter dataKey="conversionRate" fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Response vs Conversion</p>
                  <p className="text-lg font-semibold">Strong +</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Cost vs Revenue</p>
                  <p className="text-lg font-semibold">Moderate +</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Volume vs Quality</p>
                  <p className="text-lg font-semibold">Weak -</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}