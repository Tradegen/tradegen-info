import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react'

import { client, tradegenClient } from '../apollo/client'
import {
  AllPairsQuery,
  CeloPriceQuery,
  CeloPriceQueryVariables,
  CurrentCeloPriceQuery,
  GlobalDataLatestQuery,
  GlobalDataLatestQueryVariables,
  GlobalDataQuery,
  GlobalDataQueryVariables,
  GlobalTransactionsQuery,
  GlobalTransactionsTradegenQuery,
  GlobalDataTradegenLatestQuery,
  GlobalDataTradegenLatestQueryVariables,
  GlobalDataTradegenQuery,
  GlobalDataTradegenQueryVariables
} from '../apollo/generated/types'
import {
  ALL_POOLS,
  ALL_NFT_POOLS,
  CELO_PRICE,
  CURRENT_CELO_PRICE,
  GLOBAL_CHART,
  GLOBAL_DATA,
  GLOBAL_DATA_LATEST,
  GLOBAL_TXNS,
  GLOBAL_TXNS_TRADEGEN,
  TOP_LPS_PER_PAIRS,
  GLOBAL_DATA_TRADEGEN,
  GLOBAL_DATA_TRADEGEN_LATEST,
  GLOBAL_CHART_TRADEGEN,
  TOP_POSITIONS_PER_NFT_POOL,
  TOP_POSITIONS_PER_POOL
} from '../apollo/queries'
import { FACTORY_ADDRESS, ADDRESS_RESOLVER_ADDRESS } from '../constants'
import {
  get2DayPercentChange,
  getBlockFromTimestamp,
  getBlocksFromTimestamps,
  getPercentChange,
  getTimeframe,
} from '../utils'
import { toBigDecimal } from '../utils/typeAssertions'
import { useTimeframe } from './Application'
import { useAllPairData } from './PairData'
import { useAllPoolData } from './PoolData'
import { useAllNFTPoolData } from './NFTPoolData'
import { useTokenChartDataCombined } from './TokenData'

const UPDATE = 'UPDATE'
const UPDATE_TXNS = 'UPDATE_TXNS'
const UPDATE_TXNS_TRADEGEN = 'UPDATE_TXNS_TRADEGEN'
const UPDATE_CHART = 'UPDATE_CHART'
const UPDATE_CELO_PRICE = 'UPDATE_CELO_PRICE'
const CELO_PRICE_KEY = 'CELO_PRICE_KEY'
const UPDATE_ALL_PAIRS_IN_UBESWAP = 'UPDATE_TOP_PAIRS'
const UPDATE_ALL_TOKENS_IN_UBESWAP = 'UPDATE_ALL_TOKENS_IN_UBESWAP'
const UPDATE_TOP_LPS = 'UPDATE_TOP_LPS'
const UPDATE_TRADEGEN = 'UPDATE_TRADEGEN'
const UPDATE_TOP_POSITIONS = 'UPDATE_TOP_POSITIONS'
const UPDATE_ALL_POOLS_IN_TRADEGEN = 'UPDATE_ALL_POOLS_IN_TRADEGEN'
const UPDATE_ALL_NFT_POOLS_IN_TRADEGEN = 'UPDATE_ALL_NFT_POOLS_IN_TRADEGEN'

const offsetVolumes = [
  // '0x9ea3b5b4ec044b70375236a281986106457b20ef',
  // '0x05934eba98486693aaec2d00b0e9ce918e37dc3f',
  // '0x3d7e683fc9c86b4d653c9e47ca12517440fad14e',
  // '0xfae9c647ad7d89e738aba720acf09af93dc535f7',
  // '0x7296368fe9bcb25d3ecc19af13655b907818cc09',
]

// format dayjs with the libraries that we need
dayjs.extend(utc)
dayjs.extend(weekOfYear)

interface IGlobalDataState {
  globalData?: IGlobalData
  globalDataTradegen?: IGlobalDataTradegen
  chartData?: {
    daily: unknown
    weekly: unknown
  }
  transactions?: unknown
  transactionsTradegen?: unknown
  allPairs: unknown
  allTokens: unknown
  topLps: unknown
  topPositions: unknown
  allPools: unknown
  allNFTPools: unknown
}

interface IGlobalDataActions {
  update: (data: IGlobalData) => void
  updateAllPairsInUbeswap: (pairs: AllPairsQuery['pairs']) => void
  updateAllTokensInUbeswap: (tokens: unknown[]) => void
  updateChart: (data: unknown, weekly: unknown) => void
  updateTransactions: (txns: unknown) => void
  updateTopLps: (lps: unknown) => void
  updateCeloPrice: (newPrice: unknown, oneDayPrice: unknown, priceChange: unknown) => void
  updateTradegen: (data: IGlobalDataTradegen) => void
  updateTransactionsTradegen: (txns: unknown) => void
  updateTopPositions: (positions: unknown) => void
  updateAllPoolsInTradegen: (tokens: unknown[]) => void
  updateAllNFTPoolsInTradegen: (tokens: unknown[]) => void
}

