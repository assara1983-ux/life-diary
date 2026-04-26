import React from 'react'
import ReactDOM from 'react-dom/client'
import LifeDiary from './App.jsx'

const tg = window.Telegram?.WebApp
if (tg) {
  tg.ready()
  tg.expand()
  tg.setHeaderColor('#05080f')
  tg.setBackgroundColor('#05080f')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LifeDiary />
  </React.StrictMode>
)
