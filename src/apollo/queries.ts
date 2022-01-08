import { DocumentNode } from 'graphql'
import gql from 'graphql-tag'

export const SUBGRAPH_HEALTH = gql`
  query Health {
    indexingStatusForCurrentVersion(subgraphName: "ubeswap/ubeswap") {
      synced
      health
      chains {
        chainHeadBlock {
          number
        }
        latestBlock {
          number
        }
      }
    }
  }
`

export const GET_BLOCK = gql`
  query GetBlock($timestampFrom: BigInt!, $timestampTo: BigInt!) {
    blocks(
      first: 1
      orderBy: timestamp
      orderDirection: asc
      where: { timestamp_gt: $timestampFrom, timestamp_lt: $timestampTo }
    ) {
      id
      number
      timestamp
    }
  }
`

export const GET_BLOCKS = (timestamps: readonly number[]): DocumentNode => {
  let queryString = 'query blocks {'
  queryString += timestamps.map((timestamp) => {
    return `t${timestamp}:blocks(first: 1, orderBy: timestamp, orderDirection: desc, where: { timestamp_gt: ${timestamp}, timestamp_lt: ${timestamp + 600
      } }) {
      number
    }`
  })
  queryString += '}'
  return gql(queryString)
}

export const PRICES_BY_BLOCK = (
  poolAddress: string,
  blocks: readonly { timestamp: number; number: number }[]
): DocumentNode => {
  let queryString = 'query pricesByBlockPool {'
  queryString += blocks.map(
    (block) => `
      t${block.timestamp}:pool(id:"${poolAddress}", block: { number: ${block.number} }) { 
        tokenPrice
      }
    `
  )

  queryString += '}'
  return gql(queryString)
}

export const POSITIONS_BY_BLOCK = (account, blocks) => {
  let queryString = 'query positionsByBlock {'
  queryString += blocks.map(
    (block) => `
      t${block.timestamp}:liquidityPositions(where: {user: "${account}"}, block: { number: ${block.number} }) { 
        liquidityTokenBalance
        pair  {
          id
          totalSupply
          reserveUSD
        }
      }
    `
  )
  queryString += '}'
  return gql(queryString)
}

export const DATA_BY_BLOCK_POOL = (
  poolAddress: string,
  blocks: readonly { timestamp: number; number: number }[]
): DocumentNode => {
  let queryString = 'query pricesByBlockPool {'
  queryString += blocks.map(
    (block) => `
      t${block.timestamp}:pool(id:"${poolAddress}", block: { number: ${block.number} }) { 
        positionAddresses
        positionBalances
        totalSupply
      }
    `
  )

  queryString += '}'
  return gql(queryString)
}

export const PRICES_BY_BLOCK_NFT_POOL = (
  NFTPoolAddress: string,
  blocks: readonly { timestamp: number; number: number }[]
): DocumentNode => {
  let queryString = 'query pricesByBlockNFTPool {'
  queryString += blocks.map(
    (block) => `
      t${block.timestamp}:nftpool(id:"${NFTPoolAddress}", block: { number: ${block.number} }) { 
        tokenPrice
      }
    `
  )

  queryString += '}'
  return gql(queryString)
}

export const DATA_BY_BLOCK_NFT_POOL = (
  poolAddress: string,
  blocks: readonly { timestamp: number; number: number }[]
): DocumentNode => {
  let queryString = 'query pricesByBlockNFTPool {'
  queryString += blocks.map(
    (block) => `
      t${block.timestamp}:nftpool(id:"${poolAddress}", block: { number: ${block.number} }) { 
        positionAddresses
        positionBalances
        totalSupply
      }
    `
  )

  queryString += '}'
  return gql(queryString)
}

export const TOP_LPS_PER_PAIRS = gql`
  query TopLpsPerPairs($pair: String!) {
    liquidityPositions(where: { pair: $pair }, orderBy: liquidityTokenBalance, orderDirection: desc, first: 10) {
      user {
        id
      }
      pair {
        id
      }
      liquidityTokenBalance
    }
  }
`

