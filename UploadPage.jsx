import { useState, useRef } from "react"

const UploadPage = ({ setResults, setLoading, loading }) => {
  const [file, setFile] = useState(null)
  const [logs, setLogs] = useState([])
  const [error, setError] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileRef = useRef()

  const runPipeline = async () => {
    setLogs([])
    setError(null)
    setUploadProgress(0)
    setLoading(true)

    const formData = new FormData()
    if (file) {
      formData.append("file", file)
    }

    try {
      const response = await fetch("http://localhost:9000/api/run", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          
          const payload = line.slice(6)
          try {
            const json = JSON.parse(payload)
            
            if (json.log) {
              setLogs(prev => [...prev, json.log])
              if (json.log.includes("STEP 1")) setUploadProgress(10)
              if (json.log.includes("STEP 2")) setUploadProgress(20)
              if (json.log.includes("STEP 3")) setUploadProgress(30)
              if (json.log.includes("STEP 4")) setUploadProgress(40)
              if (json.log.includes("STEP 5")) setUploadProgress(50)
              if (json.log.includes("STEP 6")) setUploadProgress(60)
              if (json.log.includes("STEP 7")) setUploadProgress(70)
              if (json.log.includes("STEP 8")) setUploadProgress(80)
              if (json.log.includes("STEP 9")) setUploadProgress(85)
              if (json.log.includes("STEP 10")) setUploadProgress(90)
              if (json.log.includes("PIPELINE COMPLETE")) setUploadProgress(100)
              
            } else if (json.error) {
              setError(json.error)
              setLoading(false)
              return
              
            } else if (json.total_complaints) {
              setResults(json)
              setLoading(false)
              setUploadProgress(100)
              return
            }
          } catch (err) {
            console.error("Parse error:", err)
          }
        }
      }
    } catch (err) {
      setError("Failed to connect to backend: " + err.message)
      setLoading(false)
    }
  }

  const resetUpload = () => {
    setFile(null)
    setLogs([])
    setError(null)
    setUploadProgress(0)
  }

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "var(--text-main)", maxWidth: 900, margin: "0 auto" }}>
      
      {/* Header - Clean, no blue box */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 style={{ 
          fontSize: 32, 
          fontWeight: 700, 
          background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: 12
        }}>
          🏛️ Civic Complaint Pattern Mining
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15 }}>
          Upload your complaint dataset to analyze patterns, detect anomalies, and visualize clusters
        </p>
      </div>

      {/* Upload Area */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: 20,
        padding: "32px",
        marginBottom: 32,
        color: "var(--text-main)"
      }}>
        <div
          onClick={() => fileRef.current.click()}
          style={{
            border: `2px dashed ${file ? "#4ade80" : "var(--border-color)"}`,
            borderRadius: 16,
            padding: "48px",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            background: file ? "#0f172a" : "transparent",
            marginBottom: 24
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.currentTarget.style.borderColor = "#60a5fa"
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-color)"
          }}
          onDrop={(e) => {
            e.preventDefault()
            const droppedFile = e.dataTransfer.files[0]
            if (droppedFile && droppedFile.name.endsWith(".csv")) {
              setFile(droppedFile)
            }
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>{file ? "📄" : "📂"}</div>
          {file ? (
            <>
              <p style={{ color: "#4ade80", fontWeight: 600, marginBottom: 8, fontSize: 16 }}>{file.name}</p>
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>{(file.size / 1024).toFixed(1)} KB</p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  resetUpload()
                }}
                style={{
                  background: "transparent",
                  border: "1px solid #f87171",
                  color: "#f87171",
                  borderRadius: 8,
                  padding: "6px 16px",
                  fontSize: 13,
                  cursor: "pointer",
                  marginTop: 16
                }}
              >
                Remove File
              </button>
            </>
          ) : (
            <>
              <p style={{ color: "var(--text-main)", fontWeight: 500, marginBottom: 8, fontSize: 16 }}>Drop CSV file here or click to browse</p>
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Supports .csv files with complaint text column</p>
              <p style={{ color: "var(--bg-hover)", fontSize: 12, marginTop: 12 }}>Leave empty to use 1000 synthetic complaints</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files[0]) {
                setFile(e.target.files[0])
                setError(null)
              }
            }}
          />
        </div>

        <button
          onClick={runPipeline}
          disabled={loading}
          style={{
            width: "100%",
            background: loading ? "var(--border-color)" : "linear-gradient(135deg, #60a5fa, #a78bfa)",
            border: "none",
            borderRadius: 12,
            padding: "16px",
            color: "white",
            fontWeight: 700,
            fontSize: 16,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s"
          }}
        >
          {loading ? (
            <>
              <span style={{ display: "inline-block", width: 18, height: 18, border: "2px solid white", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginRight: 10 }} />
              Analyzing Complaints... {uploadProgress}%
            </>
          ) : (
            "🚀 Run Analysis"
          )}
        </button>

        {loading && (
          <div style={{ marginTop: 16 }}>
            <div style={{ background: "var(--border-color)", borderRadius: 10, height: 6, overflow: "hidden" }}>
              <div style={{
                width: `${uploadProgress}%`,
                background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
                height: "100%",
                transition: "width 0.3s"
              }} />
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 10, textAlign: "center" }}>
              {uploadProgress < 30 && "📊 Loading dataset..."}
              {uploadProgress >= 30 && uploadProgress < 60 && "🔬 Clustering complaints..."}
              {uploadProgress >= 60 && uploadProgress < 90 && "📈 Generating visualizations..."}
              {uploadProgress >= 90 && "✅ Almost done..."}
            </p>
          </div>
        )}

        {error && (
          <div style={{
            marginTop: 16,
            background: "#7f1d1d33",
            border: "1px solid #f87171",
            borderRadius: 10,
            padding: 12,
            color: "#fca5a5",
            fontSize: 13
          }}>
            ❌ {error}
          </div>
        )}
      </div>

      {/* Feature Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
        {[
          { icon: "📊", title: "K-Means Clustering", desc: "Groups similar complaints automatically", color: "#60a5fa" },
          { icon: "⚠️", title: "Anomaly Detection", desc: "Flags urgent complaints using Isolation Forest", color: "#f87171" },
          { icon: "📈", title: "PCA & t-SNE", desc: "2D visualization of complaint patterns", color: "#a78bfa" },
          { icon: "🔗", title: "Association Rules", desc: "Finds co-occurring complaint types", color: "#fbbf24" }
        ].map(({ icon, title, desc, color }) => (
          <div key={title} style={{
            background: "var(--bg-card)",
            border: `1px solid ${color}30`,
            borderRadius: 16,
            padding: "20px",
            textAlign: "center",
            color: "var(--text-main)"
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
            <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color }}>{title}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>{desc}</p>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default UploadPage