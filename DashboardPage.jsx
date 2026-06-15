import { useState } from "react"
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend,
  LineChart, Line
} from "recharts"

const COLORS = {
  Drainage: "#22d3ee",
  Electricity: "#a78bfa",
  Garbage: "#fb923c",
  Roads: "#60a5fa",
  "Water Supply": "#fbbf24",
  Anomaly: "#f87171",
  // K-Means Cluster Colors
  "Cluster 0": "#ec4899",
  "Cluster 1": "#8b5cf6",
  "Cluster 2": "#06b6d4",
  "Cluster 3": "#10b981",
  "Cluster 4": "#f59e0b",
  "Cluster 5": "#ef4444",
  "Cluster 6": "#3b82f6",
  "Cluster 7": "#6366f1",
  "Cluster 8": "#a855f7",
  "Cluster 9": "#f97316",
}

const CATEGORY_ICONS = {
  Drainage: "🌊",
  Electricity: "⚡",
  Garbage: "🗑️",
  Roads: "🛣️",
  "Water Supply": "💧",
}

const CATEGORY_LIST = ["Drainage", "Electricity", "Garbage", "Roads", "Water Supply"]

// Custom dot: anomaly = red X, normal = filled circle
const ScatterDot = (props) => {
  const { cx, cy, payload } = props
  if (!cx || !cy) return null
  const isAnomaly = payload.anomaly === "anomaly"
  const color = isAnomaly ? COLORS.Anomaly : (COLORS[payload.category] || "var(--text-muted-light)")
  if (isAnomaly) {
    const s = 5
    return (
      <g>
        <line x1={cx - s} y1={cy - s} x2={cx + s} y2={cy + s} stroke={color} strokeWidth={2.5} />
        <line x1={cx + s} y1={cy - s} x2={cx - s} y2={cy + s} stroke={color} strokeWidth={2.5} />
      </g>
    )
  }
  return <circle cx={cx} cy={cy} r={4} fill={color} fillOpacity={0.8} stroke={color} strokeWidth={0.5} />
}

const ScatterTooltipContent = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "10px 14px", maxWidth: 260, fontSize: 12 }}>
      <p style={{ color: "var(--text-main)", marginBottom: 4, fontWeight: 600 }}>{d.text}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[d.category] || "var(--text-muted-light)" }} />
        <p style={{ color: COLORS[d.category] || "var(--text-muted-light)", margin: 0 }}>{CATEGORY_ICONS[d.category] || "📋"} {d.category} — {d.area}</p>
      </div>
      <p style={{ color: "var(--text-muted-light)", margin: 0 }}>Urgency: <span style={{ color: "#fbbf24", fontWeight: 700 }}>{d.urgency_score}</span></p>
      {d.anomaly === "anomaly" && <p style={{ color: "#f87171", marginTop: 4, fontWeight: 600 }}>⚠️ Anomaly Detected</p>}
    </div>
  )
}

const ScatterLegend = ({ categories }) => {
  const cats = categories || CATEGORY_LIST
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 20px", justifyContent: "center", marginTop: 14, padding: "10px 0", borderTop: "1px solid var(--border-color)" }}>
      {cats.map(cat => (
        <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: COLORS[cat] || "var(--text-muted-light)", flexShrink: 0 }} />
          <span style={{ color: "var(--text-muted-light)" }}>{CATEGORY_ICONS[cat] || "📋"} {cat}</span>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
        <svg width="14" height="14" viewBox="0 0 14 14">
          <line x1="2" y1="2" x2="12" y2="12" stroke={COLORS.Anomaly} strokeWidth="2.5" />
          <line x1="12" y1="2" x2="2" y2="12" stroke={COLORS.Anomaly} strokeWidth="2.5" />
        </svg>
        <span style={{ color: "var(--text-muted-light)" }}>Anomaly</span>
      </div>
    </div>
  )
}