const GlobalDataContext = createContext<[IGlobalDataState, IGlobalDataActions]>(null)

function useGlobalDataContext() {
  return useContext(GlobalDataContext)
}

function reducer(state, { type, payload }) {
  switch (type) {
    case UPDATE: {
      const { data } = payload
      return {
        ...state,
        globalData: data,
      }
    }
    case UPDATE_TXNS: {
      const { transactions } = payload
      return {
        ...state,
        transactions,
      }
    }
    case UPDATE_TXNS_TRADEGEN: {
      const { transactionsTradegen } = payload
      return {
        ...state,
        transactionsTradegen,
      }
    }
    case UPDATE_CHART: {
      const { daily, weekly } = payload
      return {
        ...state,
        chartData: {
          daily,
          weekly,
        },
      }
    }
    case UPDATE_CELO_PRICE: {
      const { celoPrice, oneDayPrice, celoPriceChange } = payload
      return {
        ...state,
        [CELO_PRICE_KEY]: celoPrice,
        oneDayPrice,
        celoPriceChange,
      }
    }

    case UPDATE_ALL_PAIRS_IN_UBESWAP: {
      const { allPairs } = payload
      return {
        ...state,
        allPairs,
      }
    }

    case UPDATE_ALL_TOKENS_IN_UBESWAP: {
      const { allTokens } = payload
      return {
        ...state,
        allTokens,
      }
    }

    case UPDATE_TOP_LPS: {
      const { topLps } = payload
      return {
        ...state,
        topLps,
      }
    }

    case UPDATE_TRADEGEN: {
      const { data } = payload
      return {
        ...state,
        globalDataTradegen: data,
      }
    }

    case UPDATE_TOP_POSITIONS: {
      const { topPositions } = payload
      return {
        ...state,
        topPositions,
      }
    }

    case UPDATE_ALL_POOLS_IN_TRADEGEN: {
      const { allPools } = payload
      return {
        ...state,
        allPools,
      }
    }

    case UPDATE_ALL_NFT_POOLS_IN_TRADEGEN: {
      const { allNFTPools } = payload
      return {
        ...state,
        allNFTPools,
      }
    }

    default: {
      throw Error(`Unexpected action type in DataContext reducer: '${type}'.`)
    }
  }
}

export default function Provider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {})
  const update = useCallback((data) => {
    dispatch({
      type: UPDATE,
      payload: {
        data,
      },
    })
  }, [])

  const updateTransactions = useCallback((transactions) => {
    dispatch({
      type: UPDATE_TXNS,
      payload: {
        transactions,
      },
    })
  }, [])

  const updateTransactionsTradegen = useCallback((transactionsTradegen) => {
    dispatch({
      type: UPDATE_TXNS_TRADEGEN,
      payload: {
        transactionsTradegen,
      },
    })
  }, [])

  const updateChart = useCallback((daily, weekly) => {
    dispatch({
      type: UPDATE_CHART,
      payload: {
        daily,
        weekly,
      },
    })
  }, [])

  const updateCeloPrice = useCallback((celoPrice, oneDayPrice, celoPriceChange) => {
    dispatch({
      type: UPDATE_CELO_PRICE,
      payload: {
        celoPrice,
        oneDayPrice,
        celoPriceChange,
      },
    })
  }, [])

  const updateAllPairsInUbeswap = useCallback((allPairs) => {
    dispatch({
      type: UPDATE_ALL_PAIRS_IN_UBESWAP,
      payload: {
        allPairs,
      },
    })
  }, [])

  const updateAllTokensInUbeswap = useCallback((allTokens) => {
    dispatch({
      type: UPDATE_ALL_TOKENS_IN_UBESWAP,
      payload: {
        allTokens,
      },
    })
  }, [])

  const updateTopLps = useCallback((topLps) => {
    dispatch({
      type: UPDATE_TOP_LPS,
      payload: {
        topLps,
      },
    })
  }, [])

  const updateTradegen = useCallback((data) => {
    dispatch({
      type: UPDATE_TRADEGEN,
      payload: {
        data,
      },
    })
  }, [])

  const updateTopPositions = useCallback((topPositions) => {
    dispatch({
      type: UPDATE_TOP_POSITIONS,
      payload: {
        topPositions,
      },
    })
  }, [])

  const updateAllPoolsInTradegen = useCallback((allPools) => {
    dispatch({
      type: UPDATE_ALL_POOLS_IN_TRADEGEN,
      payload: {
        allPools,
      },
    })
  }, [])

  const updateAllNFTPoolsInTradegen = useCallback((allNFTPools) => {
    dispatch({
      type: UPDATE_ALL_NFT_POOLS_IN_TRADEGEN,
      payload: {
        allNFTPools,
      },
    })
  }, [])

  return (
    <GlobalDataContext.Provider
      value={useMemo(
        () => [
          state,
          {
            update,
            updateTransactions,
            updateChart,
            updateCeloPrice,
            updateTopLps,
            updateAllPairsInUbeswap,
            updateAllTokensInUbeswap,
            updateTradegen,
            updateTransactionsTradegen,
            updateTopPositions,
            updateAllPoolsInTradegen,
            updateAllNFTPoolsInTradegen
          },
        ],
        [
          state,
          update,
          updateTransactions,
          updateTopLps,
          updateChart,
          updateCeloPrice,
          updateAllPairsInUbeswap,
          updateAllTokensInUbeswap,
          updateTradegen,
          updateTransactionsTradegen,
          updateTopPositions,
          updateAllPoolsInTradegen,
          updateAllNFTPoolsInTradegen
        ]
      )}
    >
      {children}
    </GlobalDataContext.Provider>
  )
}

