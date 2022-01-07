import { BigNumber } from 'bignumber.js'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import _Decimal from 'decimal.js-light'
import { ethers } from 'ethers'
import Numeral from 'numeral'
import React from 'react'
import { Text } from 'rebass'
import toFormat from 'toformat'

import { blockClient, client } from '../apollo/client'
import { GetBlockQuery, GetBlockQueryVariables, ShareValueFragment } from '../apollo/generated/types'
import { GET_BLOCK, GET_BLOCKS, SHARE_VALUE } from '../apollo/queries'
import { timeframeOptions } from '../constants'
import { toFloat } from './typeAssertions'

// format libraries
const Decimal = toFormat(_Decimal)
BigNumber.set({ EXPONENTIAL_AT: 50 })
dayjs.extend(utc)

export function getTimeframe(timeWindow) {
  const utcEndTime = dayjs.utc()
  // based on window, get starttime
  let utcStartTime
  switch (timeWindow) {
    case timeframeOptions.WEEK:
      utcStartTime = utcEndTime.subtract(1, 'week').endOf('day').unix() - 1
      break
    case timeframeOptions.MONTH:
      utcStartTime = utcEndTime.subtract(1, 'month').endOf('day').unix() - 1
      break
    case timeframeOptions.ALL_TIME:
      utcStartTime = utcEndTime.subtract(1, 'year').endOf('day').unix() - 1
      break
    default:
      utcStartTime = utcEndTime.subtract(1, 'year').startOf('year').unix() - 1
      break
  }
  return utcStartTime
}

export function getPoolLink(token0Address, token1Address = null, remove = false) {
  if (!token1Address) {
    return (
      `https://app.ubeswap.org/#/` +
      (remove ? `remove` : `add`) +
      `/${token0Address === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' ? 'ETH' : token0Address}/${'ETH'}`
    )
  } else {
    return (
      `https://app.ubeswap.org/#/` +
      (remove ? `remove` : `add`) +
      `/${token0Address === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' ? 'ETH' : token0Address}/${token1Address === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' ? 'ETH' : token1Address
      }`
    )
  }
}

export function getSwapLink(token0Address, token1Address = null) {
  if (!token1Address) {
    return `https://app.ubeswap.org/#/swap?inputCurrency=${token0Address}`
  } else {
    return `https://app.ubeswap.org/#/swap?inputCurrency=${token0Address === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' ? 'ETH' : token0Address
      }&outputCurrency=${token1Address === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' ? 'ETH' : token1Address}`
  }
}

export function getMiningPoolLink(token0Address) {
  return `https://app.ubeswap.org/#/uni/ETH/${token0Address}`
}

export function getUbeswapAppLink(linkVariable) {
  const baseUbeswapUrl = 'https://app.ubeswap.org/#/uni'
  if (!linkVariable) {
    return baseUbeswapUrl
  }

  return `${baseUbeswapUrl}/ETH/${linkVariable}`
}

export function localNumber(val) {
  return Numeral(val).format('0,0')
}

export const toNiceDate = (date) => {
  const x = dayjs.utc(dayjs.unix(date)).format('MMM DD')
  return x
}

// shorten the checksummed version of the input address to have 0x + 4 characters at start and end
export function shortenAddress(address, chars = 4) {
  const parsed = isAddress(address)
  if (!parsed) {
    throw Error(`Invalid 'address' parameter '${address}'.`)
  }
  return `${parsed.substring(0, chars + 2)}...${parsed.substring(42 - chars)}`
}

export const toWeeklyDate = (date: number): string => {
  const formatted = dayjs.utc(dayjs.unix(date))
  const dateObj = formatted.toDate()
  const day = dateObj.getDay()
  const lessDays = day === 6 ? 0 : day + 1
  const wkStart = new Date(new Date(date).setDate(dateObj.getDate() - lessDays))
  const wkEnd = new Date(new Date(wkStart).setDate(wkStart.getDate() + 6))
  return dayjs.utc(wkStart).format('MMM DD') + ' - ' + dayjs.utc(wkEnd).format('MMM DD')
}

export function getTimestampsForChanges() {
  const utcCurrentTime = dayjs()
  const t1 = utcCurrentTime.subtract(1, 'day').startOf('minute').unix()
  const t2 = utcCurrentTime.subtract(2, 'day').startOf('minute').unix()
  const tWeek = utcCurrentTime.subtract(1, 'week').startOf('minute').unix()
  return [t1, t2, tWeek]
}

