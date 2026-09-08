import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { I18nProvider } from './lib/i18n'
import { LicenseProvider } from './lib/LicenseContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider defaultLocale="tr">
      <LicenseProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </LicenseProvider>
    </I18nProvider>
  </React.StrictMode>,
)