type IGlobalData = GlobalDataQuery['ubeswapFactories'][number] &
  Partial<{
    oneDayVolumeUSD: number
    oneWeekVolumeUSD: number
    weeklyVolumeChange: number
    volumeChangeUSD: number
    liquidityChangeUSD: number
    oneDayTxns: number
    txnChange: number
  }>

type IGlobalDataTradegen = GlobalDataTradegenQuery['tradegens'][number] &
  Partial<{
    oneDayVolumeUSD: number
    oneWeekVolumeUSD: number
    weeklyVolumeChange: number
    volumeChangeUSD: number
    totalValueLockedChangeUSD: number
    oneDayTxns: number
    txnChange: number
  }>

/**
 * Gets all the global data for the overview page.
 * Needs current eth price and the old eth price to get
 * 24 hour USD changes.
 * @param {*} celoPrice
 * @param {*} oldCeloPrice
 */

async function getGlobalData(): Promise<IGlobalData | null> {
  // data for each day , historic data used for % changes
  let data: IGlobalData | null = null
  let oneDayData: GlobalDataQuery['ubeswapFactories'][number] | null = null
  let twoDayData: GlobalDataQuery['ubeswapFactories'][number] | null = null

  try {
    // get timestamps for the days
    const utcCurrentTime = dayjs()
    const utcOneDayBack = utcCurrentTime.subtract(1, 'day').unix()
    const utcTwoDaysBack = utcCurrentTime.subtract(2, 'day').unix()
    const utcOneWeekBack = utcCurrentTime.subtract(1, 'week').unix()
    const utcTwoWeeksBack = utcCurrentTime.subtract(2, 'week').unix()

    // get the blocks needed for time travel queries
    const [oneDayBlock, twoDayBlock, oneWeekBlock, twoWeekBlock] = await getBlocksFromTimestamps([
      utcOneDayBack,
      utcTwoDaysBack,
      utcOneWeekBack,
      utcTwoWeeksBack,
    ])

    // fetch the global data
    const result = await client.query<GlobalDataLatestQuery, GlobalDataLatestQueryVariables>({
      query: GLOBAL_DATA_LATEST,
      variables: {
        factoryAddress: FACTORY_ADDRESS,
      },
      fetchPolicy: 'cache-first',
    })
    data = result.data.ubeswapFactories[0]

    // fetch the historical data
    const oneDayResult = await client.query<GlobalDataQuery, GlobalDataQueryVariables>({
      query: GLOBAL_DATA,
      variables: {
        block: oneDayBlock?.number,
        factoryAddress: FACTORY_ADDRESS,
      },
      fetchPolicy: 'cache-first',
    })
    oneDayData = oneDayResult.data.ubeswapFactories[0]

    const twoDayResult = await client.query<GlobalDataQuery, GlobalDataQueryVariables>({
      query: GLOBAL_DATA,
      variables: {
        block: twoDayBlock?.number,
        factoryAddress: FACTORY_ADDRESS,
      },
      fetchPolicy: 'cache-first',
    })
    twoDayData = twoDayResult.data.ubeswapFactories[0]

    const oneWeekResult = await client.query<GlobalDataQuery, GlobalDataQueryVariables>({
      query: GLOBAL_DATA,
      variables: {
        block: oneWeekBlock?.number,
        factoryAddress: FACTORY_ADDRESS,
      },
      fetchPolicy: 'cache-first',
    })
    const oneWeekData = oneWeekResult.data.ubeswapFactories[0]

    const twoWeekResult = await client.query<GlobalDataQuery>({
      query: GLOBAL_DATA,
      variables: {
        block: twoWeekBlock?.number,
        factoryAddress: FACTORY_ADDRESS,
      },
      fetchPolicy: 'cache-first',
    })
    const twoWeekData = twoWeekResult.data.ubeswapFactories[0]

    if (data && oneDayData && twoDayData && twoWeekData) {
      const [oneDayVolumeUSD, volumeChangeUSD] = get2DayPercentChange(
        data.totalVolumeUSD,
        oneDayData.totalVolumeUSD,
        twoDayData.totalVolumeUSD
      )

      const [oneWeekVolume, weeklyVolumeChange] = get2DayPercentChange(
        data.totalVolumeUSD,
        oneWeekData.totalVolumeUSD,
        twoWeekData.totalVolumeUSD
      )

      const [oneDayTxns, txnChange] = get2DayPercentChange(
        data.txCount,
        oneDayData.txCount ? oneDayData.txCount : '0',
        twoDayData.txCount ? twoDayData.txCount : '0'
      )

      // format the total liquidity in USD
      const liquidityChangeUSD = getPercentChange(data.totalLiquidityUSD, oneDayData.totalLiquidityUSD)
      const additionalData = {
        // add relevant fields with the calculated amounts
        oneDayVolumeUSD: oneDayVolumeUSD,
        oneWeekVolume: oneWeekVolume,
        weeklyVolumeChange: weeklyVolumeChange,
        volumeChangeUSD: volumeChangeUSD,
        liquidityChangeUSD: liquidityChangeUSD,
        oneDayTxns: oneDayTxns,
        txnChange: txnChange,
      }
      return { ...data, ...additionalData }
    }
  } catch (e) {
    console.log(e)
  }

  return data
}