export async function splitQuery(query, localClient, vars, list, skipCount = 100) {
  let fetchedData = {}
  let allFound = false
  let skip = 0

  while (!allFound) {
    let end = list.length
    if (skip + skipCount < list.length) {
      end = skip + skipCount
    }
    const sliced = list.slice(skip, end)
    const result = await localClient.query({
      query: query(...vars, sliced),
      fetchPolicy: 'cache-first',
    })
    fetchedData = {
      ...fetchedData,
      ...result.data,
    }
    if (Object.keys(result.data).length < skipCount || skip + skipCount > list.length) {
      allFound = true
    } else {
      skip += skipCount
    }
  }

  return fetchedData
}

/**
 * @notice Fetches first block after a given timestamp
 * @dev Query speed is optimized by limiting to a 600-second period
 * @param {Int} timestamp in seconds
 */
export async function getBlockFromTimestamp(timestamp: number): Promise<number> {
  const result = await blockClient.query<GetBlockQuery, GetBlockQueryVariables>({
    query: GET_BLOCK,
    variables: {
      timestampFrom: timestamp.toString(),
      timestampTo: (timestamp + 600).toString(),
    },
    fetchPolicy: 'cache-first',
  })
  return parseInt(result?.data?.blocks?.[0]?.number ?? '0')
}

/**
 * @notice Fetches block objects for an array of timestamps.
 * @dev blocks are returned in chronological order (ASC) regardless of input.
 * @dev blocks are returned at string representations of Int
 * @dev timestamps are returns as they were provided; not the block time.
 * @param {Array} timestamps
 */
export async function getBlocksFromTimestamps(
  timestamps?: readonly number[],
  skipCount = 500
): Promise<readonly { timestamp: number; number: number }[]> {
  if (timestamps?.length === 0) {
    return []
  }

  const fetchedData = await splitQuery(GET_BLOCKS, blockClient, [], timestamps, skipCount)

  const blocks: { timestamp: number; number: number }[] = []
  if (fetchedData) {
    for (const t in fetchedData) {
      if (fetchedData[t].length > 0) {
        blocks.push({
          timestamp: parseInt(t.split('t')[1]),
          number: parseInt(fetchedData[t][0]['number']),
        })
      }
    }
  }
  return blocks
}

// export async function getLiquidityTokenBalanceOvertime(account, timestamps) {
//   // get blocks based on timestamps
//   const blocks = await getBlocksFromTimestamps(timestamps)

//   // get historical share values with time travel queries
//   let result = await client.query({
//     query: SHARE_VALUE(account, blocks),
//     fetchPolicy: 'cache-first',
//   })

//   let values = []
//   for (var row in result?.data) {
//     let timestamp = row.split('t')[1]
//     if (timestamp) {
//       values.push({
//         timestamp,
//         balance: 0,
//       })
//     }
//   }
// }

export interface ShareValueSnapshot {
  timestamp: number
  sharePriceUsd: number
  totalSupply: BigDecimal
  reserve0: BigDecimal
  reserve1: BigDecimal
  reserveUSD: BigDecimal
  token0DerivedCUSD?: BigDecimal | null
  token1DerivedCUSD?: BigDecimal | null
  roiUsd: number
  token0PriceUSD: number
  token1PriceUSD: number
}
/**
 * @notice Example query using time travel queries
 * @dev TODO - handle scenario where blocks are not available for a timestamps (e.g. current time)
 * @param {String} pairAddress
 * @param {Array} timestamps
 */
