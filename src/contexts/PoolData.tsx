import { ApolloQueryResult } from 'apollo-client'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'

import { tradegenClient } from '../apollo/client'
import {
    PoolDataLatestQuery,
    PoolDataLatestQueryVariables,
    PoolDataQuery,
    PoolDataQueryVariables,
    PoolDayDatasQuery,
    PoolDayDatasQueryVariables,
    PoolsCurrentQuery,
    PoolsDynamicQuery,
    PoolsDynamicQueryVariables,
    FilteredTransactionsTradegenQuery,
    FilteredTransactionsTradegenQueryVariables,
} from '../apollo/generated/types'
import {
    DATA_BY_BLOCK_POOL,
    POOL_DATA,
    POOL_DATA_LATEST,
    POOLS_CURRENT,
    POOLS_DYNAMIC,
    FILTERED_TRANSACTIONS_TRADEGEN,
    POOL_CHART
} from '../apollo/queries'
import { timeframeOptions } from '../constants'
import {
    get2DayPercentChange,
    getBlockFromTimestamp,
    getBlocksFromTimestamps,
    getPercentChange,
    isAddress,
    splitQuery,
} from '../utils'
import { useLatestBlocks } from './Application'

const UPDATE = 'UPDATE'
const UPDATE_TOKEN_TXNS = 'UPDATE_TOKEN_TXNS'
const UPDATE_CHART_DATA = 'UPDATE_CHART_DATA'
const UPDATE_PRICE_DATA = 'UPDATE_PRICE_DATA'
const UPDATE_TOP_POOLS = ' UPDATE_TOP_POOLS'
const UPDATE_ALL_PAIRS = 'UPDATE_ALL_PAIRS'
const UPDATE_COMBINED = 'UPDATE_COMBINED'

const TOKEN_PAIRS_KEY = 'TOKEN_PAIRS_KEY'

dayjs.extend(utc)

const TokenDataContext = createContext(undefined)

function useTokenDataContext() {
    return useContext(TokenDataContext) ?? []
}

function reducer(state, { type, payload }) {
    switch (type) {
        case UPDATE: {
            const { poolAddress, data } = payload
            return {
                ...state,
                [poolAddress]: {
                    ...state?.[poolAddress],
                    ...data,
                },
            }
        }

        case UPDATE_TOP_POOLS: {
            const { topPools } = payload
            const added = {}
            topPools &&
                topPools.map((pool) => {
                    return (added[pool.id] = pool)
                })
            return {
                ...state,
                ...added,
            }
        }

        case UPDATE_COMBINED: {
            const { combinedVol } = payload
            return {
                ...state,
                combinedVol,
            }
        }

        case UPDATE_TOKEN_TXNS: {
            const { address, transactions } = payload
            return {
                ...state,
                [address]: {
                    ...state?.[address],
                    txns: transactions,
                },
            }
        }
        case UPDATE_CHART_DATA: {
            const { address, chartData } = payload
            return {
                ...state,
                [address]: {
                    ...state?.[address],
                    chartData,
                },
            }
        }

        case UPDATE_PRICE_DATA: {
            const { address, data, timeWindow, interval } = payload
            return {
                ...state,
                [address]: {
                    ...state?.[address],
                    [timeWindow]: {
                        ...state?.[address]?.[timeWindow],
                        [interval]: data,
                    },
                },
            }
        }

        case UPDATE_ALL_PAIRS: {
            const { address, allPairs } = payload
            return {
                ...state,
                [address]: {
                    ...state?.[address],
                    [TOKEN_PAIRS_KEY]: allPairs,
                },
            }
        }
        default: {
            throw Error(`Unexpected action type in DataContext reducer: '${type}'.`)
        }
    }
}

