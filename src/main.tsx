import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { applySecurityHeaders } from '@/utils/securityHeaders'

// Apply security headers
applySecurityHeaders();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
    <App />
  </ThemeProvider>
);
