/**
 * main.tsx — Punto de entrada de la aplicación React.
 *
 * Monta el árbol de componentes en el elemento #root del index.html.
 * Toda la app queda envuelta en un <ErrorBoundary> que captura errores
 * de renderizado no controlados y muestra <ErrorFallback> en lugar de
 * una pantalla en blanco.
 */
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

// Estilos globales: reset, variables CSS del tema y utilidades de Tailwind
import "./main.css"
import "./styles/theme.css"
import "./index.css"

createRoot(document.getElementById('root')!).render(
  // ErrorBoundary actúa como red de seguridad para errores inesperados en runtime
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
   </ErrorBoundary>
)
