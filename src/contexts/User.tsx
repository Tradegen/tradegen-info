import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react'

import { client, tradegenClient } from '../apollo/client'
import {
  LiquidityPositionsQuery,
  LiquidityPositionsQueryVariables,
  UserHistoryQuery,
  UserHistoryQueryVariables,
  UserTransactionsQuery,
  UserTransactionsTradegenQuery,
  InvestmentPositionsQuery,
  InvestmentPositionsQueryVariables,
  ManagedInvestmentsQuery,
  ManagedInvestmentsQueryVariables
} from '../apollo/generated/types'
import { PAIR_DAY_DATA_BULK, USER_HISTORY, USER_POSITIONS, USER_TRANSACTIONS_TRADEGEN, USER_POSITIONS_TRADEGEN, MANAGED_INVESTMENTS } from '../apollo/queries'
import { timeframeOptions } from '../constants'
import { getHistoricalPairReturns, getLPReturnsOnPair } from '../utils/returns'
import { useStartTimestamp, useTimeframe } from './Application'
import { useCeloPrice } from './GlobalData'
import { usePairData } from './PairData'

dayjs.extend(utc)

const UPDATE_TRANSACTIONS = 'UPDATE_TRANSACTIONS'
const UPDATE_POSITIONS = 'UPDATE_POSITIONS '
const UPDATE_MINING_POSITIONS = 'UPDATE_MINING_POSITIONS'
const UPDATE_USER_POSITION_HISTORY = 'UPDATE_USER_POSITION_HISTORY'
const UPDATE_USER_PAIR_RETURNS = 'UPDATE_USER_PAIR_RETURNS'
const UPDATE_MANAGED_INVESTMENTS = 'UPDATE_MANAGED_INVESTMENTS'

const TRANSACTIONS_KEY = 'TRANSACTIONS_KEY'
const POSITIONS_KEY = 'POSITIONS_KEY'
const MINING_POSITIONS_KEY = 'MINING_POSITIONS_KEY'
const USER_SNAPSHOTS = 'USER_SNAPSHOTS'
const USER_PAIR_RETURNS_KEY = 'USER_PAIR_RETURNS_KEY'
const MANAGED_INVESTMENTS_KEY = 'MANAGED_INVESTMENTS_KEY'

type IUserContext = [
  any,
  { updateTransactions; updatePositions; updateMiningPositions; updateUserSnapshots; updateUserPairReturns, updateManagedInvestments }
]

const UserContext = createContext<IUserContext | undefined>(undefined)

function useUserContext() {
  return useContext(UserContext)
}

function reducer(state, { type, payload }) {
  switch (type) {
    case UPDATE_TRANSACTIONS: {
      const { account, transactions } = payload
      return {
        ...state,
        [account]: {
          ...state?.[account],
          [TRANSACTIONS_KEY]: transactions,
        },
      }
    }
    case UPDATE_POSITIONS: {
      const { account, positions } = payload
      return {
        ...state,
        [account]: { ...state?.[account], [POSITIONS_KEY]: positions },
      }
    }
    case UPDATE_MINING_POSITIONS: {
      const { account, miningPositions } = payload
      return {
        ...state,
        [account]: { ...state?.[account], [MINING_POSITIONS_KEY]: miningPositions },
      }
    }
    case UPDATE_MANAGED_INVESTMENTS: {
      const { account, managedInvestments } = payload
      return {
        ...state,
        [account]: { ...state?.[account], [MANAGED_INVESTMENTS_KEY]: managedInvestments },
      }
    }
    case UPDATE_USER_POSITION_HISTORY: {
      const { account, historyData } = payload
      return {
        ...state,
        [account]: { ...state?.[account], [USER_SNAPSHOTS]: historyData },
      }
    }

    case UPDATE_USER_PAIR_RETURNS: {
      const { account, pairAddress, data } = payload
      return {
        ...state,
        [account]: {
          ...state?.[account],
          [USER_PAIR_RETURNS_KEY]: {
            ...state?.[account]?.[USER_PAIR_RETURNS_KEY],
            [pairAddress]: data,
          },
        },
      }
    }

    default: {
      throw Error(`Unexpected action type in DataContext reducer: '${type}'.`)
    }
  }
}

const INITIAL_STATE = {}