export async function getShareValueOverTime(
  pairAddress: string,
  timestamps: readonly number[]
): Promise<readonly ShareValueSnapshot[]> {
  if (!timestamps) {
    const utcCurrentTime = dayjs()
    const utcSevenDaysBack = utcCurrentTime.subtract(8, 'day').unix()
    timestamps = getTimestampRange(utcSevenDaysBack, 86400, 7)
  }

  // get blocks based on timestamps
  const blocks = await getBlocksFromTimestamps(timestamps)

  // get historical share values with time travel queries
  const result = await client.query({
    query: SHARE_VALUE(pairAddress, blocks),
    fetchPolicy: 'cache-first',
  })

  const values: ShareValueSnapshot[] = []
  for (const row in result?.data) {
    const timestamp = row.split('t')[1]
    const data = result.data[row] as ShareValueFragment | undefined
    if (timestamp && data) {
      const sharePriceUsd = toFloat(data?.reserveUSD) / toFloat(data?.totalSupply)
      values.push({
        timestamp: parseInt(timestamp),
        sharePriceUsd,
        totalSupply: data.totalSupply,
        reserve0: data.reserve0,
        reserve1: data.reserve1,
        reserveUSD: data.reserveUSD,
        token0DerivedCUSD: data.token0.derivedCUSD,
        token1DerivedCUSD: data.token1.derivedCUSD,
        roiUsd: values && values[0] ? sharePriceUsd / values[0]['sharePriceUsd'] : 1,
        token0PriceUSD: toFloat(data.token0.derivedCUSD),
        token1PriceUSD: toFloat(data.token1.derivedCUSD),
      })
    }
  }

  return values
}

/**
 * @notice Creates an evenly-spaced array of timestamps
 * @dev Periods include a start and end timestamp. For example, n periods are defined by n+1 timestamps.
 * @param {Int} timestamp_from in seconds
 * @param {Int} period_length in seconds
 * @param {Int} periods
 */
export function getTimestampRange(timestamp_from, period_length, periods) {
  const timestamps = []
  for (let i = 0; i <= periods; i++) {
    timestamps.push(timestamp_from + i * period_length)
  }
  return timestamps
}

export const toNiceDateYear = (date) => dayjs.utc(dayjs.unix(date)).format('MMMM DD, YYYY')

export const isAddress = (value) => {
  try {
    return ethers.utils.getAddress(value.toLowerCase())
  } catch {
    return false
  }
}

export const toK = (num): string => {
  return Numeral(num).format('0.[00]a')
}

export const setThemeColor = (theme) => document.documentElement.style.setProperty('--c-token', theme || '#333333')

export const Big = (number) => new BigNumber(number)

export const urls = {
  showTransaction: (tx): string => `https://explorer.celo.org/tx/${tx}/`,
  showAddress: (address): string => `https://explorer.celo.org/address/${address}/`,
  showToken: (address): string => `https://explorer.celo.org/token/${address}/`,
  showBlock: (block): string => `https://explorer.celo.org/block/${block}/`,
}

export const formatTime = (unix: number): string => {
  const now = dayjs()
  const timestamp = dayjs.unix(unix)

  const inSeconds = now.diff(timestamp, 'second')
  const inMinutes = now.diff(timestamp, 'minute')
  const inHours = now.diff(timestamp, 'hour')
  const inDays = now.diff(timestamp, 'day')

  if (inHours >= 24) {
    return `${inDays} ${inDays === 1 ? 'day' : 'days'} ago`
  } else if (inMinutes >= 60) {
    return `${inHours} ${inHours === 1 ? 'hour' : 'hours'} ago`
  } else if (inSeconds >= 60) {
    return `${inMinutes} ${inMinutes === 1 ? 'minute' : 'minutes'} ago`
  } else {
    return `${inSeconds} ${inSeconds === 1 ? 'second' : 'seconds'} ago`
  }
}

export const formatNumber = (num) => {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
}