export default function Provider({ children }: { children: React.ReactNode }): JSX.Element {
    const [state, dispatch] = useReducer(reducer, {})
    const update = useCallback((tokenAddress, data) => {
        dispatch({
            type: UPDATE,
            payload: {
                tokenAddress,
                data,
            },
        })
    }, [])

    const updateTopPools = useCallback((topPools) => {
        dispatch({
            type: UPDATE_TOP_POOLS,
            payload: {
                topPools,
            },
        })
    }, [])

    const updateCombinedVolume = useCallback((combinedVol) => {
        dispatch({
            type: UPDATE_COMBINED,
            payload: {
                combinedVol,
            },
        })
    }, [])

    const updateTokenTxns = useCallback((address, transactions) => {
        dispatch({
            type: UPDATE_TOKEN_TXNS,
            payload: { address, transactions },
        })
    }, [])

    const updateChartData = useCallback((address, chartData) => {
        dispatch({
            type: UPDATE_CHART_DATA,
            payload: { address, chartData },
        })
    }, [])

    const updateAllPairs = useCallback((address, allPairs) => {
        dispatch({
            type: UPDATE_ALL_PAIRS,
            payload: { address, allPairs },
        })
    }, [])

    const updatePriceData = useCallback((address, data, timeWindow, interval) => {
        dispatch({
            type: UPDATE_PRICE_DATA,
            payload: { address, data, timeWindow, interval },
        })
    }, [])

    return (
        <TokenDataContext.Provider
            value={useMemo(
                () => [
                    state,
                    {
                        update,
                        updateTokenTxns,
                        updateChartData,
                        updateTopPools,
                        updateAllPairs,
                        updatePriceData,
                        updateCombinedVolume,
                    },
                ],
                [
                    state,
                    update,
                    updateTokenTxns,
                    updateCombinedVolume,
                    updateChartData,
                    updateTopPools,
                    updateAllPairs,
                    updatePriceData,
                ]
            )}
        >
            {children}
        </TokenDataContext.Provider>
    )
}

const getTopPools = async () => {
    const utcCurrentTime = dayjs()
    const utcOneDayBack = utcCurrentTime.subtract(1, 'day').unix()
    const utcTwoDaysBack = utcCurrentTime.subtract(2, 'day').unix()
    const oneDayBlock = await getBlockFromTimestamp(utcOneDayBack)
    const twoDayBlock = await getBlockFromTimestamp(utcTwoDaysBack)

    console.log('top pools')

    try {
        const current = await tradegenClient.query<PoolsCurrentQuery>({
            query: POOLS_CURRENT,
            fetchPolicy: 'cache-first',
        })

        const oneDayResult: ApolloQueryResult<PoolsDynamicQuery> | null = await tradegenClient
            .query<PoolsDynamicQuery, PoolsDynamicQueryVariables>({
                query: POOLS_DYNAMIC,
                fetchPolicy: 'cache-first',
                variables: {
                    block: oneDayBlock,
                },
            })
            .catch((e) => {
                console.error(e)
                return null
            })

        const twoDayResult: ApolloQueryResult<PoolsDynamicQuery> | null = await tradegenClient
            .query<PoolsDynamicQuery, PoolsDynamicQueryVariables>({
                query: POOLS_DYNAMIC,
                fetchPolicy: 'cache-first',
                variables: {
                    block: twoDayBlock,
                },
            })
            .catch((e) => {
                console.error(e)
                return null
            })

        const oneDayData = oneDayResult?.data?.pools.reduce((obj, cur) => {
            return { ...obj, [cur.id]: cur }
        }, {})

        const twoDayData = twoDayResult?.data?.pools.reduce((obj, cur) => {
            return { ...obj, [cur.id]: cur }
        }, {})

        const bulkResults = await Promise.all(
            (current &&
                current?.data?.pools?.map(async (pool) => {
                    const data = pool

                    // let liquidityDataThisToken = liquidityData?.[token.id]
                    let oneDayHistory: PoolDataQuery['pools'][number] | null = oneDayData?.[pool.id]
                    let twoDayHistory: PoolDataQuery['pools'][number] | null = twoDayData?.[pool.id]

                    // catch the case where token wasnt in top list in previous days
                    if (!oneDayHistory) {
                        try {
                            const oneDayResult = await tradegenClient.query<PoolDataQuery, PoolDataQueryVariables>({
                                query: POOL_DATA,
                                fetchPolicy: 'cache-first',
                                variables: {
                                    poolAddressID: pool.id,
                                    block: oneDayBlock,
                                },
                            })
                            oneDayHistory = oneDayResult.data.pools[0]
                        } catch (e) {
                            console.error(e)
                        }
                    }
                    if (!twoDayHistory) {
                        try {
                            const twoDayResult = await tradegenClient.query<PoolDataQuery, PoolDataQueryVariables>({
                                query: POOL_DATA,
                                fetchPolicy: 'cache-first',
                                variables: {
                                    poolAddressID: pool.id,
                                    block: twoDayBlock,
                                },
                            })
                            twoDayHistory = twoDayResult.data.pools[0]
                        } catch (e) {
                            console.error(e)
                        }
                    }

                    // calculate percentage changes and daily changes
                    const [oneDayVolumeUSD, volumeChangeUSD] = get2DayPercentChange(
                        data.tradeVolumeUSD,
                        oneDayHistory?.tradeVolumeUSD ?? '0',
                        twoDayHistory?.tradeVolumeUSD ?? '0'
                    )

                    const currentTotalValueLockedUSD = parseFloat(data?.totalValueLockedUSD)
                    const oldTotalValueLockedUSD = parseFloat(oneDayHistory?.totalValueLockedUSD)

                    // percent changes
                    const priceChangeUSD = getPercentChange(data?.tokenPrice, oneDayHistory?.tokenPrice)

                    // set data
                    const additionalData = {
                        oneDayVolumeUSD: parseFloat(oneDayVolumeUSD.toString()),
                        volumeChangeUSD: volumeChangeUSD,
                        priceChangeUSD: priceChangeUSD,
                        totalValueLockedChangeUSD: getPercentChange(currentTotalValueLockedUSD ?? 0, oldTotalValueLockedUSD ?? 0)
                    }

                    // new tokens
                    if (!oneDayHistory && data) {
                        additionalData.oneDayVolumeUSD = parseFloat(data.tradeVolumeUSD)
                    }

                    return {
                        ...data,
                        ...additionalData,

                        // used for custom adjustments
                        oneDayData: oneDayHistory,
                        twoDayData: twoDayHistory,
                    }
                })) ??
            []
        )

        return bulkResults

        // calculate percentage changes and daily changes
    } catch (e) {
        console.log(e)
    }
}