export const HOURLY_PAIR_RATES = (pairAddress, blocks) => {
  let queryString = 'query blocks {'
  queryString += blocks.map(
    (block) => `
      t${block.timestamp}: pair(id:"${pairAddress}", block: { number: ${block.number} }) { 
        token0Price
        token1Price
      }
    `
  )

  queryString += '}'
  return gql(queryString)
}

const shareValueFragment = gql`
  fragment shareValue on Pair {
    reserve0
    reserve1
    reserveUSD
    totalSupply
    token0 {
      derivedCUSD
    }
    token1 {
      derivedCUSD
    }
  }
`

export const SHARE_VALUE = (
  pairAddress: string,
  blocks: readonly {
    timestamp: number
    number: number
  }[]
): DocumentNode => {
  let queryString = 'query HistoricalShareValue {'
  queryString += blocks.map(
    (block) => `
      t${block.timestamp}:pair(id:"${pairAddress}", block: { number: ${block.number} }) { 
        ...shareValue
      }
    `
  )
  queryString += ','
  queryString += blocks.map(
    (block) => `
      b${block.timestamp}: bundle(id:"1", block: { number: ${block.number} }) { 
        celoPrice
      }
    `
  )

  queryString += '}'
  // insert share value fragment
  queryString += shareValueFragment.loc?.source.body ?? ''
  return gql(queryString)
}

export const CURRENT_CELO_PRICE = gql`
  query CurrentCeloPrice {
    bundles(where: { id: "1" }) {
      id
      celoPrice
    }
  }
`

export const CELO_PRICE = gql`
  query CeloPrice($block: Int!) {
    bundles(where: { id: "1" }, block: { number: $block }) {
      id
      celoPrice
    }
  }
`

export const USER_MINTS_BUNRS_PER_PAIR = gql`
  query UserMintsBurnsPerPair($user: Bytes, $pair: String!) {
    mints(where: { to: $user, pair: $pair }) {
      amountUSD
      amount0
      amount1
      timestamp
      pair {
        token0 {
          id
        }
        token1 {
          id
        }
      }
    }
    burns(where: { sender: $user, pair: $pair }) {
      amountUSD
      amount0
      amount1
      timestamp
      pair {
        token0 {
          id
        }
        token1 {
          id
        }
      }
    }
  }
`

export const FIRST_SNAPSHOT = gql`
  query FirstSnapshot($user: String) {
    liquidityPositionSnapshots(first: 1, where: { user: $user }, orderBy: timestamp, orderDirection: asc) {
      timestamp
    }
  }
`

export const USER_HISTORY = gql`
  query UserHistory($user: String!, $skip: Int!) {
    liquidityPositionSnapshots(first: 1000, skip: $skip, where: { user: $user }) {
      timestamp
      reserveUSD
      liquidityTokenBalance
      liquidityTokenTotalSupply
      reserve0
      reserve1
      token0PriceUSD
      token1PriceUSD
      pair {
        id
        reserve0
        reserve1
        reserveUSD
        token0 {
          id
        }
        token1 {
          id
        }
      }
    }
  }
`

export const liquidityPairFragment = gql`
  fragment liquidityPair on Pair {
    id
    reserve0
    reserve1
    reserveUSD
    token0 {
      id
      symbol
      derivedCUSD
    }
    token1 {
      id
      symbol
      derivedCUSD
    }
    totalSupply
  }
`

export const USER_POSITIONS = gql`
  query liquidityPositions($user: String!) {
    liquidityPositions(where: { user: $user }) {
      pair {
        id
        ...liquidityPair
      }
      liquidityTokenBalance
    }
  }
`

export const USER_TRANSACTIONS = gql`
  query UserTransactions($user: Bytes) {
    mints(orderBy: timestamp, orderDirection: desc, where: { to: $user }) {
      id
      transaction {
        id
        timestamp
      }
      pair {
        id
        token0 {
          id
          symbol
        }
        token1 {
          id
          symbol
        }
      }
      to
      liquidity
      amount0
      amount1
      amountUSD
    }
    burns(orderBy: timestamp, orderDirection: desc, where: { sender: $user }) {
      id
      transaction {
        id
        timestamp
      }
      pair {
        id
        token0 {
          symbol
        }
        token1 {
          symbol
        }
      }
      sender
      to
      liquidity
      amount0
      amount1
      amountUSD
    }
    swaps(orderBy: timestamp, orderDirection: desc, where: { to: $user }) {
      id
      transaction {
        id
        timestamp
      }
      pair {
        token0 {
          symbol
        }
        token1 {
          symbol
        }
      }
      amount0In
      amount0Out
      amount1In
      amount1Out
      amountUSD
      to
    }
  }
`

