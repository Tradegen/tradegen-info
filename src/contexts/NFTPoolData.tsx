import { ApolloQueryResult } from 'apollo-client'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'

import { tradegenClient } from '../apollo/client'
import {
    NftPoolDataLatestQuery,
    NftPoolDataLatestQueryVariables,
    NftPoolDataQuery,
    NftPoolDataQueryVariables,
    NftPoolDayDatasQuery,
    NftPoolDayDatasQueryVariables,
    NftPoolsCurrentQuery,
    NftPoolsDynamicQuery,
    NftPoolsDynamicQueryVariables,
    FilteredTransactionsTradegenQuery,
    FilteredTransactionsTradegenQueryVariables,
} from '../apollo/generated/types'
import {
    DATA_BY_BLOCK_NFT_POOL,
    NFT_POOL_DATA,
    NFT_POOL_DATA_LATEST,
    NFT_POOLS_CURRENT,
    NFT_POOLS_DYNAMIC,
    FILTERED_TRANSACTIONS_TRADEGEN,
    NFT_POOL_CHART
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
const UPDATE_TOP_NFT_POOLS = ' UPDATE_TOP_NFT_POOLS'
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

        case UPDATE_TOP_NFT_POOLS: {
            const { topNFTPools } = payload
            const added = {}
            topNFTPools &&
                topNFTPools.map((NFTpool) => {
                    return (added[NFTpool.id] = NFTpool)
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

    const updateTopNFTPools = useCallback((topNFTPools) => {
        dispatch({
            type: UPDATE_TOP_NFT_POOLS,
            payload: {
                topNFTPools,
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
                        updateTopNFTPools,
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
                    updateTopNFTPools,
                    updateAllPairs,
                    updatePriceData,
                ]
            )}
        >
            {children}
        </TokenDataContext.Provider>
    )
}

const getTopNFTPools = async () => {
    const utcCurrentTime = dayjs()
    const utcOneDayBack = utcCurrentTime.subtract(1, 'day').unix()
    const utcTwoDaysBack = utcCurrentTime.subtract(2, 'day').unix()
    const oneDayBlock = await getBlockFromTimestamp(utcOneDayBack)
    const twoDayBlock = await getBlockFromTimestamp(utcTwoDaysBack)

    console.log('top NFT pools')

    try {
        const current = await tradegenClient.query<NftPoolsCurrentQuery>({
            query: NFT_POOLS_CURRENT,
            fetchPolicy: 'cache-first',
        })

        const oneDayResult: ApolloQueryResult<NftPoolsDynamicQuery> | null = await tradegenClient
            .query<NftPoolsDynamicQuery, NftPoolsDynamicQueryVariables>({
                query: NFT_POOLS_DYNAMIC,
                fetchPolicy: 'cache-first',
                variables: {
                    block: oneDayBlock,
                },
            })
            .catch((e) => {
                console.error(e)
                return null
            })

        const twoDayResult: ApolloQueryResult<NftPoolsDynamicQuery> | null = await tradegenClient
            .query<NftPoolsDynamicQuery, NftPoolsDynamicQueryVariables>({
                query: NFT_POOLS_DYNAMIC,
                fetchPolicy: 'cache-first',
                variables: {
                    block: twoDayBlock,
                },
            })
            .catch((e) => {
                console.error(e)
                return null
            })

        const oneDayData = oneDayResult?.data?.nftpools.reduce((obj, cur) => {
            return { ...obj, [cur.id]: cur }
        }, {})

        const twoDayData = twoDayResult?.data?.nftpools.reduce((obj, cur) => {
            return { ...obj, [cur.id]: cur }
        }, {})

        const bulkResults = await Promise.all(
            (current &&
                current?.data?.nftpools?.map(async (nftpool) => {
                    const data = nftpool

                    // let liquidityDataThisToken = liquidityData?.[token.id]
                    let oneDayHistory: NftPoolDataQuery['nftpools'][number] | null = oneDayData?.[nftpool.id]
                    let twoDayHistory: NftPoolDataQuery['nftpools'][number] | null = twoDayData?.[nftpool.id]

                    // catch the case where token wasnt in top list in previous days
                    if (!oneDayHistory) {
                        try {
                            const oneDayResult = await tradegenClient.query<NftPoolDataQuery, NftPoolDataQueryVariables>({
                                query: NFT_POOL_DATA,
                                fetchPolicy: 'cache-first',
                                variables: {
                                    NFTPoolAddressID: nftpool.id,
                                    block: oneDayBlock,
                                },
                            })
                            oneDayHistory = oneDayResult.data.nftpools[0]
                        } catch (e) {
                            console.error(e)
                        }
                    }
                    if (!twoDayHistory) {
                        try {
                            const twoDayResult = await tradegenClient.query<NftPoolDataQuery, NftPoolDataQueryVariables>({
                                query: NFT_POOL_DATA,
                                fetchPolicy: 'cache-first',
                                variables: {
                                    NFTPoolAddressID: nftpool.id,
                                    block: twoDayBlock,
                                },
                            })
                            twoDayHistory = twoDayResult.data.nftpools[0]
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

type NFTPoolData = NftPoolDataLatestQuery['nftpools'][number] &
    Partial<{
        oneDayVolumeUSD: number
        volumeChangeUSD: number
        priceChangeUSD: number
        totalValueLockedChangeUSD: number
        oneDayData: number
        twoDayData: number
    }>

const getNFTPoolData = async (address: string): Promise<NFTPoolData | null> => {
    const utcCurrentTime = dayjs()
    const utcOneDayBack = utcCurrentTime.subtract(1, 'day').startOf('minute').unix()
    const utcTwoDaysBack = utcCurrentTime.subtract(2, 'day').startOf('minute').unix()
    const oneDayBlock = await getBlockFromTimestamp(utcOneDayBack)
    const twoDayBlock = await getBlockFromTimestamp(utcTwoDaysBack)

    // initialize data arrays
    let data: NftPoolDataLatestQuery['nftpools'][number] | null = null
    let oneDayData: NftPoolDataLatestQuery['nftpools'][number] | null = null
    let twoDayData: NftPoolDataLatestQuery['nftpools'][number] | null = null

    try {
        // fetch all current and historical data
        const result = await tradegenClient.query<NftPoolDataLatestQuery, NftPoolDataLatestQueryVariables>({
            query: NFT_POOL_DATA_LATEST,
            fetchPolicy: 'cache-first',
            variables: { NFTPoolAddressID: address },
        })
        data = result?.data?.nftpools?.[0]

        // get results from 24 hours in past
        const oneDayResult = await tradegenClient.query<NftPoolDataQuery, NftPoolDataQueryVariables>({
            query: NFT_POOL_DATA,
            fetchPolicy: 'cache-first',
            variables: { block: oneDayBlock, NFTPoolAddressID: address },
        })
        oneDayData = oneDayResult.data.nftpools[0]

        // get results from 48 hours in past
        const twoDayResult = await tradegenClient.query<NftPoolDataQuery, NftPoolDataQueryVariables>({
            query: NFT_POOL_DATA,
            fetchPolicy: 'cache-first',
            variables: { block: twoDayBlock, NFTPoolAddressID: address },
        })
        twoDayData = twoDayResult.data.nftpools[0]

        // catch the case where token wasnt in top list in previous days
        if (!oneDayData) {
            const oneDayResult = await tradegenClient.query<NftPoolDataQuery, NftPoolDataQueryVariables>({
                query: NFT_POOL_DATA,
                fetchPolicy: 'cache-first',
                variables: { block: oneDayBlock, NFTPoolAddressID: address },
            })
            oneDayData = oneDayResult.data.nftpools[0]
        }
        if (!twoDayData) {
            const twoDayResult = await tradegenClient.query<NftPoolDataQuery, NftPoolDataQueryVariables>({
                query: NFT_POOL_DATA,
                fetchPolicy: 'cache-first',
                variables: { block: twoDayBlock, NFTPoolAddressID: address },
            })
            twoDayData = twoDayResult.data.nftpools[0]
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

const getNFTPoolTransactions = async (allNFTPoolsFormatted: string[]): Promise<Partial<Transactions>> => {
    try {
        const result = await tradegenClient.query<FilteredTransactionsTradegenQuery, FilteredTransactionsTradegenQueryVariables>({
            query: FILTERED_TRANSACTIONS_TRADEGEN,
            variables: {
                allPools: [],
                allNFTPools: allNFTPoolsFormatted
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

const getIntervalNFTPoolData = async (NFTPoolAddress, startTime, interval = 3600, latestBlock, tokenData) => {
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

        const result = await splitQuery(DATA_BY_BLOCK_NFT_POOL, tradegenClient, [NFTPoolAddress], blocks, 50)

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
                let tokenPrice = poolValue / (totalSupply * 1e18);
                values.push({
                    timestamp,
                    tokenPrice,
                })
            }
            index++;
        }

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

const getNFTPoolChartData = async (NFTPoolAddress: string): Promise<readonly ChartDatum[]> => {
    let fetchedData: NftPoolDayDatasQuery['nftpoolDayDatas'] = []
    let resultData: ChartDatum[] = []
    const utcEndTime = dayjs.utc()
    const utcStartTime = utcEndTime.subtract(1, 'year')
    const startTime = utcStartTime.startOf('minute').unix() - 1

    try {
        let allFound = false
        let skip = 0
        while (!allFound) {
            const result = await tradegenClient.query<NftPoolDayDatasQuery, NftPoolDayDatasQueryVariables>({
                query: NFT_POOL_CHART,
                variables: {
                    NFTPoolAddress: NFTPoolAddress,
                    skip,
                },
                fetchPolicy: 'cache-first',
            })
            if (result.data.nftpoolDayDatas.length < 1000) {
                allFound = true
            }
            skip += 1000
            fetchedData = fetchedData.concat(result.data.nftpoolDayDatas)
        }

        const dayIndexSet = new Set()
        const dayIndexArray = fetchedData.slice()
        const oneDay = 24 * 60 * 60

        resultData = fetchedData.map((dayData) => {
            dayIndexSet.add((dayData.date / oneDay).toFixed(0))
            return { ...dayData, dayString: '', dailyVolumeUSD: parseFloat(dayData.dailyVolumeUSD) / 1e18, totalValueLockedUSD: (Number(dayData.totalValueLockedUSD) / 1e18).toString() }
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
                    totalValueLockedUSD: (Number(latestTotalValueLockedUSD.toString()) / 1e18).toString(),
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
    const [, { updateTopNFTPools }] = useTokenDataContext()
    useEffect(() => {
        async function getData() {
            // get top pools for overview list
            const topNFTPools = await getTopNFTPools()
            if (topNFTPools) {
                updateTopNFTPools(topNFTPools)
            }
        }
        getData()
    }, [updateTopNFTPools])
    return null
}

export function useNFTPoolData(NFTPoolAddress: string) {
    const [state, { update }] = useTokenDataContext()
    const nftpoolData = state?.[NFTPoolAddress]

    useEffect(() => {
        if (!nftpoolData && isAddress(NFTPoolAddress)) {
            getNFTPoolData(NFTPoolAddress).then((data) => {
                update(NFTPoolAddress, data)
            })
        }
    }, [NFTPoolAddress, nftpoolData, update])

    return nftpoolData || {}
}

export function useNFTPoolTransactions(NFTPoolAddress) {
    const [state, { updateTokenTxns }] = useTokenDataContext()
    const tokenTxns = state?.[NFTPoolAddress]?.txns

    useEffect(() => {
        async function checkForTxns() {
            if (!tokenTxns) {
                const transactions = await getNFTPoolTransactions([NFTPoolAddress])
                updateTokenTxns(NFTPoolAddress, transactions)
            }
        }
        checkForTxns()
    }, [tokenTxns, NFTPoolAddress, updateTokenTxns])

    return tokenTxns || []
}

export function useNFTPoolDataCombined(NFTPoolAddresses: readonly string[]) {
    const [state, { updateCombinedVolume }] = useTokenDataContext()

    const volume = state?.combinedVol

    useEffect(() => {
        async function fetchDatas() {
            Promise.all(
                NFTPoolAddresses.map(async (address) => {
                    return await getNFTPoolData(address)
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
    }, [NFTPoolAddresses, volume, updateCombinedVolume])

    return volume
}

export function useNFTPoolChartDataCombined(NFTPoolAddresses) {
    const [state, { updateChartData }] = useTokenDataContext()

    const datas = useMemo(() => {
        return (
            NFTPoolAddresses &&
            NFTPoolAddresses.reduce(function (acc, address) {
                acc[address] = state?.[address]?.chartData
                return acc
            }, {})
        )
    }, [state, NFTPoolAddresses])

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
                NFTPoolAddresses.map(async (address) => {
                    return await getNFTPoolChartData(address)
                })
            )
                .then((res) => {
                    res &&
                        res.map((result, i) => {
                            const tokenAddress = NFTPoolAddresses[i]
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
    }, [isMissingData, NFTPoolAddresses, updateChartData])

    return formattedByDate
}

export function useNFTPoolChartData(NFTPoolAddress) {
    const [state, { updateChartData }] = useTokenDataContext()
    const chartData = state?.[NFTPoolAddress]?.chartData
    useEffect(() => {
        async function checkForChartData() {
            if (!chartData) {
                const data = await getNFTPoolChartData(NFTPoolAddress)
                updateChartData(NFTPoolAddress, data)
            }
        }
        checkForChartData()
    }, [chartData, NFTPoolAddress, updateChartData])
    return chartData
}

/**
 * get candlestick data for an NFT pool - saves in context based on the window and the
 * interval size
 * @param {*} NFTPoolAddress
 * @param {*} timeWindow // a preset time window from constant - how far back to look
 * @param {*} interval  // the chunk size in seconds - default is 1 hour of 3600s
 */
export function useNFTPoolPriceData(NFTPoolAddress, timeWindow, interval = 3600, tokenData) {
    const [state, { updatePriceData }] = useTokenDataContext()
    const chartData = state?.[NFTPoolAddress]?.[timeWindow]?.[interval]
    const [latestBlock] = useLatestBlocks()

    useEffect(() => {
        const currentTime = dayjs.utc()
        const windowSize = timeWindow === timeframeOptions.MONTH ? 'month' : 'week'
        const startTime =
            timeWindow === timeframeOptions.ALL_TIME ? 1589760000 : currentTime.subtract(1, windowSize).startOf('hour').unix()

        async function fetch() {
            const data = await getIntervalNFTPoolData(NFTPoolAddress, startTime, interval, latestBlock, tokenData)
            updatePriceData(NFTPoolAddress, data, timeWindow, interval)
        }
        if (!chartData) {
            fetch()
        }
    }, [chartData, interval, timeWindow, NFTPoolAddress, updatePriceData, latestBlock, tokenData])

    return chartData
}

export function useAllNFTPoolData() {
    const [state] = useTokenDataContext()

    // filter out for only addresses
    return state ? Object.keys(state)
        .filter((key) => key !== 'combinedVol')
        .reduce((res, key) => {
            res[key] = state[key]
            return res
        }, {}) : []
}
