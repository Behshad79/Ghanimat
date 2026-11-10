import { createRoot } from 'react-dom/client'
import { HashRouter, MemoryRouter } from 'react-router-dom'
import './styles.css'
import { App } from './App'
import { applyTheme } from './shared/lib/store'

applyTheme()
// پیش‌نمایش میزبانی‌شده داخل قاب اجرا می‌شود و نشانی را نگه نمی‌دارد؛ آنجا مسیریاب درون‌حافظه‌ای استفاده می‌شود.
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : HashRouter
createRoot(document.getElementById('root')!).render(<Router><App /></Router>)