export const PAIR_CHART = gql`
  query PairDayDatasChart($pairAddress: Bytes!, $skip: Int!) {
    pairDayDatas(first: 1000, skip: $skip, orderBy: date, orderDirection: asc, where: { pairAddress: $pairAddress }) {
      id
      date
      dailyVolumeToken0
      dailyVolumeToken1
      dailyVolumeUSD
      reserveUSD
    }
  }
`

export const PAIR_DAY_DATA = gql`
  query PairDayDatas($pairAddress: Bytes!, $date: Int!) {
    pairDayDatas(first: 1, orderBy: date, orderDirection: desc, where: { pairAddress: $pairAddress, date_lt: $date }) {
      id
      date
      dailyVolumeToken0
      dailyVolumeToken1
      dailyVolumeUSD
      totalSupply
      reserveUSD
    }
  }
`

export const PAIR_DAY_DATA_BULK = (pairs, startTimestamp) => {
  let pairsString = `[`
  pairs.map((pair) => {
    return (pairsString += `"${pair}"`)
  })
  pairsString += ']'
  const queryString = `
    query PairDayDataBulk {
      pairDayDatas(first: 1000, orderBy: date, orderDirection: asc, where: { pairAddress_in: ${pairsString}, date_gt: ${startTimestamp} }) {
        id
        pairAddress
        date
        dailyVolumeToken0
        dailyVolumeToken1
        dailyVolumeUSD
        totalSupply
        reserveUSD
      }
    } 
`
  return gql(queryString)
}

export const GLOBAL_CHART = gql`
  query ubeswapDayDatas($startTime: Int!, $skip: Int!) {
    ubeswapDayDatas(first: 1000, skip: $skip, where: { date_gt: $startTime }, orderBy: date, orderDirection: asc) {
      id
      date
      totalVolumeUSD
      dailyVolumeUSD
      dailyVolumeCELO
      totalLiquidityUSD
      totalLiquidityCELO
    }
  }
`

export const GLOBAL_DATA_LATEST = gql`
  query GlobalDataLatest($factoryAddress: ID!) {
    ubeswapFactories(where: { id: $factoryAddress }) {
      id
      totalVolumeUSD
      totalVolumeCELO
      untrackedVolumeUSD
      totalLiquidityUSD
      totalLiquidityCELO
      txCount
      pairCount
    }
  }
`

export const GLOBAL_DATA = gql`
  query GlobalData($block: Int!, $factoryAddress: ID!) {
    ubeswapFactories(block: { number: $block }, where: { id: $factoryAddress }) {
      id
      totalVolumeUSD
      totalVolumeCELO
      untrackedVolumeUSD
      totalLiquidityUSD
      totalLiquidityCELO
      txCount
      pairCount
    }
  }
`

export const GLOBAL_TXNS = gql`
  query GlobalTransactions {
    transactions(first: 100, orderBy: timestamp, orderDirection: desc) {
      mints(orderBy: timestamp, orderDirection: desc) {
        transaction {
          id
          timestamp
        }
        pair {
          token0 {
            id
            symbol
          }
          token1 {
            id
            symbol
          }
        }
        to
        liquidity
        amount0
        amount1
        amountUSD
      }
      burns(orderBy: timestamp, orderDirection: desc) {
        transaction {
          id
          timestamp
        }
        pair {
          token0 {
            id
            symbol
          }
          token1 {
            id
            symbol
          }
        }
        sender
        liquidity
        amount0
        amount1
        amountUSD
      }
      swaps(orderBy: timestamp, orderDirection: desc) {
        transaction {
          id
          timestamp
        }
        pair {
          token0 {
            id
            symbol
          }
          token1 {
            id
            symbol
          }
        }
        amount0In
        amount0Out
        amount1In
        amount1Out
        amountUSD
        to
      }
    }
  }
`