/**
 * Get historical data for volume and liquidity used in global charts
 * on main page
 * @param {*} oldestDateToFetch // start of window to fetch from
 */

let checked = false
const getChartData = async (oldestDateToFetch, offsetData) => {
  let data = []
  const weeklyData = []
  const utcEndTime = dayjs.utc()
  let skip = 0
  let allFound = false

  try {
    while (!allFound) {
      const result = await tradegenClient.query({
        query: GLOBAL_CHART_TRADEGEN,
        variables: {
          startTime: oldestDateToFetch,
          skip,
        },
        fetchPolicy: 'cache-first',
      })
      skip += 1000
      data = data.concat(result.data.tradegenDayDatas)
      if (result.data.tradegenDayDatas.length < 1000) {
        allFound = true
      }
    }

    if (data) {
      const dayIndexSet = new Set()
      const dayIndexArray = []
      const oneDay = 24 * 60 * 60

      // for each day, parse the daily volume and format for chart array
      data.forEach((dayData, i) => {
        // add the day index to the set of days
        dayIndexSet.add((data[i].date / oneDay).toFixed(0))
        dayIndexArray.push(data[i])
        dayData.dailyVolumeUSD = parseFloat((BigInt(dayData.dailyVolumeUSD.toString().split(".")[0]) / BigInt("1000000000000000000")).toString())
        dayData.totalValueLockedUSD = parseFloat((BigInt(dayData.totalValueLockedUSD.toString().split(".")[0]) / BigInt("1000000000000000000")).toString())
      })

      // fill in empty days ( there will be no day datas if no trades made that day )
      let timestamp = data[0].date ? data[0].date : oldestDateToFetch
      let latestValueLockedUSD = data[0].totalValueLockedUSD
      let latestDayDats = data[0].mostLiquidTokens
      let index = 1
      console.log(latestValueLockedUSD)
      while (timestamp < utcEndTime.unix() - oneDay) {
        const nextDay = timestamp + oneDay
        const currentDayIndex = (nextDay / oneDay).toFixed(0)

        if (!dayIndexSet.has(currentDayIndex)) {
          data.push({
            date: nextDay,
            dailyVolumeUSD: 0,
            totalValueLockedUSD: latestValueLockedUSD,
            mostLiquidTokens: latestDayDats,
          })
        } else {
          latestValueLockedUSD = dayIndexArray[index].totalValueLockedUSD
          latestDayDats = dayIndexArray[index].mostLiquidTokens
          index = index + 1
        }
        timestamp = nextDay
      }
    }

    // format weekly data for weekly sized chunks
    data = data.sort((a, b) => (parseInt(a.date) > parseInt(b.date) ? 1 : -1))
    let startIndexWeekly = -1
    let currentWeek = -1

    data.forEach((entry, i) => {
      const date = data[i].date

      // hardcoded fix for offset volume
      offsetData &&
        offsetData.map((dayData) => {
          if (dayData[date]) {
            data[i].dailyVolumeUSD = parseFloat((BigInt((data[i].dailyVolumeUSD - dayData.dailyVolumeUSD).toString()) / BigInt("1000000000000000000")).toString())
          }
          return true
        })

      const week = dayjs.utc(dayjs.unix(data[i].date)).week()
      if (week !== currentWeek) {
        currentWeek = week
        startIndexWeekly++
      }
      weeklyData[startIndexWeekly] = weeklyData[startIndexWeekly] || {}
      weeklyData[startIndexWeekly].date = data[i].date
      weeklyData[startIndexWeekly].weeklyVolumeUSD =
        (weeklyData[startIndexWeekly].weeklyVolumeUSD ? parseFloat((BigInt(weeklyData[startIndexWeekly].weeklyVolumeUSD.toString()) / BigInt("1000000000000000000")).toString()) : 0)
        + parseFloat(data[i].dailyVolumeUSD.toString())
    })

    if (!checked) {
      checked = true
    }
  } catch (e) {
    console.log(e)
  }
  return [data, weeklyData]
}

/**
 * Get and format transactions for global page
 */
