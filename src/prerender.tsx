import { renderToString } from 'react-dom/server'
import { App } from './App'

export const markup = renderToString(<App />)
