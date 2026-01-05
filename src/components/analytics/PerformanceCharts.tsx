import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface DeliveryRateTrendChartProps {
  data: Array<{
    date: string
    delivery_rate: number
    industry_average?: number
  }>
  height?: number
}

export function DeliveryRateTrendChart({ data, height = 300 }: DeliveryRateTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="delivery_rate"
          stroke="#2563eb"
          strokeWidth={2}
          name="Delivery Rate"
        />
        {data.some(d => d.industry_average) && (
          <Line
            type="monotone"
            dataKey="industry_average"
            stroke="#dc2626"
            strokeDasharray="5 5"
            name="Industry Average"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}

interface ResponseRateChartProps {
  data: Array<{
    date: string
    response_rate: number
  }>
  height?: number
}

export function ResponseRateChart({ data, height = 300 }: ResponseRateChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Area
          type="monotone"
          dataKey="response_rate"
          stroke="#10b981"
          fill="#10b981"
          fillOpacity={0.3}
          name="Response Rate"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

interface ConversionFunnelChartProps {
  data: Array<{
    stage: string
    count: number
    percentage?: number
  }>
  height?: number
}

export function ConversionFunnelChart({ data, height = 400 }: ConversionFunnelChartProps) {

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="horizontal"
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="stage" type="category" />
        <Tooltip />
        <Bar dataKey="count" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface ROIComparisonChartProps {
  data: Array<{
    campaign_name: string
    roi: number
    spend: number
    revenue: number
  }>
  height?: number
}

export function ROIComparisonChart({ data, height = 300 }: ROIComparisonChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="campaign_name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="spend" fill="#ef4444" name="Spend" />
        <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface MessageVolumeChartProps {
  data: Array<{
    date: string
    sent: number
    delivered: number
    failed: number
  }>
  height?: number
}

export function MessageVolumeChart({ data, height = 300 }: MessageVolumeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Area
          type="monotone"
          dataKey="sent"
          stackId="1"
          stroke="#3b82f6"
          fill="#3b82f6"
          name="Sent"
        />
        <Area
          type="monotone"
          dataKey="delivered"
          stackId="1"
          stroke="#10b981"
          fill="#10b981"
          name="Delivered"
        />
        <Area
          type="monotone"
          dataKey="failed"
          stackId="1"
          stroke="#ef4444"
          fill="#ef4444"
          name="Failed"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

interface PhoneHealthDistributionProps {
  data: Array<{
    health_score: string
    count: number
    percentage: number
  }>
  height?: number
}

export function PhoneHealthDistribution({ data, height = 300 }: PhoneHealthDistributionProps) {
  const COLORS = ['#10b981', '#f59e0b', '#ef4444']

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ health_score, percentage }) => `${health_score}: ${percentage}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="count"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

interface CampaignPerformanceChartProps {
  data: Array<{
    campaign_name: string
    delivery_rate: number
    response_rate: number
    conversion_rate: number
  }>
  height?: number
}

export function CampaignPerformanceChart({ data, height = 400 }: CampaignPerformanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="campaign_name" angle={-45} textAnchor="end" height={100} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="delivery_rate"
          stroke="#3b82f6"
          strokeWidth={2}
          name="Delivery Rate"
        />
        <Line
          type="monotone"
          dataKey="response_rate"
          stroke="#10b981"
          strokeWidth={2}
          name="Response Rate"
        />
        <Line
          type="monotone"
          dataKey="conversion_rate"
          stroke="#f59e0b"
          strokeWidth={2}
          name="Conversion Rate"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface CostPerLeadChartProps {
  data: Array<{
    campaign_name: string
    cost_per_lead: number
    trend?: number
  }>
  height?: number
}

export function CostPerLeadChart({ data, height = 300 }: CostPerLeadChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="campaign_name" angle={-45} textAnchor="end" height={100} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="cost_per_lead" fill="#8b5cf6" name="Cost Per Lead" />
      </BarChart>
    </ResponsiveContainer>
  )
}