const getGlobalTransactions = async () => {
  const mints = []
  const burns = []
  const swaps = []

  try {
    const result = await client.query<GlobalTransactionsQuery>({
      query: GLOBAL_TXNS,
      fetchPolicy: 'cache-first',
    })
    result?.data?.transactions &&
      result.data.transactions.map((transaction) => {
        if (transaction.mints.length > 0) {
          transaction.mints.map((mint) => {
            return mints.push(mint)
          })
        }
        if (transaction.burns.length > 0) {
          transaction.burns.map((burn) => {
            return burns.push(burn)
          })
        }
        if (transaction.swaps.length > 0) {
          transaction.swaps.map((swap) => {
            return swaps.push(swap)
          })
        }
        return true
      })

    return { mints, burns, swaps }
  } catch (e) {
    console.log(e)
  }

  return {}
}

/**
 * Gets the current price of CELO, 24 hour price, and % change between them
 */
const getCeloPrice = async () => {
  const utcCurrentTime = dayjs()
  const utcOneDayBack = utcCurrentTime.subtract(1, 'day').startOf('minute').unix()

  let celoPrice = 0
  let celoPriceOneDay = 0
  let priceChangeCelo = 0

  try {
    const result = await client.query<CurrentCeloPriceQuery>({
      query: CURRENT_CELO_PRICE,
      fetchPolicy: 'cache-first',
    })
    const currentPrice = result?.data?.bundles[0]?.celoPrice
    celoPrice = parseFloat(currentPrice)
  } catch (e) {
    console.log(e)
  }

  try {
    const oneDayBlock = await getBlockFromTimestamp(utcOneDayBack)
    const resultOneDay = oneDayBlock
      ? await client.query<CeloPriceQuery, CeloPriceQueryVariables>({
        query: CELO_PRICE,
        fetchPolicy: 'cache-first',
        variables: {
          block: oneDayBlock,
        },
      })
      : null
    const oneDayBackPrice = resultOneDay?.data?.bundles[0]?.celoPrice ?? celoPrice.toString()
    priceChangeCelo = getPercentChange(celoPrice.toString(), oneDayBackPrice)
    celoPriceOneDay = parseFloat(oneDayBackPrice)
  } catch (e) {
    console.log(e)
  }

  return [celoPrice, celoPriceOneDay, priceChangeCelo]
}

const PAIRS_TO_FETCH = 500
const TOKENS_TO_FETCH = 500

/**
 * Hook that fetches overview data, plus all pools and NFT pools for search
 */
export function useGlobalData(): Partial<IGlobalDataTradegen> {
  const [state, { updateTradegen, updateAllPoolsInTradegen, updateAllNFTPoolsInTradegen }] = useGlobalDataContext()

  const data: IGlobalDataTradegen | undefined = state?.globalDataTradegen

  const fetchData = useCallback(async () => {
    const globalDataTradegen = await getGlobalDataTradegen()

    if (globalDataTradegen) {
      updateTradegen(globalDataTradegen)
    }

    const allPools = await getAllPoolsOnTradegen()
    updateAllPoolsInTradegen(allPools)

    const allNFTPools = await getAllNFTPoolsOnTradegen()
    updateAllNFTPoolsInTradegen(allNFTPools)
  }, [updateTradegen, updateAllPoolsInTradegen, updateAllNFTPoolsInTradegen])

  useEffect(() => {
    if (!data) {
      fetchData()
    }
  }, [data, fetchData, state])

  return data ?? {}
}

export function useGlobalChartData() {
  const [state, { updateChart }] = useGlobalDataContext()
  const [oldestDateFetch, setOldestDateFetched] = useState<number | undefined>()
  const [activeWindow] = useTimeframe()

  const chartDataDaily = state?.chartData?.daily
  const chartDataWeekly = state?.chartData?.weekly

  /**
   * Keep track of oldest date fetched. Used to
   * limit data fetched until its actually needed.
   * (dont fetch year long stuff unless year option selected)
   */
  useEffect(() => {
    // based on window, get starttime
    const startTime = getTimeframe(activeWindow)

    if (!oldestDateFetch || (activeWindow && startTime < oldestDateFetch)) {
      setOldestDateFetched(startTime)
    }
  }, [activeWindow, oldestDateFetch])

  // fix for rebass tokens

  const combinedData = useTokenChartDataCombined(offsetVolumes)

  /**
   * Fetch data if none fetched or older data is needed
   */
  useEffect(() => {
    async function fetchData() {
      // historical stuff for chart
      const [newChartData, newWeeklyData] = await getChartData(oldestDateFetch, combinedData)
      updateChart(newChartData, newWeeklyData)
    }
    if (oldestDateFetch && !(chartDataDaily && chartDataWeekly) && combinedData) {
      fetchData()
    }
  }, [chartDataDaily, chartDataWeekly, combinedData, oldestDateFetch, updateChart])

  return [chartDataDaily, chartDataWeekly]
}