// using a currency library here in case we want to add more in future
export const formatDollarAmount = (num, digits) => {
  const formatter = new Intl.NumberFormat([], {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  return formatter.format(num)
}

export const toSignificant = (number, significantDigits) => {
  Decimal.set({ precision: significantDigits + 1, rounding: Decimal.ROUND_UP })
  const updated = new Decimal(number).toSignificantDigits(significantDigits)
  return updated.toFormat(updated.decimalPlaces(), { groupSeparator: '' })
}

export const formattedNum = (number, usd = false, acceptNegatives = false) => {
  if (isNaN(number) || number === '' || number === undefined) {
    return usd ? '$0' : 0
  }
  const num = parseFloat(number)

  if (num > 500000000) {
    return (usd ? '$' : '') + toK(num.toFixed(0))
  }

  if (num === 0) {
    if (usd) {
      return '$0'
    }
    return 0
  }

  if (num < 0.0001 && num > 0) {
    return usd ? '< $0.0001' : '< 0.0001'
  }

  if (num > 1000) {
    return usd ? formatDollarAmount(num, 0) : Number(parseFloat(num.toString()).toFixed(0)).toLocaleString()
  }

  if (usd) {
    if (num < 0.1) {
      return formatDollarAmount(num, 4)
    } else {
      return formatDollarAmount(num, 2)
    }
  }

  return Number(parseFloat(num.toString()).toFixed(5)).toLocaleString()
}

export function rawPercent(percentRaw: number): string {
  const percent = parseFloat((percentRaw * 100).toString())
  if (!percent || percent === 0) {
    return '0%'
  }
  if (percent < 1 && percent > 0) {
    return '< 1%'
  }
  return percent.toFixed(0) + '%'
}

export function formattedPercent(percent, useBrackets = false) {
  percent = parseFloat(percent)
  if (!percent || percent === 0) {
    return <Text fontWeight={500}>0%</Text>
  }

  if (percent < 0.0001 && percent > 0) {
    return (
      <Text fontWeight={500} color="green">
        {'< 0.0001%'}
      </Text>
    )
  }

  if (percent < 0 && percent > -0.0001) {
    return (
      <Text fontWeight={500} color="red">
        {'< 0.0001%'}
      </Text>
    )
  }

  const fixedPercent = percent.toFixed(2)
  if (fixedPercent === '0.00') {
    return '0%'
  }
  if (fixedPercent > 0) {
    if (fixedPercent > 100) {
      return <Text fontWeight={500} color="green">{`+${percent?.toFixed(0).toLocaleString()}%`}</Text>
    } else {
      return <Text fontWeight={500} color="green">{`+${fixedPercent}%`}</Text>
    }
  } else {
    return <Text fontWeight={500} color="red">{`${fixedPercent}%`}</Text>
  }
}

/**
 * gets the amoutn difference plus the % change in change itself (second order change)
 * @param {*} valueNow
 * @param {*} value24HoursAgo
 * @param {*} value48HoursAgo
 */
export const get2DayPercentChange = (
  valueNow: BigDecimal,
  value24HoursAgo: BigDecimal = '0',
  value48HoursAgo: BigDecimal = '0'
): readonly [number, number] => {
  // get volume info for both 24 hour periods
  const currentChange = parseFloat(valueNow) - parseFloat(value24HoursAgo)
  const previousChange = parseFloat(value24HoursAgo) - parseFloat(value48HoursAgo)

  const adjustedPercentChange =
    (parseFloat((currentChange - previousChange).toString()) / parseFloat(previousChange.toString())) * 100

  if (isNaN(adjustedPercentChange) || !isFinite(adjustedPercentChange)) {
    return [currentChange, 0]
  }
  return [currentChange, adjustedPercentChange]
}

/**
 * get standard percent change between two values
 * @param {*} valueNow
 * @param {*} value24HoursAgo
 */
export const getPercentChange = (valueNow?: string | number, value24HoursAgo?: string | number): number => {
  const adjustedPercentChange =
    ((parseFloat(valueNow?.toString() ?? '0') - parseFloat(value24HoursAgo?.toString() ?? '0')) /
      parseFloat(value24HoursAgo?.toString() ?? '0')) *
    100
  if (isNaN(adjustedPercentChange) || !isFinite(adjustedPercentChange)) {
    return 0
  }
  return adjustedPercentChange
}

export function isEquivalent(a, b): boolean {
  const aProps = Object.getOwnPropertyNames(a)
  const bProps = Object.getOwnPropertyNames(b)
  if (aProps.length !== bProps.length) {
    return false
  }
  for (let i = 0; i < aProps.length; i++) {
    const propName = aProps[i]
    if (a[propName] !== b[propName]) {
      return false
    }
  }
  return true
}

export function calculateTVL(allTokens, positions, balances): number {
  let TVL = 0.0;

  if (!allTokens || !positions.length || !balances.length || positions.length != balances.length) {
    return 0;
  }

  for (let i = 0; i < positions.length; i++) {
    if (allTokens[positions[i]]) {
      TVL = TVL + (parseFloat(allTokens[positions[i]].priceUSD) * balances[i])
    }
  }

  return TVL;
}

export function calculatePreviousDayTVL(allTokens, positions, balances): number {
  let TVL = 0.0;

  if (!allTokens || !positions.length || !balances.length || positions.length != balances.length) {
    return 0;
  }

  for (let i = 0; i < positions.length; i++) {
    if (allTokens[positions[i]]) {
      TVL = TVL + (parseFloat(allTokens[positions[i]].oneDayData.derivedCUSD) * balances[i])
    }
  }

  return TVL;
}
