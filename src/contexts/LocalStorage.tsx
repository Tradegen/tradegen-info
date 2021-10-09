import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'

const TRADEGEN = 'TRADEGEN'

const VERSION = 'VERSION'
const CURRENT_VERSION = 0
const LAST_SAVED = 'LAST_SAVED'
const DISMISSED_PATHS = 'DISMISSED_PATHS'
const SAVED_ACCOUNTS = 'SAVED_ACCOUNTS'
const SAVED_POOLS = 'SAVED_POOLS'
const SAVED_NFT_POOLS = 'SAVED_NFT_POOLS'

const DARK_MODE = 'DARK_MODE'

const UPDATABLE_KEYS = [DARK_MODE, DISMISSED_PATHS, SAVED_ACCOUNTS, SAVED_POOLS, SAVED_NFT_POOLS]

const UPDATE_KEY = 'UPDATE_KEY'

type ILocalStorage = {
  [VERSION]: typeof CURRENT_VERSION
  [DARK_MODE]: boolean
  [DISMISSED_PATHS]: Record<string, unknown>
  [SAVED_ACCOUNTS]: string[]
  [SAVED_POOLS]: Record<string, unknown>
  [SAVED_NFT_POOLS]: Record<string, unknown>
}

const LocalStorageContext = createContext<[ILocalStorage | undefined, any]>([undefined, null])

function useLocalStorageContext() {
  return useContext(LocalStorageContext)
}

function reducer(state, { type, payload }) {
  switch (type) {
    case UPDATE_KEY: {
      const { key, value } = payload
      if (!UPDATABLE_KEYS.some((k) => k === key)) {
        throw Error(`Unexpected key in LocalStorageContext reducer: '${key}'.`)
      } else {
        return {
          ...state,
          [key]: value,
        }
      }
    }
    default: {
      throw Error(`Unexpected action type in LocalStorageContext reducer: '${type}'.`)
    }
  }
}

function init() {
  const defaultLocalStorage = {
    [VERSION]: CURRENT_VERSION,
    [DARK_MODE]: true,
    [DISMISSED_PATHS]: {},
    [SAVED_ACCOUNTS]: [],
    [SAVED_POOLS]: {},
    [SAVED_NFT_POOLS]: {},
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(TRADEGEN))
    if (parsed[VERSION] !== CURRENT_VERSION) {
      // this is where we could run migration logic
      return defaultLocalStorage
    } else {
      return { ...defaultLocalStorage, ...parsed }
    }
  } catch {
    return defaultLocalStorage
  }
}

export default function Provider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)

  const updateKey = useCallback((key, value) => {
    dispatch({ type: UPDATE_KEY, payload: { key, value } })
  }, [])

  return (
    <LocalStorageContext.Provider value={useMemo(() => [state, { updateKey }], [state, updateKey])}>
      {children}
    </LocalStorageContext.Provider>
  )
}

export function Updater() {
  const [state] = useLocalStorageContext()

  useEffect(() => {
    window.localStorage.setItem(TRADEGEN, JSON.stringify({ ...state, [LAST_SAVED]: Math.floor(Date.now() / 1000) }))
  })

  return null
}

export function useDarkModeManager(): [boolean, (v: boolean) => void] {
  const [state, { updateKey }] = useLocalStorageContext()
  const isDarkMode = state[DARK_MODE]
  const toggleDarkMode = useCallback(
    (value) => {
      updateKey(DARK_MODE, value === false || value === true ? value : !isDarkMode)
    },
    [updateKey, isDarkMode]
  )
  return [isDarkMode, toggleDarkMode]
}

export function usePathDismissed(path) {
  const [state, { updateKey }] = useLocalStorageContext()
  const pathDismissed = state?.[DISMISSED_PATHS]?.[path]
  function dismiss() {
    const newPaths = state?.[DISMISSED_PATHS]
    newPaths[path] = true
    updateKey(DISMISSED_PATHS, newPaths)
  }

  return [pathDismissed, dismiss]
}

export function useSavedAccounts() {
  const [state, { updateKey }] = useLocalStorageContext()
  const savedAccounts = state?.[SAVED_ACCOUNTS]

  const addAccount = useCallback(
    (account) => {
      updateKey(SAVED_ACCOUNTS, [...(savedAccounts ?? []), account])
    },
    [savedAccounts, updateKey]
  )

  const removeAccount = useCallback(
    (account) => {
      const index = savedAccounts?.indexOf(account) ?? -1
      if (index > -1) {
        updateKey(SAVED_ACCOUNTS, [
          ...savedAccounts.slice(0, index),
          ...savedAccounts.slice(index + 1, savedAccounts.length),
        ])
      }
    },
    [savedAccounts, updateKey]
  )

  return [savedAccounts, addAccount, removeAccount]
}

export function useSavedPools() {
  const [state, { updateKey }] = useLocalStorageContext()
  const savedPools = state?.[SAVED_POOLS]

  function addPool(address, name) {
    const newList = state?.[SAVED_POOLS]
    newList[address] = {
      name,
    }
    updateKey(SAVED_POOLS, newList)
  }

  function removePool(address) {
    const newList = state?.[SAVED_POOLS]
    newList[address] = null
    updateKey(SAVED_POOLS, newList)
  }

  return [savedPools, addPool, removePool]
}

export function useSavedNFTPools() {
  const [state, { updateKey }] = useLocalStorageContext()
  const savedNFTPools = state?.[SAVED_NFT_POOLS]

  function addNFTPool(address, name) {
    const newList = state?.[SAVED_NFT_POOLS]
    newList[address] = {
      name,
    }
    updateKey(SAVED_NFT_POOLS, newList)
  }

  function removeNFTPool(address) {
    const newList = state?.[SAVED_NFT_POOLS]
    newList[address] = null
    updateKey(SAVED_NFT_POOLS, newList)
  }

  return [savedNFTPools, addNFTPool, removeNFTPool]
}