export const ALL_TOKENS = gql`
  query AllTokens($skip: Int!) {
    tokens(first: 500, skip: $skip) {
      id
      name
      symbol
      totalLiquidity
    }
  }
`

export const TOKEN_SEARCH = gql`
  query TokenSearch($value: String, $id: ID) {
    asSymbol: tokens(where: { symbol_contains: $value }, orderBy: totalLiquidity, orderDirection: desc) {
      id
      symbol
      name
      totalLiquidity
    }
    asName: tokens(where: { name_contains: $value }, orderBy: totalLiquidity, orderDirection: desc) {
      id
      symbol
      name
      totalLiquidity
    }
    asAddress: tokens(where: { id: $id }, orderBy: totalLiquidity, orderDirection: desc) {
      id
      symbol
      name
      totalLiquidity
    }
  }
`

export const PAIR_SEARCH = gql`
  query pairs($tokens: [String!], $id: ID) {
    as0: pairs(where: { token0_in: $tokens }) {
      id
      token0 {
        id
        symbol
        name
      }
      token1 {
        id
        symbol
        name
      }
    }
    as1: pairs(where: { token1_in: $tokens }) {
      id
      token0 {
        id
        symbol
        name
      }
      token1 {
        id
        symbol
        name
      }
    }
    asAddress: pairs(where: { id: $id }) {
      id
      token0 {
        id
        symbol
        name
      }
      token1 {
        id
        symbol
        name
      }
    }
  }
`

export const ALL_PAIRS = gql`
  query AllPairs($skip: Int!) {
    pairs(first: 500, skip: $skip, orderBy: trackedReserveUSD, orderDirection: desc) {
      id
      token0 {
        id
        symbol
        name
      }
      token1 {
        id
        symbol
        name
      }
    }
  }
`

const PairFields = gql`
  fragment PairFields on Pair {
    id
    txCount
    token0 {
      id
      symbol
      name
      totalLiquidity
      derivedCUSD
    }
    token1 {
      id
      symbol
      name
      totalLiquidity
      derivedCUSD
    }
    reserve0
    reserve1
    reserveUSD
    totalSupply
    trackedReserveUSD
    reserveCELO
    volumeUSD
    untrackedVolumeUSD
    token0Price
    token1Price
    createdAtTimestamp
    createdAtBlockNumber
  }
`

export const PAIRS_CURRENT = gql`
  query PairsCurrent {
    pairs(first: 200, orderBy: reserveUSD, orderDirection: desc) {
      id
    }
  }
`

export const PAIR_DATA: DocumentNode = gql`
  query PairData($block: Int, $pairAddress: ID!) {
    pairs(block: { number: $block }, where: { id: $pairAddress }) {
      ...PairFields
    }
  }
  ${PairFields}
`

export const PAIRS_BULK = gql`
  ${PairFields}
  query PairsBulk($allPairs: [ID!]!) {
    pairs(first: 500, where: { id_in: $allPairs }, orderBy: trackedReserveUSD, orderDirection: desc) {
      ...PairFields
    }
  }
`

export const PAIRS_HISTORICAL_BULK = gql`
  query PairsHistoricalBulk($pairs: [ID!]!, $block: Int!) {
    pairs(
      first: 200
      where: { id_in: $pairs }
      block: { number: $block }
      orderBy: trackedReserveUSD
      orderDirection: desc
    ) {
      id
      reserveUSD
      trackedReserveUSD
      volumeUSD
      untrackedVolumeUSD
    }
  }
`

export const TOKEN_CHART = gql`
  query TokenDayDatas($tokenAddr: String!, $skip: Int!) {
    tokenDayDatas(first: 1000, skip: $skip, orderBy: date, orderDirection: asc, where: { token: $tokenAddr }) {
      id
      date
      priceUSD
      totalLiquidityToken
      totalLiquidityUSD
      totalLiquidityCELO
      dailyVolumeCELO
      dailyVolumeToken
      dailyVolumeUSD
    }
  }
`