type PoolData = PoolDataLatestQuery['pools'][number] &
    Partial<{
        oneDayVolumeUSD: number
        volumeChangeUSD: number
        priceChangeUSD: number
        totalValueLockedChangeUSD: number
        oneDayData: number
        twoDayData: number
    }>

const getPoolData = async (address: string): Promise<PoolData | null> => {
    const utcCurrentTime = dayjs()
    const utcOneDayBack = utcCurrentTime.subtract(1, 'day').startOf('minute').unix()
    const utcTwoDaysBack = utcCurrentTime.subtract(2, 'day').startOf('minute').unix()
    const oneDayBlock = await getBlockFromTimestamp(utcOneDayBack)
    const twoDayBlock = await getBlockFromTimestamp(utcTwoDaysBack)

    // initialize data arrays
    let data: PoolDataLatestQuery['pools'][number] | null = null
    let oneDayData: PoolDataLatestQuery['pools'][number] | null = null
    let twoDayData: PoolDataLatestQuery['pools'][number] | null = null

    try {
        // fetch all current and historical data
        const result = await tradegenClient.query<PoolDataLatestQuery, PoolDataLatestQueryVariables>({
            query: POOL_DATA_LATEST,
            fetchPolicy: 'cache-first',
            variables: { poolAddressID: address },
        })
        data = result?.data?.pools?.[0]

        // get results from 24 hours in past
        const oneDayResult = await tradegenClient.query<PoolDataQuery, PoolDataQueryVariables>({
            query: POOL_DATA,
            fetchPolicy: 'cache-first',
            variables: { block: oneDayBlock, poolAddressID: address },
        })
        oneDayData = oneDayResult.data.pools[0]

        // get results from 48 hours in past
        const twoDayResult = await tradegenClient.query<PoolDataQuery, PoolDataQueryVariables>({
            query: POOL_DATA,
            fetchPolicy: 'cache-first',
            variables: { block: twoDayBlock, poolAddressID: address },
        })
        twoDayData = twoDayResult.data.pools[0]

        // catch the case where token wasnt in top list in previous days
        if (!oneDayData) {
            const oneDayResult = await tradegenClient.query<PoolDataQuery, PoolDataQueryVariables>({
                query: POOL_DATA,
                fetchPolicy: 'cache-first',
                variables: { block: oneDayBlock, poolAddressID: address },
            })
            oneDayData = oneDayResult.data.pools[0]
        }
        if (!twoDayData) {
            const twoDayResult = await tradegenClient.query<PoolDataQuery, PoolDataQueryVariables>({
                query: POOL_DATA,
                fetchPolicy: 'cache-first',
                variables: { block: twoDayBlock, poolAddressID: address },
            })
            twoDayData = twoDayResult.data.pools[0]
        }

        // calculate percentage changes and daily changes
        const [oneDayVolumeUSD, volumeChangeUSD] = get2DayPercentChange(
            data.tradeVolumeUSD,
            oneDayData?.tradeVolumeUSD,
            twoDayData?.tradeVolumeUSD
        )

        const priceChangeUSD = getPercentChange(data?.tokenPrice, oneDayData?.tokenPrice ?? 0)

        const currentTotalValueLockedUSD = parseFloat(data?.totalValueLockedUSD)
        const oldTotalValueLockedUSD = parseFloat(oneDayData?.totalValueLockedUSD)
        const totalValueLockedChangeUSD = getPercentChange(currentTotalValueLockedUSD ?? 0, oldTotalValueLockedUSD ?? 0)

        // set data
        const additionalData = {
            oneDayVolumeUSD: oneDayVolumeUSD,
            volumeChangeUSD: volumeChangeUSD,
            priceChangeUSD: priceChangeUSD,
            totalValueLockedChangeUSD: totalValueLockedChangeUSD,

            // used for custom adjustments
            oneDayData: oneDayData?.[address],
            twoDayData: twoDayData?.[address],
        }
        // new tokens
        if (!oneDayData && data) {
            additionalData.oneDayVolumeUSD = parseFloat(data.tradeVolumeUSD)
        }
    } catch (e) {
        console.log(e)
    }
    return data
}