export default function Provider({ children }: { children?: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  const updateTransactions = useCallback((account, transactions) => {
    dispatch({
      type: UPDATE_TRANSACTIONS,
      payload: {
        account,
        transactions,
      },
    })
  }, [])

  const updatePositions = useCallback((account, positions) => {
    dispatch({
      type: UPDATE_POSITIONS,
      payload: {
        account,
        positions,
      },
    })
  }, [])

  const updateMiningPositions = useCallback((account, miningPositions) => {
    dispatch({
      type: UPDATE_MINING_POSITIONS,
      payload: {
        account,
        miningPositions,
      },
    })
  }, [])

  const updateManagedInvestments = useCallback((account, managedInvestments) => {
    dispatch({
      type: UPDATE_MANAGED_INVESTMENTS,
      payload: {
        account,
        managedInvestments,
      },
    })
  }, [])

  const updateUserSnapshots = useCallback((account, historyData) => {
    dispatch({
      type: UPDATE_USER_POSITION_HISTORY,
      payload: {
        account,
        historyData,
      },
    })
  }, [])

  const updateUserPairReturns = useCallback((account, pairAddress, data) => {
    dispatch({
      type: UPDATE_USER_PAIR_RETURNS,
      payload: {
        account,
        pairAddress,
        data,
      },
    })
  }, [])

  return (
    <UserContext.Provider
      value={useMemo(
        () => [
          state,
          { updateTransactions, updatePositions, updateMiningPositions, updateUserSnapshots, updateUserPairReturns, updateManagedInvestments },
        ],
        [state, updateTransactions, updatePositions, updateMiningPositions, updateUserSnapshots, updateUserPairReturns, updateManagedInvestments]
      )}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUserTransactions(account) {
  const [state, { updateTransactions }] = useUserContext()
  const transactions = state?.[account]?.[TRANSACTIONS_KEY]
  useEffect(() => {
    async function fetchData(account) {
      try {
        const result = await tradegenClient.query<UserTransactionsTradegenQuery>({
          query: USER_TRANSACTIONS_TRADEGEN,
          variables: {
            user: account,
          },
          fetchPolicy: 'no-cache',
        })
        if (result?.data) {
          updateTransactions(account, result?.data)
        }
      } catch (e) {
        console.log(e)
      }
    }
    if (!transactions && account) {
      fetchData(account)
    }
  }, [account, transactions, updateTransactions])

  return transactions || {}
}

/**
 * Store all the snapshots of liquidity activity for this account.
 * Each snapshot is a moment when an LP position was created or updated.
 * @param {*} account
 */
export function useUserSnapshots(account): UserHistoryQuery['liquidityPositionSnapshots'] {
  const [state, { updateUserSnapshots }] = useUserContext()
  const snapshots = state?.[account]?.[USER_SNAPSHOTS]

  useEffect(() => {
    async function fetchData() {
      try {
        let skip = 0
        let allResults: UserHistoryQuery['liquidityPositionSnapshots'] = []
        let found = false
        while (!found) {
          const result = await client.query<UserHistoryQuery, UserHistoryQueryVariables>({
            query: USER_HISTORY,
            variables: {
              skip: skip,
              user: account,
            },
            fetchPolicy: 'cache-first',
          })
          allResults = allResults.concat(result.data.liquidityPositionSnapshots)
          if (result.data.liquidityPositionSnapshots.length < 1000) {
            found = true
          } else {
            skip += 1000
          }
        }
        if (allResults) {
          updateUserSnapshots(account, allResults)
        }
      } catch (e) {
        console.log(e)
      }
    }
    if (!snapshots && account) {
      fetchData()
    }
  }, [account, snapshots, updateUserSnapshots])

  return snapshots
}

/**
 * For a given position (data about holding) and user, get the chart
 * data for the fees and liquidity over time
 * @param {*} position
 * @param {*} account
 */
export function useUserPositionChart(position, account) {
  const pairAddress = position?.pair?.id
  const [state, { updateUserPairReturns }] = useUserContext()

  // get oldest date of data to fetch
  const startDateTimestamp = useStartTimestamp()

  // get users adds and removes on this pair
  const snapshots = useUserSnapshots(account)
  const pairSnapshots =
    snapshots &&
    position &&
    snapshots.filter((currentSnapshot) => {
      return currentSnapshot.pair.id === position.pair.id
    })

  // get data needed for calculations
  const currentPairData = usePairData(pairAddress)
  const [currentETHPrice] = useCeloPrice()

  // formatetd array to return for chart data
  const formattedHistory = state?.[account]?.[USER_PAIR_RETURNS_KEY]?.[pairAddress]

  useEffect(() => {
    async function fetchData() {
      const fetchedData = await getHistoricalPairReturns(
        startDateTimestamp,
        currentPairData,
        pairSnapshots,
        currentETHPrice
      )
      updateUserPairReturns(account, pairAddress, fetchedData)
    }
    if (
      account &&
      startDateTimestamp &&
      pairSnapshots &&
      !formattedHistory &&
      currentPairData &&
      Object.keys(currentPairData).length > 0 &&
      pairAddress &&
      currentETHPrice
    ) {
      fetchData()
    }
  }, [
    account,
    startDateTimestamp,
    pairSnapshots,
    formattedHistory,
    pairAddress,
    currentPairData,
    currentETHPrice,
    updateUserPairReturns,
    position.pair.id,
  ])

  return formattedHistory
}

/**
 * For each day starting with min(first position timestamp, beginning of time window),
 * get total liquidity supplied by user in USD. Format in array with date timestamps
 * and usd liquidity value.
 */
export function useUserLiquidityChart(account) {
  const history = useUserSnapshots(account)
  // formatetd array to return for chart data
  const [formattedHistory, setFormattedHistory] = useState<any[] | undefined>()

  const [startDateTimestamp, setStartDateTimestamp] = useState<number | undefined>()
  const [activeWindow] = useTimeframe()

  // monitor the old date fetched
  useEffect(() => {
    const utcEndTime = dayjs.utc()
    // based on window, get starttime
    let utcStartTime
    switch (activeWindow) {
      case timeframeOptions.WEEK:
        utcStartTime = utcEndTime.subtract(1, 'week').startOf('day')
        break
      case timeframeOptions.ALL_TIME:
        utcStartTime = utcEndTime.subtract(1, 'year')
        break
      default:
        utcStartTime = utcEndTime.subtract(1, 'year').startOf('year')
        break
    }
    const startTime = utcStartTime.unix() - 1
    if (!startDateTimestamp || (activeWindow && startTime < startDateTimestamp)) {
      setStartDateTimestamp(startTime)
    }
  }, [activeWindow, startDateTimestamp])

  useEffect(() => {
    async function fetchData() {
      let dayIndex = startDateTimestamp ? Math.floor(startDateTimestamp / 86400) : 0 // get unique day bucket unix
      const currentDayIndex = parseInt((dayjs.utc().unix() / 86400).toString())

      // sort snapshots in order
      const sortedPositions = history.slice().sort((a, b) => {
        return a.timestamp > b.timestamp ? 1 : -1
      })
      // if UI start time is > first position time - bump start index to this time
      if ((sortedPositions[0].timestamp ?? 0) > dayIndex) {
        dayIndex = parseInt((parseInt(sortedPositions[0].timestamp.toString()) / 86400).toString())
      }

      const dayTimestamps: number[] = []
      // get date timestamps for all days in view
      while (dayIndex < currentDayIndex) {
        dayTimestamps.push(dayIndex * 86400)
        dayIndex = dayIndex + 1
      }

      const pairs = history.reduce((pairList, position) => {
        return [...pairList, position.pair.id]
      }, [])

      // get all day datas where date is in this list, and pair is in pair list
      const {
        data: { pairDayDatas },
      } = await client.query({
        query: PAIR_DAY_DATA_BULK(pairs, startDateTimestamp),
      })

      const formattedHistory = []

      // map of current pair => ownership %
      const ownershipPerPair = {}
      for (const index in dayTimestamps) {
        const dayTimestamp = dayTimestamps[index]
        const timestampCeiling = dayTimestamp + 86400

        // cycle through relevant positions and update ownership for any that we need to
        const relevantPositions = history.filter((snapshot) => {
          return snapshot.timestamp < timestampCeiling && snapshot.timestamp > dayTimestamp
        })
        for (const index in relevantPositions) {
          const position = relevantPositions[index]
          // case where pair not added yet
          if (!ownershipPerPair[position.pair.id]) {
            ownershipPerPair[position.pair.id] = {
              lpTokenBalance: position.liquidityTokenBalance,
              timestamp: position.timestamp,
            }
          }
          // case where more recent timestamp is found for pair
          if (ownershipPerPair[position.pair.id] && ownershipPerPair[position.pair.id].timestamp < position.timestamp) {
            ownershipPerPair[position.pair.id] = {
              lpTokenBalance: position.liquidityTokenBalance,
              timestamp: position.timestamp,
            }
          }
        }

        const relavantDayDatas = Object.keys(ownershipPerPair).map((pairAddress) => {
          // find last day data after timestamp update
          const dayDatasForThisPair = pairDayDatas.filter((dayData) => {
            return dayData.pairAddress === pairAddress
          })
          // find the most recent reference to pair liquidity data
          let mostRecent = dayDatasForThisPair[0]
          for (const index in dayDatasForThisPair) {
            const dayData = dayDatasForThisPair[index]
            if (dayData.date < dayTimestamp && dayData.date > mostRecent.date) {
              mostRecent = dayData
            }
          }
          return mostRecent
        })

        // now cycle through pair day datas, for each one find usd value = ownership[address] * reserveUSD
        const dailyUSD = relavantDayDatas.reduce((totalUSD, dayData) => {
          if (dayData) {
            return (totalUSD =
              totalUSD +
              (ownershipPerPair[dayData.pairAddress]
                ? (parseFloat(ownershipPerPair[dayData.pairAddress].lpTokenBalance) / parseFloat(dayData.totalSupply)) *
                parseFloat(dayData.reserveUSD)
                : 0))
          } else {
            return totalUSD
          }
        }, 0)

        formattedHistory.push({
          date: dayTimestamp,
          valueUSD: dailyUSD,
        })
      }

      setFormattedHistory(formattedHistory)
    }
    if (history && startDateTimestamp && history.length > 0) {
      fetchData()
    }
  }, [history, startDateTimestamp])

  return formattedHistory
}

export function useUserPositions(account) {
  const [state, { updatePositions }] = useUserContext()
  const positions = state?.[account]?.[POSITIONS_KEY]

  useEffect(() => {
    async function fetchData(account) {
      try {
        const result = await tradegenClient.query<InvestmentPositionsQuery, InvestmentPositionsQueryVariables>({
          query: USER_POSITIONS_TRADEGEN,
          variables: {
            user: account,
          },
          fetchPolicy: 'no-cache',
        })
        let formattedPositions = [];
        if (result?.data?.poolPositions) {
          result?.data?.poolPositions.map(async (positionData) => {
            return formattedPositions.push({
              address: positionData.pool.id,
              type: "Pool",
              name: positionData.pool.name,
              USDValue: positionData.USDValue
            })
          })
        }
        if (result?.data?.nftpoolPositions) {
          result?.data?.nftpoolPositions.map(async (positionData) => {
            return formattedPositions.push({
              address: positionData.NFTPool.id,
              type: "NFT Pool",
              name: positionData.NFTPool.name,
              USDValue: positionData.USDValue
            })
          })
        }
        console.log(formattedPositions)
        updatePositions(account, formattedPositions)
      } catch (e) {
        console.log(e)
      }
    }
    if (!positions && account) {
      fetchData(account)
    }
  }, [account, positions, updatePositions])

  return positions
}

export function useManagedInvestments(account) {
  const [state, { updateManagedInvestments }] = useUserContext()
  const managedInvestments = state?.[account]?.[MANAGED_INVESTMENTS_KEY]

  useEffect(() => {
    async function fetchData(account) {
      try {
        const result = await tradegenClient.query<ManagedInvestmentsQuery, ManagedInvestmentsQueryVariables>({
          query: MANAGED_INVESTMENTS,
          variables: {
            manager: account,
          },
          fetchPolicy: 'no-cache',
        })
        let formattedManagedInvestments = [];
        if (result?.data?.managedInvestments) {
          result?.data?.managedInvestments.map(async (investmentData) => {
            if (investmentData.pool) {
              return formattedManagedInvestments.push({
                address: investmentData.pool.id,
                type: "Pool",
                name: investmentData.pool.name,
                USDValue: investmentData.pool.totalValueLockedUSD
              })
            }
            if (investmentData.NFTPool) {
              return formattedManagedInvestments.push({
                address: investmentData.NFTPool.id,
                type: "NFT Pool",
                name: investmentData.NFTPool.name,
                USDValue: investmentData.NFTPool.totalValueLockedUSD
              })
            }
          })
        }
        console.log(formattedManagedInvestments)
        updateManagedInvestments(account, formattedManagedInvestments)
      } catch (e) {
        console.log(e)
      }
    }
    if (!managedInvestments && account) {
      fetchData(account)
    }
  }, [account, managedInvestments, updateManagedInvestments])

  return managedInvestments
}