function splitScatter(data) {
  const normal = data.filter(d => d.anomaly !== "anomaly")
  const anomalies = data.filter(d => d.anomaly === "anomaly")
  return { normal, anomalies }
}

function axisDomain(data, key) {
  const vals = data.map(d => d[key]).filter(v => v != null && !isNaN(v))
  if (!vals.length) return ["auto", "auto"]
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const pad = (max - min) * 0.12 || 1
  return [parseFloat((min - pad).toFixed(2)), parseFloat((max + pad).toFixed(2))]
}

function computeCentroids(scatter, xKey, yKey) {
  const groups = {}
  scatter.forEach(d => {
    if (!groups[d.category]) groups[d.category] = { sx: 0, sy: 0, n: 0 }
    groups[d.category].sx += d[xKey]
    groups[d.category].sy += d[yKey]
    groups[d.category].n += 1
  })
  return Object.entries(groups).map(([cat, { sx, sy, n }]) => ({
    category: cat,
    x: parseFloat((sx / n).toFixed(4)),
    y: parseFloat((sy / n).toFixed(4)),
  }))
}

const CentroidDot = (props) => {
  const { cx, cy, payload } = props
  if (!cx || !cy) return null
  const color = COLORS[payload.category] || "#fff"
  return (
    <g>
      <circle cx={cx} cy={cy} r={9} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={3} fill={color} />
    </g>
  )
}

function ScatterViz({ title, subtitle, normalData, anomalyData, centroids, xDomain, yDomain, xLabel, yLabel, categories }) {
  const card = { background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 16, padding: "24px", marginBottom: 24, color: "var(--text-main)" }

  return (
    <div style={card}>
      <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>{title}</h3>
      <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "0 0 20px" }}>{subtitle}</p>

      <ResponsiveContainer width="100%" height={450}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" strokeOpacity={0.6} />
          <XAxis
            type="number" dataKey="x" name={xLabel}
            domain={xDomain}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickFormatter={v => v.toFixed(1)}
            label={{ value: xLabel, position: "insideBottom", offset: -20, fill: "var(--text-muted-light)", fontSize: 12 }}
          />
          <YAxis
            type="number" dataKey="y" name={yLabel}
            domain={yDomain}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickFormatter={v => v.toFixed(1)}
            label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 10, fill: "var(--text-muted-light)", fontSize: 12 }}
          />
          <Tooltip content={<ScatterTooltipContent />} />

          {categories.map(cat => (
            <Scatter
              key={cat}
              name={cat}
              data={normalData.filter(d => d.category === cat)}
              shape={<ScatterDot />}
              isAnimationActive={false}
            />
          ))}

          <Scatter
            name="Anomaly"
            data={anomalyData}
            shape={<ScatterDot />}
            isAnimationActive={false}
          />

          <Scatter
            name="Centroids"
            data={centroids}
            shape={<CentroidDot />}
            isAnimationActive={false}
          />
        </ScatterChart>
      </ResponsiveContainer>

      <ScatterLegend categories={categories} />
      <p style={{ color: "var(--bg-hover)", fontSize: 11, marginTop: 8, textAlign: "center" }}>
        ⊕ Large ring markers = cluster centroids | Red ✕ = anomaly
      </p>
    </div>
  )
}

