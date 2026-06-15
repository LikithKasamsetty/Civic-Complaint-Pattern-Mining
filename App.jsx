import { useState, useEffect } from "react"
import UploadPage from "./pages/UploadPage"
import DashboardPage from "./pages/DashboardPage"

export default function App() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState("dark")

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  return (
    <div className="min-h-screen">
      <nav style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="border-b px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M9 8h1"/><path d="M9 12h1"/><path d="M9 16h1"/><path d="M14 8h1"/><path d="M14 12h1"/><path d="M14 16h1"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>
        </div>
        <span className="font-semibold text-lg" style={{ color: 'var(--text-main)' }}>Civil Complaint</span>
        
        <div className="ml-auto flex items-center gap-4">
          <button
            onClick={toggleTheme}
            style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-hover)' }}
            className="text-sm px-3 py-1 rounded-lg border transition-colors hover:opacity-80"
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>

          {results && (
            <button
              onClick={() => setResults(null)}
              style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}
              className="text-sm px-3 py-1 rounded-lg border transition-colors hover:opacity-80"
            >
              ← New Analysis
            </button>
          )}
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {!results ? (
          <UploadPage setResults={setResults} setLoading={setLoading} loading={loading} />
        ) : (
          <DashboardPage results={results} />
        )}
      </main>
    </div>
  )
}