export function useGlobalTransactions() {
  const [state, { updateTransactions }] = useGlobalDataContext()
  const transactions = state?.transactions
  useEffect(() => {
    async function fetchData() {
      if (!transactions) {
        const txns = await getGlobalTransactions()
        updateTransactions(txns)
      }
    }
    fetchData()
  }, [updateTransactions, transactions])
  return transactions
}

export function useCeloPrice() {
  const [state, { updateCeloPrice }] = useGlobalDataContext()
  const celoPrice = state?.[CELO_PRICE_KEY]
  const celoPriceOld = state?.['oneDayPrice']
  useEffect(() => {
    async function checkForCeloPrice() {
      if (!celoPrice) {
        const [newPrice, oneDayPrice, priceChange] = await getCeloPrice()
        updateCeloPrice(newPrice, oneDayPrice, priceChange)
      }
    }
    checkForCeloPrice()
  }, [celoPrice, updateCeloPrice])

  return [celoPrice, celoPriceOld]
}

export function useAllPairsInUbeswap() {
  const [state] = useGlobalDataContext()
  const allPairs = state?.allPairs

  return allPairs || []
}

export function useAllTokensInUbeswap() {
  const [state] = useGlobalDataContext()
  const allTokens = state?.allTokens

  return allTokens || []
}

/**
 * Get the top liquidity positions based on USD size
 * @TODO Not a perfect lookup needs improvement
 */
export function useTopLps() {
  const [state, { updateTopLps }] = useGlobalDataContext()
  const topLps = state?.topLps

  const allPairs = useAllPairData()

  useEffect(() => {
    async function fetchData() {
      // get top 20 by reserves
      const topPairs = Object.keys(allPairs)
        ?.sort((a, b) => parseFloat((allPairs[a].reserveUSD > allPairs[b].reserveUSD ? -1 : 1).toString()))
        ?.slice(0, 99)
        .map((pair) => pair)

      const topLpLists = await Promise.all(
        topPairs.map(async (pair) => {
          // for each one, fetch top LPs
          try {
            const { data: results } = await client.query({
              query: TOP_LPS_PER_PAIRS,
              variables: {
                pair: pair.toString(),
              },
              fetchPolicy: 'cache-first',
            })
            if (results) {
              return results.liquidityPositions
            }
          } catch (e) { }
        })
      )

      // get the top lps from the results formatted
      const topLps = []
      topLpLists
        .filter((i) => !!i) // check for ones not fetched correctly
        .map((list) => {
          return list.map((entry) => {
            const pairData = allPairs[entry.pair.id]
            return topLps.push({
              user: entry.user,
              pairName: pairData.token0.symbol + '-' + pairData.token1.symbol,
              pairAddress: entry.pair.id,
              token0: pairData.token0.id,
              token1: pairData.token1.id,
              usd:
                (parseFloat(entry.liquidityTokenBalance) / parseFloat(pairData.totalSupply)) *
                parseFloat(pairData.reserveUSD),
            })
          })
        })

      const sorted = topLps.sort((a, b) => (a.usd > b.usd ? -1 : 1))
      const shorter = sorted.splice(0, 100)
      updateTopLps(shorter)
    }

    if (!topLps && allPairs && Object.keys(allPairs).length > 0) {
      fetchData()
    }
  })

  return topLps
}