const TokenFields = gql`
  fragment TokenFields on Token {
    id
    name
    symbol
    derivedCUSD
    tradeVolumeUSD
    tradeVolumeUSD
    untrackedVolumeUSD
    totalLiquidity
    txCount
  }
`

export const TOKENS_CURRENT = gql`
  ${TokenFields}
  query TokensCurrent {
    tokens(first: 200, orderBy: tradeVolumeUSD, orderDirection: desc) {
      ...TokenFields
    }
  }
`

export const TOKENS_DYNAMIC = gql`
  query TokensDynamic($block: Int!) {
    tokens(block: { number: $block }, first: 200, orderBy: tradeVolumeUSD, orderDirection: desc) {
      ...TokenFields
    }
  }
  ${TokenFields}
`

export const TOKEN_DATA_LATEST = gql`
  query TokenDataLatest($tokenAddress: String!, $tokenAddressID: ID!) {
    tokens(where: { id: $tokenAddressID }) {
      ...TokenFields
    }
    pairs0: pairs(where: { token0: $tokenAddress }, first: 50, orderBy: reserveUSD, orderDirection: desc) {
      id
    }
    pairs1: pairs(where: { token1: $tokenAddress }, first: 50, orderBy: reserveUSD, orderDirection: desc) {
      id
    }
  }
  ${TokenFields}
`

export const TOKEN_DATA = gql`
  query TokenData($block: Int, $tokenAddress: String!, $tokenAddressID: ID!) {
    tokens(block: { number: $block }, where: { id: $tokenAddressID }) {
      ...TokenFields
    }
    pairs0: pairs(where: { token0: $tokenAddress }, first: 50, orderBy: reserveUSD, orderDirection: desc) {
      id
    }
    pairs1: pairs(where: { token1: $tokenAddress }, first: 50, orderBy: reserveUSD, orderDirection: desc) {
      id
    }
  }
  ${TokenFields}
`

export const FILTERED_TRANSACTIONS = gql`
  query FilteredTransactions($allPairs: [String!]!) {
    mints(first: 20, where: { pair_in: $allPairs }, orderBy: timestamp, orderDirection: desc) {
      transaction {
        id
        timestamp
      }
      pair {
        token0 {
          id
          symbol
        }
        token1 {
          id
          symbol
        }
      }
      to
      liquidity
      amount0
      amount1
      amountUSD
    }
    burns(first: 20, where: { pair_in: $allPairs }, orderBy: timestamp, orderDirection: desc) {
      transaction {
        id
        timestamp
      }
      pair {
        token0 {
          id
          symbol
        }
        token1 {
          id
          symbol
        }
      }
      sender
      liquidity
      amount0
      amount1
      amountUSD
    }
    swaps(first: 30, where: { pair_in: $allPairs }, orderBy: timestamp, orderDirection: desc) {
      transaction {
        id
        timestamp
      }
      id
      pair {
        token0 {
          id
          symbol
        }
        token1 {
          id
          symbol
        }
      }
      amount0In
      amount0Out
      amount1In
      amount1Out
      amountUSD
      to
    }
  }
`

export const GLOBAL_DATA_TRADEGEN_LATEST = gql`
  query GlobalDataTradegenLatest($addressResolverAddress: ID!) {
    tradegens(where: { id: $addressResolverAddress }) {
      id
      totalVolumeUSD
      totalValueLockedUSD
      txCount
      poolCount
      NFTPoolCount
    }
  }
`

export const GLOBAL_DATA_TRADEGEN = gql`
  query GlobalDataTradegen($block: Int!, $addressResolverAddress: ID!) {
    tradegens(block: { number: $block }, where: { id: $addressResolverAddress }) {
      id
      totalVolumeUSD
      totalValueLockedUSD
      txCount
      poolCount
      NFTPoolCount
    }
  }
`

export const GLOBAL_CHART_TRADEGEN = gql`
  query TradegenDayDatas($startTime: Int!, $skip: Int!) {
    tradegenDayDatas(first: 1000, skip: $skip, where: { date_gt: $startTime }, orderBy: date, orderDirection: asc) {
      id
      date
      totalVolumeUSD
      dailyVolumeUSD
      totalValueLockedUSD
    }
  }
`