// Export Button Component
const ExportButton = ({ data, filename, label, icon }) => {
  const handleExport = () => {
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      style={{
        background: "var(--border-color)",
        border: "none",
        borderRadius: 10,
        padding: "10px 18px",
        fontSize: 13,
        color: "var(--text-main)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
        transition: "all 0.2s",
        fontWeight: 500
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "var(--border-color)"}
    >
      <span>{icon}</span> {label}
    </button>
  )
}

export default function DashboardPage({ results }) {
  const [activeTab, setActiveTab] = useState("overview")
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [fullscreenChart, setFullscreenChart] = useState(null)

  const {
    total_complaints, categories, areas, anomaly_count, lof_count,
    status_counts, metrics, elbow, category_counts, area_counts,
    priority, cluster_keywords, top_anomalies, rules, scatter, logs
  } = results

  const activeCats = [...new Set(scatter.map(d => d.category))].filter(c => COLORS[c] || true)

  const { normal: pcaNormal, anomalies: pcaAnomalies } = splitScatter(
    scatter.map(d => ({ ...d, x: d.pca_x, y: d.pca_y }))
  )
  const pcaXDomain = axisDomain(scatter, "pca_x")
  const pcaYDomain = axisDomain(scatter, "pca_y")
  const pcaCentroids = computeCentroids(scatter, "pca_x", "pca_y")

  const { normal: tsneNormal, anomalies: tsneAnomalies } = splitScatter(
    scatter.map(d => ({ ...d, x: d.tsne_x, y: d.tsne_y }))
  )
  const tsneXDomain = axisDomain(scatter, "tsne_x")
  const tsneYDomain = axisDomain(scatter, "tsne_y")
  const tsneCentroids = computeCentroids(scatter, "tsne_x", "tsne_y")

  const categoryData = Object.entries(category_counts).map(([name, value]) => ({ name, value }))
  const areaData = Object.entries(area_counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  const statusData = Object.entries(status_counts).map(([name, value]) => ({ name, value }))
  const statusColors = { Pending: "#f87171", "In Progress": "#fbbf24", Resolved: "#4ade80" }

  const card = { background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 16, padding: "24px", marginBottom: 24, color: "var(--text-main)" }
  const badge = (color, text) => (
    <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
      {text}
    </span>
  )

  // Fullscreen modal
  if (showFullscreen && fullscreenChart) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "var(--bg-main)",
        zIndex: 1000,
        padding: "40px",
        overflow: "auto"
      }}>
        <button
          onClick={() => setShowFullscreen(false)}
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            background: "#f87171",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            color: "white",
            cursor: "pointer",
            fontWeight: 600,
            zIndex: 1001
          }}
        >
          ✕ Close Fullscreen
        </button>
        <ScatterViz
          title={fullscreenChart.title}
          subtitle={fullscreenChart.subtitle}
          normalData={fullscreenChart.normalData}
          anomalyData={fullscreenChart.anomalyData}
          centroids={fullscreenChart.centroids}
          xDomain={fullscreenChart.xDomain}
          yDomain={fullscreenChart.yDomain}
          xLabel={fullscreenChart.xLabel}
          yLabel={fullscreenChart.yLabel}
          categories={activeCats}
        />
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "var(--text-main)" }}>

      {/* Header with Stats Cards */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, background: "linear-gradient(135deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>
              📊 Analysis Dashboard
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {total_complaints.toLocaleString()} complaints · {categories} categories · {areas} areas
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <ExportButton data={results} filename="complaint_analysis_report.json" label="Export Report" icon="📄" />
            <ExportButton data={scatter} filename="complaint_scatter_data.json" label="Export Data" icon="📊" />
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
          {[
            { label: "Total", value: total_complaints, color: "#60a5fa", icon: "📋" },
            { label: "Categories", value: categories, color: "#a78bfa", icon: "🏷️" },
            { label: "Areas", value: areas, color: "#22d3ee", icon: "📍" },
            { label: "Anomalies", value: anomaly_count, color: "#f87171", icon: "⚠️" },
            { label: "Silhouette", value: metrics.silhouette_score.toFixed(3), color: "#4ade80", icon: "📊" },
            { label: "DB Index", value: metrics.davies_bouldin.toFixed(3), color: "#fbbf24", icon: "📈" },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid var(--border-color)", paddingBottom: 12 }}>
        {[
          { id: "overview", label: "📊 Overview", icon: "📊" },
          { id: "visualizations", label: "📈 Visualizations", icon: "📈" },
          { id: "logs", label: "🖥️ Pipeline Logs", icon: "🖥️" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? "#60a5fa" : "transparent",
              border: activeTab === tab.id ? "none" : "1px solid var(--border-color)",
              borderRadius: 10,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              color: activeTab === tab.id ? "var(--bg-main)" : "var(--text-muted)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========== TAB 1: OVERVIEW ========== */}
      {activeTab === "overview" && (
        <div>
          {/* Category Cards Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
            {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => {
              const count = category_counts[cat] || 0
              const color = COLORS[cat]
              return (
                <div key={cat} style={{
                  background: `linear-gradient(135deg, ${color}15, ${color}05)`,
                  border: `1px solid ${color}30`,
                  borderRadius: 16,
                  padding: "16px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color }}>{count}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted-light)", marginTop: 4 }}>{cat}</div>
                </div>
              )
            })}
          </div>

          {/* Priority Ranking */}
          <div style={card}>
            <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>🚨 Priority Ranking</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                    {["Rank", "Category", "Count", "Avg Urgency", "Priority Score"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {priority.map((row, i) => (
                    <tr key={row.category} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "10px 12px", color: "var(--text-muted-light)" }}>#{i + 1}</td>
                      <td style={{ padding: "10px 12px" }}>{badge(COLORS[row.category] || "var(--text-muted-light)", `${CATEGORY_ICONS[row.category] || "📋"} ${row.category}`)}</td>
                      <td style={{ padding: "10px 12px" }}>{row.count}</td>
                      <td style={{ padding: "10px 12px", color: "#fbbf24" }}>{Number(row.avg_urgency).toFixed(2)}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#60a5fa" }}>{row.priority_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Complaint Distribution & Status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            <div style={card}>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>📊 Complaint Distribution</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                    label={({ name, percent }) => `${CATEGORY_ICONS[name] || "📋"} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {categoryData.map(entry => <Cell key={entry.name} fill={COLORS[entry.name] || "var(--text-muted-light)"} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={card}>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>📋 Status Breakdown</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statusData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" tick={{ fill: "var(--text-muted-light)", fontSize: 13 }} />
                  <YAxis tick={{ fill: "var(--text-muted-light)", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)" }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {statusData.map(entry => <Cell key={entry.name} fill={statusColors[entry.name] || "#60a5fa"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Anomalies */}
          <div style={card}>
            <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>🚨 Top Anomalous Complaints — Urgent Attention Needed</h2>
            <p style={{ color: "#f87171", fontSize: 13, marginBottom: 16, fontWeight: 600 }}>
              Note: The Red '✕' marks in the graphs represent these anomalous complaints. They are highly unusual or urgent and should be solved FIRST.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
              {top_anomalies.slice(0, 6).map((a, i) => (
                <div key={i} style={{ background: "var(--bg-inner)", border: "1px solid #dc262640", borderRadius: 12, padding: 14, color: "var(--text-main)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--text-main)", lineHeight: 1.4 }}>
                      {CATEGORY_ICONS[a.category] || "📋"} {a.text.length > 80 ? a.text.substring(0, 80) + "..." : a.text}
                    </p>
                    <span style={{ background: "#dc262620", color: "#f87171", border: "1px solid #f8717140", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {a.urgency_score}
                    </span>
                  </div>
                  <div style={{ marginTop: 6, color: "var(--text-muted)", fontSize: 11 }}>📍 {a.area}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========== TAB 2: VISUALIZATIONS ========== */}
      {activeTab === "visualizations" && (
        <div>
          {/* Elbow Method */}
          <div style={card}>
            <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>📉 Elbow Method — Optimal K</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "0 0 20px" }}>Inertia vs number of clusters. The "elbow" indicates optimal K for K-Means.</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={elbow.k_values.map((k, i) => ({ k, inertia: elbow.inertias[i] }))} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="k" label={{ value: "K (clusters)", position: "insideBottom", offset: -5, fill: "var(--text-muted)" }} tick={{ fill: "var(--text-muted-light)" }} />
                <YAxis tick={{ fill: "var(--text-muted-light)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)" }} formatter={v => [v.toFixed(1), "Inertia"]} />
                <Line type="monotone" dataKey="inertia" stroke="#a78bfa" strokeWidth={2.5} dot={{ fill: "#a78bfa", r: 5 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <span style={{ background: "#a78bfa20", border: "1px solid #a78bfa50", borderRadius: 20, padding: "4px 12px", fontSize: 12 }}>
                ✅ Optimal K = {metrics.optimal_k || elbow.k_values?.[elbow.inertias?.length - 1] || 5}
              </span>
            </div>
          </div>

          {/* K-Means Metrics Card */}
          <div style={{ marginBottom: 24 }}>
            <div style={card}>
              <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>🎯 K-Means Clustering Metrics</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <span style={{ color: "var(--text-muted-light)" }}>Silhouette Score:</span>
                  <span style={{ color: "#4ade80", fontWeight: 700 }}>{metrics.silhouette_score?.toFixed(4) || "N/A"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <span style={{ color: "var(--text-muted-light)" }}>Davies-Bouldin Index:</span>
                  <span style={{ color: "#fbbf24", fontWeight: 700 }}>{metrics.davies_bouldin?.toFixed(4) || "N/A"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                  <span style={{ color: "var(--text-muted-light)" }}>PCA Variance Explained:</span>
                  <span style={{ color: "#22d3ee", fontWeight: 700 }}>{(metrics.pca_variance * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* PCA Visualization */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setFullscreenChart({
                title: "📌 PCA — Complaint Clusters Visualization",
                subtitle: `Linear dimensionality reduction. Each dot = one complaint (${scatter.length} total).`,
                normalData: pcaNormal,
                anomalyData: pcaAnomalies,
                centroids: pcaCentroids,
                xDomain: pcaXDomain,
                yDomain: pcaYDomain,
                xLabel: "Principal Component 1 (PC1)",
                yLabel: "Principal Component 2 (PC2)"
              }) || setShowFullscreen(true)}
              style={{
                position: "absolute",
                top: 20,
                right: 30,
                zIndex: 10,
                background: "var(--border-color)",
                border: "none",
                borderRadius: 6,
                padding: "4px 12px",
                fontSize: 11,
                color: "var(--text-muted-light)",
                cursor: "pointer"
              }}
            >
              🖥️ Fullscreen
            </button>
            <ScatterViz
              title="📌 PCA — Complaint Clusters Visualization"
              subtitle={`Linear dimensionality reduction. Each dot = one complaint (${scatter.length} total). Colors = complaint category. Red X = anomaly.`}
              normalData={pcaNormal}
              anomalyData={pcaAnomalies}
              centroids={pcaCentroids}
              xDomain={pcaXDomain}
              yDomain={pcaYDomain}
              xLabel="Principal Component 1 (PC1)"
              yLabel="Principal Component 2 (PC2)"
              categories={activeCats}
            />
          </div>

          {/* t-SNE Visualization */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setFullscreenChart({
                title: "🌀 t-SNE — Non-linear Cluster Visualization",
                subtitle: `Non-linear projection that reveals local structure. (${scatter.length} points)`,
                normalData: tsneNormal,
                anomalyData: tsneAnomalies,
                centroids: tsneCentroids,
                xDomain: tsneXDomain,
                yDomain: tsneYDomain,
                xLabel: "t-SNE Dimension 1",
                yLabel: "t-SNE Dimension 2"
              }) || setShowFullscreen(true)}
              style={{
                position: "absolute",
                top: 20,
                right: 30,
                zIndex: 10,
                background: "var(--border-color)",
                border: "none",
                borderRadius: 6,
                padding: "4px 12px",
                fontSize: 11,
                color: "var(--text-muted-light)",
                cursor: "pointer"
              }}
            >
              🖥️ Fullscreen
            </button>
            <ScatterViz
              title="🌀 t-SNE — Non-linear Cluster Visualization"
              subtitle={`Non-linear projection that reveals local structure. Tight colour clusters = strong category signal.`}
              normalData={tsneNormal}
              anomalyData={tsneAnomalies}
              centroids={tsneCentroids}
              xDomain={tsneXDomain}
              yDomain={tsneYDomain}
              xLabel="t-SNE Dimension 1"
              yLabel="t-SNE Dimension 2"
              categories={activeCats}
            />
          </div>

          {/* K-Means Discovery Visualization */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => {
                const kmeansScatter = scatter.map(d => ({ ...d, x: d.pca_x, y: d.pca_y, category: `Cluster ${d.kmeans_label}` }))
                const { normal, anomalies } = splitScatter(kmeansScatter)
                const clusterNames = [...new Set(kmeansScatter.map(d => d.category))].sort()
                const centroids = computeCentroids(kmeansScatter, "x", "y")
                
                setFullscreenChart({
                  title: "🤖 K-Means — Machine Discovered Clusters",
                  subtitle: "Coloring by algorithmic cluster labels. This shows how the ML model grouped complaints based on hidden patterns.",
                  normalData: normal,
                  anomalyData: anomalies,
                  centroids: centroids,
                  xDomain: pcaXDomain,
                  yDomain: pcaYDomain,
                  xLabel: "Principal Component 1 (PC1)",
                  yLabel: "Principal Component 2 (PC2)",
                  categories: clusterNames
                }) || setShowFullscreen(true)
              }}
              style={{
                position: "absolute",
                top: 20,
                right: 30,
                zIndex: 10,
                background: "var(--border-color)",
                border: "none",
                borderRadius: 6,
                padding: "4px 12px",
                fontSize: 11,
                color: "var(--text-muted-light)",
                cursor: "pointer"
              }}
            >
              🖥️ Fullscreen
            </button>
            <ScatterViz
              title="🤖 K-Means — Machine Discovered Clusters"
              subtitle="Coloring points by their algorithmic cluster ID (C0, C1...). This reveals how the AI segments the data regardless of category."
              normalData={scatter.map(d => ({ ...d, x: d.pca_x, y: d.pca_y, category: `Cluster ${d.kmeans_label}` })).filter(d => d.anomaly !== "anomaly")}
              anomalyData={scatter.map(d => ({ ...d, x: d.pca_x, y: d.pca_y, category: `Cluster ${d.kmeans_label}` })).filter(d => d.anomaly === "anomaly")}
              centroids={computeCentroids(scatter.map(d => ({ ...d, x: d.pca_x, y: d.pca_y, category: `Cluster ${d.kmeans_label}` })), "x", "y")}
              xDomain={pcaXDomain}
              yDomain={pcaYDomain}
              xLabel="Principal Component 1 (PC1)"
              yLabel="Principal Component 2 (PC2)"
              categories={[...new Set(scatter.map(d => `Cluster ${d.kmeans_label}`))].sort()}
            />
          </div>
        </div>
      )}

      {/* ========== TAB 3: PIPELINE LOGS ========== */}
      {activeTab === "logs" && (
        <div style={card}>
          <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>🖥 Pipeline Execution Logs</h2>
          <div style={{
            background: "var(--bg-inner)",
            borderRadius: 12,
            padding: 20,
            maxHeight: 500,
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: 12,
            lineHeight: 1.8
          }}>
            {logs.map((line, i) => {
              let color = "#16a34a"
              if (line.includes("[STEP")) color = "#2563eb"
              else if (line.includes("⚠")) color = "#dc2626"
              else if (line.includes("PIPELINE COMPLETE")) color = "#d97706"
              else if (!line.startsWith("✓")) color = "var(--text-muted-light)"
              return (
                <div key={i} style={{ color, padding: "4px 0", borderBottom: i < logs.length - 1 ? "1px solid var(--border-color)" : "none" }}>
                  {line}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}