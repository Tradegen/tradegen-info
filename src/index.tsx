import * as Sentry from '@sentry/react'
import { Integrations } from '@sentry/tracing'
import React from 'react'
import { isMobile } from 'react-device-detect'
import ReactDOM from 'react-dom'
import ReactGA from 'react-ga'

import App from './App'
import ApplicationContextProvider from './contexts/Application'
import GlobalDataContextProvider from './contexts/GlobalData'
import LocalStorageContextProvider, { Updater as LocalStorageContextUpdater } from './contexts/LocalStorage'
import PairDataContextProvider, { Updater as PairDataContextUpdater } from './contexts/PairData'
import TokenDataContextProvider, { Updater as TokenDataContextUpdater } from './contexts/TokenData'
import PoolDataContextProvider, { Updater as PoolDataContextUpdater } from './contexts/PoolData'
import NFTPoolDataContextProvider, { Updater as NFTPoolDataContextUpdater } from './contexts/NFTPoolData'
import UserContextProvider from './contexts/User'
import ThemeProvider, { GlobalStyle } from './Theme'

// initialize GA
const GOOGLE_ANALYTICS_ID = process.env.REACT_APP_GOOGLE_ANALYTICS_ID

if (typeof GOOGLE_ANALYTICS_ID === 'string') {
  ReactGA.initialize(GOOGLE_ANALYTICS_ID, {
    gaOptions: {
      storage: 'none',
      storeGac: false,
    },
  })
  ReactGA.set({
    anonymizeIp: true,
    customBrowserType: !isMobile
      ? 'desktop'
      : 'web3' in window || 'ethereum' in window
        ? 'mobileWeb3'
        : 'mobileRegular',
  })
} else {
  ReactGA.initialize('test', { testMode: true, debug: true })
}

if (process.env.REACT_APP_SENTRY_DSN) {
  const sentryCfg = {
    environment: `${process.env.REACT_APP_VERCEL_ENV ?? 'unknown'}`,
    release: `${process.env.REACT_APP_VERCEL_GIT_COMMIT_REF?.replace(/\//g, '--') ?? 'unknown'}-${process.env.REACT_APP_VERCEL_GIT_COMMIT_SHA ?? 'unknown'
      }`,
  }
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    integrations: [new Integrations.BrowserTracing()],
    tracesSampleRate: 0.2,
    ...sentryCfg,
  })
  console.log(`Initializing Sentry environment at release ${sentryCfg.release} in environment ${sentryCfg.environment}`)
} else {
  console.warn(`REACT_APP_SENTRY_DSN not found. Sentry will not be loaded.`)
}

function ContextProviders({ children }: { children: React.ReactNode }) {
  return (
    <LocalStorageContextProvider>
      <ApplicationContextProvider>
        <TokenDataContextProvider>
          <PoolDataContextProvider>
            <NFTPoolDataContextProvider>
              <GlobalDataContextProvider>
                <PairDataContextProvider>
                  <UserContextProvider>{children}</UserContextProvider>
                </PairDataContextProvider>
              </GlobalDataContextProvider>
            </NFTPoolDataContextProvider>
          </PoolDataContextProvider>
        </TokenDataContextProvider>
      </ApplicationContextProvider>
    </LocalStorageContextProvider>
  )
}

function Updaters() {
  return (
    <>
      <LocalStorageContextUpdater />
      <PairDataContextUpdater />
      <TokenDataContextUpdater />
      <PoolDataContextUpdater />
      <NFTPoolDataContextUpdater />
    </>
  )
}

ReactDOM.render(
  <ContextProviders>
    <Updaters />
    <ThemeProvider>
      <>
        <GlobalStyle />
        <App />
      </>
    </ThemeProvider>
  </ContextProviders>,
  document.getElementById('root')
)