const PoolFields = gql`
  fragment PoolFields on Pool {
    id
    name
    manager
    performanceFee
    tokenPrice
    totalSupply
    tradeVolumeUSD
    totalValueLockedUSD
    positionAddresses
    positionBalances
  }
`

export const POOLS_CURRENT = gql`
  ${PoolFields}
  query PoolsCurrent {
    pools(first: 200, orderBy: totalValueLockedUSD, orderDirection: desc) {
      ...PoolFields
    }
  }
`

export const POOLS_DYNAMIC = gql`
  query PoolsDynamic($block: Int!) {
    pools(block: { number: $block }, first: 200, orderBy: totalValueLockedUSD, orderDirection: desc) {
      ...PoolFields
    }
  }
  ${PoolFields}
`

export const POOL_DATA_LATEST = gql`
  query PoolDataLatest($poolAddressID: ID!) {
    pools(where: { id: $poolAddressID }) {
      ...PoolFields
    }
  }
  ${PoolFields}
`

export const POOL_DATA = gql`
  query PoolData($block: Int, $poolAddressID: ID!) {
    pools(block: { number: $block }, where: { id: $poolAddressID }) {
      ...PoolFields
    }
  }
  ${PoolFields}
`

export const FILTERED_TRANSACTIONS_TRADEGEN = gql`
  query FilteredTransactionsTradegen($allPools: [String!]!, $allNFTPools: [String!]!) {
    depositPools(first: 20, where: { poolAddress_in: $allPools }, orderBy: timestamp, orderDirection: desc) {
      poolTransaction {
        id
        timestamp
        pool {
          name
        }
      }
      userAddress
      amount
    }
    withdrawPools(first: 20, where: { poolAddress_in: $allPools }, orderBy: timestamp, orderDirection: desc) {
      poolTransaction {
        id
        timestamp
        pool {
          name
          tokenPrice
        }
      }
      userAddress
      tokenAmount
      USDAmount
    }
    mintFeePools(first: 20, where: { poolAddress_in: $allPools }, orderBy: timestamp, orderDirection: desc) {
      poolTransaction {
        id
        timestamp
        pool {
          name
        }
      }
      managerAddress
      feesMinted
      tokenPrice
    }
    depositNFTPools(first: 20, where: { NFTPoolAddress_in: $allNFTPools }, orderBy: timestamp, orderDirection: desc) {
      NFTPoolTransaction {
        id
        timestamp
        NFTPool {
          name
        }
      }
      userAddress
      tokenAmount
      USDAmount
    }
    withdrawNFTPools(first: 20, where: { NFTPoolAddress_in: $allNFTPools }, orderBy: timestamp, orderDirection: desc) {
      NFTPoolTransaction {
        id
        timestamp
        NFTPool {
          name
          tokenPrice
        }
      }
      userAddress
      tokenAmount
      USDAmount
    }
  }
`

export const POOL_CHART = gql`
  query PoolDayDatas($poolAddress: String!, $skip: Int!) {
    poolDayDatas(first: 1000, skip: $skip, orderBy: date, orderDirection: asc, where: { pool: $poolAddress }) {
      id
      date
      priceUSD
      totalValueLockedUSD
      dailyVolumeUSD
      dailyTxns
      totalSupply
      pool {
        id
      }
    }
  }
`

export const NFT_POOL_CHART = gql`
  query NFTPoolDayDatas($NFTPoolAddress: String!, $skip: Int!) {
    nftpoolDayDatas(first: 1000, skip: $skip, orderBy: date, orderDirection: asc, where: { NFTPool: $NFTPoolAddress }) {
      id
      date
      priceUSD
      totalValueLockedUSD
      dailyVolumeUSD
      dailyTxns
      totalSupply
      NFTPool {
        id
      }
    }
  }
`

const NFTPoolFields = gql`
  fragment NFTPoolFields on NFTPool {
    id
    name
    manager
    maxSupply
    seedPrice
    tokenPrice
    totalSupply
    tradeVolumeUSD
    totalValueLockedUSD
    feesCollected
    positionAddresses
    positionBalances
  }
`