async function getGlobalDataTradegen(): Promise<IGlobalDataTradegen | null> {
  // data for each day , historic data used for % changes
  let data: IGlobalDataTradegen | null = null
  let oneDayData: GlobalDataTradegenQuery['tradegens'][number] | null = null
  let twoDayData: GlobalDataTradegenQuery['tradegens'][number] | null = null

  try {
    // get timestamps for the days
    const utcCurrentTime = dayjs()
    const utcOneDayBack = utcCurrentTime.subtract(1, 'day').unix()
    const utcTwoDaysBack = utcCurrentTime.subtract(2, 'day').unix()
    const utcOneWeekBack = utcCurrentTime.subtract(1, 'week').unix()
    const utcTwoWeeksBack = utcCurrentTime.subtract(2, 'week').unix()

    // get the blocks needed for time travel queries
    const [oneDayBlock, twoDayBlock, oneWeekBlock, twoWeekBlock] = await getBlocksFromTimestamps([
      utcOneDayBack,
      utcTwoDaysBack,
      utcOneWeekBack,
      utcTwoWeeksBack,
    ])

    // fetch the global data
    const result = await tradegenClient.query<GlobalDataTradegenLatestQuery, GlobalDataTradegenLatestQueryVariables>({
      query: GLOBAL_DATA_TRADEGEN_LATEST,
      variables: {
        addressResolverAddress: ADDRESS_RESOLVER_ADDRESS,
      },
      fetchPolicy: 'cache-first',
    })
    data = result.data.tradegens[0]

    // fetch the historical data
    const oneDayResult = await tradegenClient.query<GlobalDataTradegenLatestQuery, GlobalDataTradegenQueryVariables>({
      query: GLOBAL_DATA_TRADEGEN,
      variables: {
        block: oneDayBlock?.number,
        addressResolverAddress: ADDRESS_RESOLVER_ADDRESS,
      },
      fetchPolicy: 'cache-first',
    })
    oneDayData = oneDayResult.data.tradegens[0]

    const twoDayResult = await tradegenClient.query<GlobalDataTradegenLatestQuery, GlobalDataTradegenQueryVariables>({
      query: GLOBAL_DATA_TRADEGEN,
      variables: {
        block: twoDayBlock?.number,
        addressResolverAddress: ADDRESS_RESOLVER_ADDRESS,
      },
      fetchPolicy: 'cache-first',
    })
    twoDayData = twoDayResult.data.tradegens[0]

    const oneWeekResult = await tradegenClient.query<GlobalDataTradegenLatestQuery, GlobalDataTradegenQueryVariables>({
      query: GLOBAL_DATA_TRADEGEN,
      variables: {
        block: oneWeekBlock?.number,
        addressResolverAddress: ADDRESS_RESOLVER_ADDRESS,
      },
      fetchPolicy: 'cache-first',
    })
    const oneWeekData = oneWeekResult.data.tradegens[0]

    const twoWeekResult = await tradegenClient.query<GlobalDataTradegenQuery>({
      query: GLOBAL_DATA_TRADEGEN,
      variables: {
        block: twoWeekBlock?.number,
        addressResolverAddress: ADDRESS_RESOLVER_ADDRESS,
      },
      fetchPolicy: 'cache-first',
    })
    const twoWeekData = twoWeekResult.data.tradegens[0]

    if (data && oneDayData && twoDayData && twoWeekData) {
      const [oneDayVolumeUSD, volumeChangeUSD] = get2DayPercentChange(
        data.totalVolumeUSD,
        oneDayData.totalVolumeUSD,
        twoDayData.totalVolumeUSD
      )

      const [oneWeekVolume, weeklyVolumeChange] = get2DayPercentChange(
        data.totalVolumeUSD,
        oneWeekData.totalVolumeUSD,
        twoWeekData.totalVolumeUSD
      )

      const [oneDayTxns, txnChange] = get2DayPercentChange(
        data.txCount,
        oneDayData.txCount ? oneDayData.txCount : '0',
        twoDayData.txCount ? twoDayData.txCount : '0'
      )

      // format the total value locked in USD
      const totalValueLockedChangeUSD = getPercentChange(data.totalValueLockedUSD, oneDayData.totalValueLockedUSD)
      const additionalData = {
        // add relevant fields with the calculated amounts
        oneDayVolumeUSD: oneDayVolumeUSD,
        oneWeekVolume: oneWeekVolume,
        weeklyVolumeChange: weeklyVolumeChange,
        volumeChangeUSD: volumeChangeUSD,
        totalValueLockedChangeUSD: totalValueLockedChangeUSD,
        oneDayTxns: oneDayTxns,
        txnChange: txnChange,
      }
      return { ...data, ...additionalData }
    }
  } catch (e) {
    console.log(e)
  }

  return data
}

/**
 * Get and format transactions for global page
 */
const getGlobalTransactionsTradegen = async () => {
  const depositPools = []
  const withdrawPools = []
  const mintFeePools = []
  const depositNFTPools = []
  const withdrawNFTPools = []

  try {
    const result = await tradegenClient.query<GlobalTransactionsTradegenQuery>({
      query: GLOBAL_TXNS_TRADEGEN,
      fetchPolicy: 'cache-first',
    })
    result?.data?.poolTransactions &&
      result.data.poolTransactions.map((transaction) => {
        if (transaction.deposit) {
          return depositPools.push(transaction.deposit)
        }
        if (transaction.withdraw) {
          return withdrawPools.push(transaction.withdraw)
        }
        if (transaction.mintFee) {
          return mintFeePools.push(transaction.mintFee)
        }
        return true
      })
    result?.data?.nftpoolTransactions &&
      result.data.nftpoolTransactions.map((transaction) => {
        if (transaction.deposit) {
          return depositNFTPools.push(transaction.deposit)
        }
        if (transaction.withdraw) {
          return withdrawNFTPools.push(transaction.withdraw)
        }
        return true
      })

    return { depositPools, withdrawPools, mintFeePools, depositNFTPools, withdrawNFTPools }
  } catch (e) {
    console.log(e)
  }

  return {}
}

export function useGlobalTransactionsTradegen() {
  const [state, { updateTransactionsTradegen }] = useGlobalDataContext()
  const transactionsTradegen = state?.transactionsTradegen
  useEffect(() => {
    async function fetchData() {
      if (!transactionsTradegen) {
        const txns = await getGlobalTransactionsTradegen()
        console.log(txns)
        updateTransactionsTradegen(txns)
      }
    }
    fetchData()
  }, [updateTransactionsTradegen, transactionsTradegen])
  return transactionsTradegen
}

/**
 * Get the top pool and NFT pool positions based on USD size
 * @TODO Not a perfect lookup needs improvement
 */