type Transactions = Pick<FilteredTransactionsTradegenQuery, 'depositPools' | 'withdrawPools' | 'mintFeePools' | 'depositNFTPools' | 'withdrawNFTPools'>

const getPoolTransactions = async (allPoolsFormatted: string[]): Promise<Partial<Transactions>> => {
    try {
        const result = await tradegenClient.query<FilteredTransactionsTradegenQuery, FilteredTransactionsTradegenQueryVariables>({
            query: FILTERED_TRANSACTIONS_TRADEGEN,
            variables: {
                allPools: allPoolsFormatted,
                allNFTPools: []
            },
            fetchPolicy: 'cache-first',
        })
        return {
            depositPools: result.data.depositPools,
            withdrawPools: result.data.withdrawPools,
            mintFeePools: result.data.mintFeePools,
            depositNFTPools: result.data.depositNFTPools,
            withdrawNFTPools: result.data.withdrawNFTPools
        }
    } catch (e) {
        console.log(e)
    }

    return {}
}

const getIntervalPoolData = async (poolAddress, startTime, interval = 3600, latestBlock, tokenData) => {
    const utcEndTime = dayjs.utc()
    let time = startTime

    if (!tokenData) {
        return undefined;
    }

    // create an array of hour start times until we reach current hour
    // buffer by half hour to catch case where graph isnt synced to latest block
    const timestamps = []
    while (time < utcEndTime.unix()) {
        timestamps.push(time)
        time += interval
    }

    // backout if invalid timestamp format
    if (timestamps.length === 0) {
        return []
    }

    // once you have all the timestamps, get the blocks for each timestamp in a bulk query
    let blocks
    try {
        blocks = await getBlocksFromTimestamps(timestamps, 100)

        // catch failing case
        if (!blocks || blocks.length === 0) {
            return []
        }

        if (latestBlock) {
            blocks = blocks.filter((b) => {
                return parseFloat(b.number) <= parseFloat(latestBlock)
            })
        }

        const result = await splitQuery(DATA_BY_BLOCK_POOL, tradegenClient, [poolAddress], blocks, 50)

        console.log(result)
        console.log(tokenData)

        // format token ETH price results
        const values = []
        let index = 0;
        for (const row in result) {
            const timestamp = row.split('t')[1]
            const positionAddresses = result[row]?.positionAddresses
            const positionBalances = result[row]?.positionBalances
            const totalSupply = result[row]?.totalSupply
            if (timestamp && positionAddresses && positionBalances && totalSupply) {
                let poolValue = 0;
                for (let i = 0; i < positionAddresses.length; i++) {
                    if (tokenData[positionAddresses[i]][index]) {
                        poolValue += (parseFloat(tokenData[positionAddresses[i]][index].close) * positionBalances[i]);
                    }
                }
                let tokenPrice = poolValue / totalSupply;
                values.push({
                    timestamp,
                    tokenPrice,
                })
            }
            index++;
        }

        console.log(values)

        const formattedHistory = []

        // for each hour, construct the open and close price
        for (let i = 0; i < values.length - 1; i++) {
            formattedHistory.push({
                timestamp: values[i].timestamp,
                open: parseFloat(values[i].tokenPrice),
                close: (parseFloat(values[i + 1].tokenPrice) > 0) ? parseFloat(values[i + 1].tokenPrice) : parseFloat(values[i].tokenPrice),
            })
        }

        console.log(formattedHistory)

        return formattedHistory
    } catch (e) {
        console.log(e)
        console.log('error fetching blocks')
        return []
    }
}

