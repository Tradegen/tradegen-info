import React from 'react'
import { useMedia } from 'react-use'
import styled from 'styled-components'

import { useCeloPrice, useGlobalData } from '../../contexts/GlobalData'
import { TYPE } from '../../Theme'
import { formattedNum, localNumber } from '../../utils'
import { RowBetween, RowFixed } from '../Row'

const Header = styled.div`
  width: 100%;
  position: sticky;
  top: 0;
`

const Medium = styled.span`
  font-weight: 500;
`

export default function GlobalStats() {
  const below1180 = useMedia('(max-width: 1180px)')
  const below1024 = useMedia('(max-width: 1024px)')
  const below400 = useMedia('(max-width: 400px)')
  const below816 = useMedia('(max-width: 816px)')

  const { oneDayVolumeUSD, oneDayTxns, poolCount, NFTPoolCount } = useGlobalData()
  const [celoPrice] = useCeloPrice()
  const formattedCeloPrice = celoPrice ? formattedNum(celoPrice, true) : '-'

  return (
    <Header>
      <RowBetween style={{ padding: below816 ? '0.5rem' : '.5rem' }}>
        <RowFixed>
          {!below400 && (
            <TYPE.main mr={'1rem'} style={{ position: 'relative' }}>
              CELO Price: <Medium>{formattedCeloPrice}</Medium>
            </TYPE.main>
          )}

          {!below1180 && (
            <TYPE.main mr={'1rem'}>
              Transactions (24H): <Medium>{localNumber(oneDayTxns)}</Medium>
            </TYPE.main>
          )}
          {!below1024 && (
            <TYPE.main mr={'1rem'}>
              Pools: <Medium>{localNumber(poolCount)}</Medium>
            </TYPE.main>
          )}
          {!below1024 && (
            <TYPE.main mr={'1rem'}>
              NFT Pools: <Medium>{localNumber(NFTPoolCount)}</Medium>
            </TYPE.main>
          )}
        </RowFixed>
      </RowBetween>
    </Header>
  )
}