export const NFT_POOLS_CURRENT = gql`
  ${NFTPoolFields}
  query NFTPoolsCurrent {
    nftpools(first: 200, orderBy: totalValueLockedUSD, orderDirection: desc) {
      ...NFTPoolFields
    }
  }
`

export const NFT_POOLS_DYNAMIC = gql`
  query NFTPoolsDynamic($block: Int!) {
    nftpools(block: { number: $block }, first: 200, orderBy: totalValueLockedUSD, orderDirection: desc) {
      ...NFTPoolFields
    }
  }
  ${NFTPoolFields}
`

export const NFT_POOL_DATA_LATEST = gql`
  query NFTPoolDataLatest($NFTPoolAddressID: ID!) {
    nftpools(where: { id: $NFTPoolAddressID }) {
      ...NFTPoolFields
    }
  }
  ${NFTPoolFields}
`

export const NFT_POOL_DATA = gql`
  query NFTPoolData($block: Int, $NFTPoolAddressID: ID!) {
    nftpools(block: { number: $block }, where: { id: $NFTPoolAddressID }) {
      ...NFTPoolFields
    }
  }
  ${NFTPoolFields}
`

export const GLOBAL_TXNS_TRADEGEN = gql`
  query GlobalTransactionsTradegen {
    poolTransactions(first: 100, orderBy: timestamp, orderDirection: desc) {
      deposit {
        userAddress
        amount
        poolTransaction {
          id
          timestamp
          pool {
            name
          }
        }
      }
      withdraw {
        userAddress
        tokenAmount
        USDAmount
        poolTransaction {
          id
          timestamp
          pool {
            name
            tokenPrice
          }
        }
      }
      mintFee {
        managerAddress
        feesMinted
        tokenPrice
        poolTransaction {
          id
          timestamp
          pool {
            name
            tokenPrice
          }
        }
      }
    }
    nftpoolTransactions(first: 100, orderBy: timestamp, orderDirection: desc) {
      deposit {
        NFTPoolTransaction {
          id
          timestamp
          NFTPool {
            name
          }
        }
        userAddress
        tokenAmount
        USDAmount
      }
      withdraw {
        NFTPoolTransaction {
          id
          timestamp
          NFTPool {
            name
          }
        }
        userAddress
        tokenAmount
        USDAmount
      }
    }
  }
`

export const TOP_POSITIONS_PER_POOL = gql`
  query TopPositionsPerPool($poolAddress: String!) {
    poolPositions(where: { pool: $poolAddress }, orderBy: tokenBalance, orderDirection: desc, first: 10) {
      user {
        id
      }
      pool {
        id
        name
        tokenPrice
      }
      tokenBalance
    }
  }
`

export const TOP_POSITIONS_PER_NFT_POOL = gql`
  query TopPositionsPerNFTPool($NFTPoolAddress: String!) {
    nftpoolPositions(where: { NFTPool: $NFTPoolAddress }, orderBy: tokenBalance, orderDirection: desc, first: 10) {
      user {
        id
      }
      NFTPool {
        id
        name
        tokenPrice
      }
      tokenBalance
    }
  }
`

export const POOL_SEARCH = gql`
  query PoolSearch($value: String, $id: ID) {
    asName: pools(where: { name_contains: $value }, orderBy: totalValueLockedUSD, orderDirection: desc) {
      id
      name
      totalValueLockedUSD
    }
    asAddress: pools(where: { id: $id }, orderBy: totalValueLockedUSD, orderDirection: desc) {
      id
      name
      totalValueLockedUSD
    }
  }
`

export const NFT_POOL_SEARCH = gql`
  query NFTPoolSearch($value: String, $id: ID) {
    asName: nftpools(where: { name_contains: $value }, orderBy: totalValueLockedUSD, orderDirection: desc) {
      id
      name
      totalValueLockedUSD
    }
    asAddress: nftpools(where: { id: $id }, orderBy: totalValueLockedUSD, orderDirection: desc) {
      id
      name
      totalValueLockedUSD
    }
  }
`

