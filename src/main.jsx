import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("App-Fehler:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh", background: "#000", color: "#fff",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 16, padding: 24, textAlign: "center", fontFamily: "sans-serif"
        }}>
          <div style={{ fontSize: 40 }}>🎸💥</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Etwas ist schiefgelaufen.</div>
          <div style={{ fontSize: 13, color: "#888", maxWidth: 320 }}>
            Deine Daten sind sicher gespeichert. Ein Neuladen sollte helfen.
          </div>
          <button onClick={() => window.location.reload()} style={{
            background: "#5cc8b8", color: "#000", border: "none", borderRadius: 6,
            padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer"
          }}>Neu laden</button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    