interface ChartDatum {
    date: number
    dayString: string
    dailyVolumeUSD: number
    priceUSD: string
    totalValueLockedUSD: string
}

const getPoolChartData = async (poolAddress: string, allTokens: object): Promise<readonly ChartDatum[]> => {
    let fetchedData: PoolDayDatasQuery['poolDayDatas'] = []
    let resultData: ChartDatum[] = []
    const utcEndTime = dayjs.utc()
    const utcStartTime = utcEndTime.subtract(1, 'year')
    const startTime = utcStartTime.startOf('minute').unix() - 1

    console.log(allTokens)

    try {
        let allFound = false
        let skip = 0
        while (!allFound) {
            const result = await tradegenClient.query<PoolDayDatasQuery, PoolDayDatasQueryVariables>({
                query: POOL_CHART,
                variables: {
                    poolAddress: poolAddress,
                    skip,
                },
                fetchPolicy: 'cache-first',
            })
            if (result.data.poolDayDatas.length < 1000) {
                allFound = true
            }
            skip += 1000
            fetchedData = fetchedData.concat(result.data.poolDayDatas)
        }

        const dayIndexSet = new Set()
        const dayIndexArray = fetchedData.slice()
        const oneDay = 24 * 60 * 60

        resultData = fetchedData.map((dayData) => {
            dayIndexSet.add((dayData.date / oneDay).toFixed(0))
            return { ...dayData, dayString: '', dailyVolumeUSD: parseFloat(dayData.dailyVolumeUSD) }
        })

        // fill in empty days
        let timestamp = resultData[0] && resultData[0].date ? resultData[0].date : startTime
        let latestTotalValueLockedUSD = resultData[0] && resultData[0].totalValueLockedUSD
        let latestPriceUSD = resultData[0] && resultData[0].priceUSD
        let index = 1
        while (timestamp < utcEndTime.startOf('minute').unix() - oneDay) {
            const nextDay = timestamp + oneDay
            const currentDayIndex = (nextDay / oneDay).toFixed(0)
            if (!dayIndexSet.has(currentDayIndex)) {
                resultData.push({
                    date: nextDay,
                    dayString: nextDay.toString(),
                    dailyVolumeUSD: 0,
                    priceUSD: latestPriceUSD,
                    totalValueLockedUSD: latestTotalValueLockedUSD,
                })
            } else {
                latestTotalValueLockedUSD = dayIndexArray[index].totalValueLockedUSD
                latestPriceUSD = dayIndexArray[index].priceUSD
                index = index + 1
            }
            timestamp = nextDay
        }
        resultData = resultData.sort((a, b) => (a.date > b.date ? 1 : -1))
    } catch (e) {
        console.log(e)
    }
    return resultData
}

export function Updater() {
    const [, { updateTopPools }] = useTokenDataContext()
    useEffect(() => {
        async function getData() {
            // get top pools for overview list
            const topPools = await getTopPools()
            if (topPools) {
                updateTopPools(topPools)
            }
        }
        getData()
    }, [updateTopPools])
    return null
}

export function usePoolData(poolAddress: string) {
    const [state, { update }] = useTokenDataContext()
    const poolData = state?.[poolAddress]

    useEffect(() => {
        if (!poolData && isAddress(poolAddress)) {
            getPoolData(poolAddress).then((data) => {
                update(poolAddress, data)
            })
        }
    }, [poolAddress, poolData, update])

    return poolData || {}
}

export function usePoolTransactions(poolAddress) {
    const [state, { updateTokenTxns }] = useTokenDataContext()
    const tokenTxns = state?.[poolAddress]?.txns

    useEffect(() => {
        async function checkForTxns() {
            if (!tokenTxns) {
                const transactions = await getPoolTransactions([poolAddress])
                console.log(transactions)
                updateTokenTxns(poolAddress, transactions)
            }
        }
        checkForTxns()
    }, [tokenTxns, poolAddress, updateTokenTxns])

    return tokenTxns || []
}