export const ALL_POOLS = gql`
  query AllPools($skip: Int!) {
    pools(first: 500, skip: $skip) {
      id
      name
      totalValueLockedUSD
    }
  }
`

export const ALL_NFT_POOLS = gql`
  query AllNFTPools($skip: Int!) {
    nftpools(first: 500, skip: $skip) {
      id
      name
      totalValueLockedUSD
    }
  }
`

export const USER_TRANSACTIONS_TRADEGEN = gql`
  query UserTransactionsTradegen($user: String) {
    depositPools(first: 20, where: { userAddress: $user }, orderBy: timestamp, orderDirection: desc) {
      poolTransaction {
        id
        timestamp
        pool {
          name
        }
      }
      userAddress
      amount
    }
    withdrawPools(first: 20, where: { userAddress: $user }, orderBy: timestamp, orderDirection: desc) {
      poolTransaction {
        id
        timestamp
        pool {
          name
          tokenPrice
        }
      }
      userAddress
      tokenAmount
      USDAmount
    }
    mintFeePools(first: 20, where: { managerAddress: $user }, orderBy: timestamp, orderDirection: desc) {
      poolTransaction {
        id
        timestamp
        pool {
          name
        }
      }
      managerAddress
      feesMinted
      tokenPrice
    }
    depositNFTPools(first: 20, where: { userAddress: $user }, orderBy: timestamp, orderDirection: desc) {
      NFTPoolTransaction {
        id
        timestamp
        NFTPool {
          name
        }
      }
      userAddress
      tokenAmount
      USDAmount
    }
    withdrawNFTPools(first: 20, where: { userAddress: $user }, orderBy: timestamp, orderDirection: desc) {
      NFTPoolTransaction {
        id
        timestamp
        NFTPool {
          name
          tokenPrice
        }
      }
      userAddress
      tokenAmount
      USDAmount
    }
  }
`

export const USER_POSITIONS_TRADEGEN = gql`
  query investmentPositions($user: String!) {
    poolPositions(where: { user: $user }) {
      pool {
        id
        name
      }
      USDValue
    }
    nftpoolPositions(where: { user: $user }) {
      NFTPool {
        id
        name
      }
      USDValue
    }
  }
`

export const MANAGED_INVESTMENTS = gql`
  query managedInvestments($manager: String!) {
    managedInvestments(where: { manager: $manager }) {
      pool {
        id
        name
        totalValueLockedUSD
      }
      NFTPool {
        id
        name
        totalValueLockedUSD
      }
    }
  }
`

export const PRICES_BY_BLOCK_TOKEN = (
  tokenAddress: string,
  blocks: readonly { timestamp: number; number: number }[]
): DocumentNode => {
  let queryString = 'query pricesByBlockToken {'
  queryString += blocks.map(
    (block) => `
      t${block.timestamp}:token(id:"${tokenAddress}", block: { number: ${block.number} }, subgraphError: allow) { 
        derivedCUSD
      }
    `
  )
  queryString += ','
  queryString += blocks.map(
    (block) => `
      b${block.timestamp}: bundle(id:"1", block: { number: ${block.number} }, subgraphError: allow) { 
        celoPrice
      }
    `
  )

  queryString += '}'
  return gql(queryString)
}

export const PRICES_BY_BLOCK_MULTIPLE_TOKENS = (
  tokenAddresses: string[],
  blocks: readonly { timestamp: number; number: number }[]
): DocumentNode => {
  let queryString = 'query pricesByBlockToken {'
  for (let i = 0; i < tokenAddresses.length; i++) {
    queryString += blocks.map(
      (block) =>
        `
        t${block.timestamp}t${tokenAddresses[i]}:token(id:"${tokenAddresses[i]}", block: { number: ${block.number} }, subgraphError: allow) { 
          derivedCUSD
        }
      `
    )
  }
  queryString += ','
  queryString += blocks.map(
    (block) => `
      b${block.timestamp}: bundle(id:"1", block: { number: ${block.number} }, subgraphError: allow) { 
        celoPrice
      }
    `
  )

  queryString += '}'
  return gql(queryString)
}