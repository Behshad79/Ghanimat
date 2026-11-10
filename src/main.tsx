import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './styles.css'
import { App } from './App'
import { applyTheme } from './shared/lib/store'

applyTheme()
createRoot(document.getElementById('root')!).render(<HashRouter><App /></HashRouter>)