export function usePoolDataCombined(poolAddresses: readonly string[]) {
    const [state, { updateCombinedVolume }] = useTokenDataContext()

    const volume = state?.combinedVol

    useEffect(() => {
        async function fetchDatas() {
            Promise.all(
                poolAddresses.map(async (address) => {
                    return await getPoolData(address)
                })
            )
                .then((res) => {
                    if (res) {
                        const newVolume = res
                            ? res?.reduce(function (acc, entry) {
                                acc = acc + parseFloat(entry.oneDayVolumeUSD.toString())
                                return acc
                            }, 0)
                            : 0
                        updateCombinedVolume(newVolume)
                    }
                })
                .catch(() => {
                    console.log('error fetching combined data')
                })
        }
        if (!volume) {
            fetchDatas()
        }
    }, [poolAddresses, volume, updateCombinedVolume])

    return volume
}

export function usePoolChartDataCombined(poolAddresses, allTokens) {
    const [state, { updateChartData }] = useTokenDataContext()

    const datas = useMemo(() => {
        return (
            poolAddresses &&
            poolAddresses.reduce(function (acc, address) {
                acc[address] = state?.[address]?.chartData
                return acc
            }, {})
        )
    }, [state, poolAddresses])

    const isMissingData = useMemo(() => Object.values(datas).filter((val) => !val).length > 0, [datas])

    const formattedByDate = useMemo(() => {
        return (
            datas &&
            !isMissingData &&
            Object.keys(datas).map(function (address) {
                const dayDatas = datas[address]
                return dayDatas?.reduce(function (acc, dayData) {
                    acc[dayData.date] = dayData
                    return acc
                }, {})
            }, {})
        )
    }, [datas, isMissingData])

    useEffect(() => {
        async function fetchDatas() {
            Promise.all(
                poolAddresses.map(async (address) => {
                    return await getPoolChartData(address, allTokens)
                })
            )
                .then((res) => {
                    res &&
                        res.map((result, i) => {
                            const tokenAddress = poolAddresses[i]
                            updateChartData(tokenAddress, result)
                            return true
                        })
                })
                .catch(() => {
                    console.log('error fetching combined data')
                })
        }
        if (isMissingData) {
            fetchDatas()
        }
    }, [isMissingData, poolAddresses, updateChartData])

    return formattedByDate
}

export function usePoolChartData(poolAddress, allTokens) {
    const [state, { updateChartData }] = useTokenDataContext()
    const chartData = state?.[poolAddress]?.chartData
    useEffect(() => {
        async function checkForChartData() {
            if (!chartData) {
                const data = await getPoolChartData(poolAddress, allTokens)
                updateChartData(poolAddress, data)
            }
        }
        checkForChartData()
    }, [chartData, poolAddress, updateChartData, allTokens])
    return chartData
}

/**
 * get candlestick data for a pool - saves in context based on the window and the
 * interval size
 * @param {*} tokenAddress
 * @param {*} timeWindow // a preset time window from constant - how far back to look
 * @param {*} interval  // the chunk size in seconds - default is 1 hour of 3600s
 */
export function usePoolPriceData(poolAddress, timeWindow, interval = 3600, tokenData) {
    const [state, { updatePriceData }] = useTokenDataContext()
    const chartData = state?.[poolAddress]?.[timeWindow]?.[interval]
    const [latestBlock] = useLatestBlocks()

    useEffect(() => {
        const currentTime = dayjs.utc()
        const windowSize = timeWindow === timeframeOptions.MONTH ? 'month' : 'week'
        const startTime =
            timeWindow === timeframeOptions.ALL_TIME ? 1589760000 : currentTime.subtract(1, windowSize).startOf('hour').unix()

        async function fetch() {
            const data = await getIntervalPoolData(poolAddress, startTime, interval, latestBlock, tokenData)
            updatePriceData(poolAddress, data, timeWindow, interval)
        }
        if (!chartData) {
            fetch()
        }
    }, [chartData, interval, timeWindow, poolAddress, updatePriceData, latestBlock, tokenData])

    return chartData
}

export function useAllPoolData() {
    const [state] = useTokenDataContext()

    // filter out for only addresses
    return state ? Object.keys(state)
        .filter((key) => key !== 'combinedVol')
        .reduce((res, key) => {
            res[key] = state[key]
            return res
        }, {}) : []
}