export function useTopPositions() {
  const [state, { updateTopPositions }] = useGlobalDataContext()
  const topPositions = state?.topPositions

  const allPools = useAllPoolData()
  const allNFTPools = useAllNFTPoolData()

  useEffect(() => {
    async function fetchData() {
      // get top 100 pools by total value locked
      const topPools = Object.keys(allPools)
        ?.sort((a, b) => parseFloat((allPools[a].totalValueLockedUSD > allPools[b].totalValueLockedUSD ? -1 : 1).toString()))
        ?.slice(0, 99)
        .map((pool) => pool)

      // get top 100 NFT pools by total value locked
      const topNFTPools = Object.keys(allNFTPools)
        ?.sort((a, b) => parseFloat((allNFTPools[a].totalValueLockedUSD > allNFTPools[b].totalValueLockedUSD ? -1 : 1).toString()))
        ?.slice(0, 99)
        .map((NFTPool) => NFTPool)

      const topPoolPositionLists = await Promise.all(
        topPools.map(async (pool) => {
          // for each one, fetch top pool positions
          try {
            const { data: results } = await tradegenClient.query({
              query: TOP_POSITIONS_PER_POOL,
              variables: {
                poolAddress: pool.toString(),
              },
              fetchPolicy: 'cache-first',
            })
            if (results) {
              return results.poolPositions
            }
          } catch (e) { }
        })
      )

      const topNFTPoolPositionLists = await Promise.all(
        topNFTPools.map(async (NFTPool) => {
          // for each one, fetch top NFT pool positions
          try {
            const { data: results } = await tradegenClient.query({
              query: TOP_POSITIONS_PER_NFT_POOL,
              variables: {
                NFTPoolAddress: NFTPool.toString(),
              },
              fetchPolicy: 'cache-first',
            })
            if (results) {
              return results.nftpoolPositions
            }
          } catch (e) { }
        })
      )

      // get the top positions from the results formatted
      const topPositions = []
      topPoolPositionLists
        .filter((i) => !!i) // check for ones not fetched correctly
        .map((list) => {
          return list.map((entry) => {
            const poolData = allPools[entry.pool.id]
            return topPositions.push({
              user: entry.user,
              type: "Pool",
              name: entry.pool.name,
              address: entry.pool.id,
              usd:
                parseFloat((BigInt(entry.pool.tokenPrice) * BigInt(entry.tokenBalance) / BigInt("10000000000000000000000000000000000")).toString()) / 100
            })
          })
        })

      topNFTPoolPositionLists
        .filter((i) => !!i) // check for ones not fetched correctly
        .map((list) => {
          return list.map((entry) => {
            return topPositions.push({
              user: entry.user,
              type: "NFT pool",
              name: entry.NFTPool.name,
              address: entry.NFTPool.id,
              usd:
                parseFloat((BigInt(entry.NFTPool.tokenPrice) / BigInt("10000000000000000")).toString()) * parseFloat(entry.tokenBalance.toString()) / 100
            })
          })
        })

      const sorted = topPositions.sort((a, b) => (a.usd > b.usd ? -1 : 1))
      const shorter = sorted.splice(0, 100)
      updateTopPositions(shorter)
    }

    if (!topPositions && allPools && Object.keys(allPools).length > 0) {
      fetchData()
    }
  })

  return topPositions
}

export function useAllPoolsInTradegen() {
  const [state] = useGlobalDataContext()
  const allPools = state?.allPools

  return allPools || []
}

export function useAllNFTPoolsInTradegen() {
  const [state] = useGlobalDataContext()
  const allNFTPools = state?.allNFTPools

  return allNFTPools || []
}

/**
 * Loop through every pool on Tradegen, used for search
 */
async function getAllPoolsOnTradegen() {
  try {
    let allFound = false
    let skipCount = 0
    let pools = []
    while (!allFound) {
      const result = await tradegenClient.query({
        query: ALL_POOLS,
        variables: {
          skip: skipCount,
        },
        fetchPolicy: 'cache-first',
      })
      pools = pools.concat(result?.data?.pools)
      if (result?.data?.pools?.length < TOKENS_TO_FETCH || pools.length > TOKENS_TO_FETCH) {
        allFound = true
      }
      skipCount = skipCount += TOKENS_TO_FETCH
    }
    return pools
  } catch (e) {
    console.log(e)
  }
}

/**
 * Loop through every NFT pool on Tradegen, used for search
 */
async function getAllNFTPoolsOnTradegen() {
  try {
    let allFound = false
    let skipCount = 0
    let NFTPools = []
    while (!allFound) {
      const result = await tradegenClient.query({
        query: ALL_NFT_POOLS,
        variables: {
          skip: skipCount,
        },
        fetchPolicy: 'cache-first',
      })
      NFTPools = NFTPools.concat(result?.data?.nftpools)
      if (result?.data?.nftpools?.length < TOKENS_TO_FETCH || NFTPools.length > TOKENS_TO_FETCH) {
        allFound = true
      }
      skipCount = skipCount += TOKENS_TO_FETCH
    }
    return NFTPools
  } catch (e) {
    console.log(e)
  }
}