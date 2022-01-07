import UbeswapDefaultTokenList from '@ubeswap/default-token-list'
import UbeswapExperimentalTokenList from '@ubeswap/default-token-list/ubeswap-experimental.token-list.json'
import { TokenInfo } from '@uniswap/token-lists'
import { keyBy } from 'lodash'

export const ALL_MAINNET_TOKENS = [UbeswapDefaultTokenList, UbeswapExperimentalTokenList].flatMap((list) =>
  list.tokens.filter((tok) => tok.chainId === 42220)
)

export const ALL_MAINNET_TOKENS_MAP: Record<string, TokenInfo> = keyBy(ALL_MAINNET_TOKENS, (tok) => tok.address)

export const FACTORY_ADDRESS = '0x62d5b84bE28a183aBB507E125B384122D2C25fAE' //Ubeswap
export const ADDRESS_RESOLVER_ADDRESS = '0xd35dFfdd8E4C6e9F096a44b86f339e9066F9D357' //Tradegen address resolver contract

export const BUNDLE_ID = '1'

export const timeframeOptions = {
  WEEK: '1 week',
  MONTH: '1 month',
  // THREE_MONTHS: '3 months',
  // YEAR: '1 year',
  ALL_TIME: 'All time',
}

// token list urls to fetch tokens from - use for warnings on tokens and pairs
export const SUPPORTED_LIST_URLS__NO_ENS = [
  'https://raw.githubusercontent.com/Ubeswap/default-token-list/master/ubeswap.token-list.json',
  'https://raw.githubusercontent.com/Ubeswap/default-token-list/master/ubeswap-experimental.token-list.json',
]

// hide from overview list
export const TOKEN_BLACKLIST = [
  '0x495c7f3a713870f68f8b418b355c085dfdc412c3',
  '0xc3761eb917cd790b30dad99f6cc5b4ff93c4f9ea',
  '0xe31debd7abff90b06bca21010dd860d8701fd901',
  '0xfc989fbb6b3024de5ca0144dc23c18a063942ac1',
  '0xf4eda77f0b455a12f3eb44f8653835f377e36b76',
  '0x93b2fff814fcaeffb01406e80b4ecd89ca6a021b',

  // rebass tokens
  '0x9ea3b5b4ec044b70375236a281986106457b20ef',
  '0x05934eba98486693aaec2d00b0e9ce918e37dc3f',
  '0x3d7e683fc9c86b4d653c9e47ca12517440fad14e',
  '0xfae9c647ad7d89e738aba720acf09af93dc535f7',
  '0x7296368fe9bcb25d3ecc19af13655b907818cc09',
]

// pair blacklist
export const PAIR_BLACKLIST = [
  '0xb6a741f37d6e455ebcc9f17e2c16d0586c3f57a5',
  '0x97cb8cbe91227ba87fc21aaf52c4212d245da3f8',
  '0x1acba73121d5f63d8ea40bdc64edb594bd88ed09',
  '0x7d7e813082ef6c143277c71786e5be626ec77b20',
]

// warnings to display if page contains info about blocked token
export const BLOCKED_WARNINGS = {
  '0xf4eda77f0b455a12f3eb44f8653835f377e36b76':
    'TikTok Inc. has asserted this token is violating its trademarks and therefore is not available.',
}

/**
 * For tokens that cause erros on fee calculations
 */
export const FEE_WARNING_TOKENS = ['0xd46ba6d942050d489dbd938a2c909a5d5039a161']

export const UNTRACKED_COPY = 'Derived USD values may be inaccurate without liquid stablecoin or ETH pairings.'

export const mcUSD = "0x918146359264C492BD6934071c6Bd31C854EDBc3"
export const WETH = "0xE919F65739c26a42616b7b8eedC6b5524d1e3aC4"
export const cMCO2 = "0x32A9FE697a32135BFd313a6Ac28792DaE4D9979d"
export const MOO = "0x17700282592D6917F6A73D0bF8AcCf4D578c131e"
export const SOL = "0x173234922eB27d5138c5e481be9dF5261fAeD450"
export const UBE = "0x00Be915B9dCf56a3CBE739D9B9c202ca692409EC"
export const CELO = "0x471EcE3750Da237f93B8E339c536989b8978a438"
export const POOF = "0x00400FcbF0816bebB94654259de7273f4A05c762"

export const SUPPORTED_TOKENS = [
  mcUSD,
  WETH,
  cMCO2,
  MOO,
  SOL,
  UBE,
  CELO,
  POOF
]