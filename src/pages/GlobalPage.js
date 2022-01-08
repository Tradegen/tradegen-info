import { transparentize } from 'polished'
import React, { useEffect } from 'react'
import { withRouter } from 'react-router-dom'
import { useMedia } from 'react-use'
import { Box } from 'rebass'
import styled from 'styled-components'

import { ContentWrapper, PageWrapper } from '../components'
import { AutoColumn } from '../components/Column'
import GlobalChart from '../components/GlobalChart'
import GlobalStats from '../components/GlobalStats'
import { CustomLink } from '../components/Link'
import Panel from '../components/Panel'
import { AutoRow, RowBetween } from '../components/Row'
import Search from '../components/Search'
import TopPoolList from '../components/PoolList'
import TopNFTPoolList from '../components/NFTPoolList'
import TxnList from '../components/TxnList'
import { useGlobalData, useGlobalTransactionsTradegen } from '../contexts/GlobalData'
import { useAllPoolData } from '../contexts/PoolData'
import { useAllNFTPoolData } from '../contexts/NFTPoolData'
import { ThemedBackground, TYPE } from '../Theme'
import { formattedNum, formattedPercent } from '../utils'
import { toBigDecimal } from '../utils/typeAssertions'

const ListOptions = styled(AutoRow)`
  height: 40px;
  width: 100%;
  font-size: 1.25rem;
  font-weight: 600;

  @media screen and (max-width: 640px) {
    font-size: 1rem;
  }
`

const GridRow = styled.div`
  display: grid;
  width: 100%;
  grid-template-columns: 1fr 1fr;
  column-gap: 6px;
  align-items: start;
  justify-content: space-between;
`

function GlobalPage() {
  // get data for lists and totals
  const allPools = useAllPoolData()
  const allNFTPools = useAllNFTPoolData()
  const { totalValueLockedUSD, oneDayVolumeUSD, volumeChangeUSD, totalValueLockedChangeUSD } = useGlobalData()
  const transactionsTradegen = useGlobalTransactionsTradegen()

  console.log(totalValueLockedUSD)
  console.log(oneDayVolumeUSD)

  // breakpoints
  const below800 = useMedia('(max-width: 800px)')

  // scrolling refs
  useEffect(() => {
    document.querySelector('body').scrollTo({
      behavior: 'smooth',
      top: 0,
    })
  }, [])

  return (
    <PageWrapper>
      <ThemedBackground
        backgroundColor={transparentize(0.6, '#5271FF')}
        endColor={transparentize(1, '#212429')}
      />
      <ContentWrapper>
        <div>
          <AutoColumn gap="24px" style={{ paddingBottom: below800 ? '0' : '24px' }}>
            <TYPE.largeHeader>Tradegen Analytics</TYPE.largeHeader>
            <Search />
            <GlobalStats />
          </AutoColumn>
          {below800 && ( // mobile card
            <Box mb={20}>
              <Panel>
                <Box>
                  <AutoColumn gap="36px">
                    <AutoColumn gap="20px">
                      <RowBetween>
                        <TYPE.main>Volume (24hrs)</TYPE.main>
                        <div />
                      </RowBetween>
                      <RowBetween align="flex-end">
                        <TYPE.main fontSize={'1.5rem'} lineHeight={1} fontWeight={600}>
                          {(oneDayVolumeUSD || oneDayVolumeUSD == 0) ? formattedNum(oneDayVolumeUSD, true) : '-'}
                        </TYPE.main>
                        <TYPE.main fontSize={12}>{volumeChangeUSD ? formattedPercent(volumeChangeUSD) : '-'}</TYPE.main>
                      </RowBetween>
                    </AutoColumn>
                    <AutoColumn gap="20px">
                      <RowBetween>
                        <TYPE.main>Total Value Locked</TYPE.main>
                        <div />
                      </RowBetween>
                      <RowBetween align="flex-end">
                        <TYPE.main fontSize={'1.5rem'} lineHeight={1} fontWeight={600}>
                          {totalValueLockedUSD ? formattedNum(totalValueLockedUSD / toBigDecimal("1e18"), true) : '-'}
                        </TYPE.main>
                        <TYPE.main fontSize={12}>
                          {totalValueLockedChangeUSD ? formattedPercent(totalValueLockedChangeUSD) : '-'}
                        </TYPE.main>
                      </RowBetween>
                    </AutoColumn>
                  </AutoColumn>
                </Box>
              </Panel>
            </Box>
          )}
          {!below800 && (
            <GridRow>
              <Panel style={{ height: '100%', minHeight: '300px' }}>
                <GlobalChart display="liquidity" />
              </Panel>
              <Panel style={{ height: '100%' }}>
                <GlobalChart display="volume" />
              </Panel>
            </GridRow>
          )}
          {below800 && (
            <AutoColumn style={{ marginTop: '6px' }} gap="24px">
              <Panel style={{ height: '100%', minHeight: '300px' }}>
                <GlobalChart display="liquidity" />
              </Panel>
            </AutoColumn>
          )}
          <ListOptions gap="10px" style={{ marginTop: '2rem', marginBottom: '.5rem' }}>
            <RowBetween>
              <TYPE.main fontSize={'1.125rem'}>Top Pools</TYPE.main>
              <CustomLink to={'/tokens'}>See All</CustomLink>
            </RowBetween>
          </ListOptions>
          <Panel style={{ marginTop: '6px', padding: '1.125rem 0 ' }}>
            <TopPoolList pools={allPools} />
          </Panel>
          <ListOptions gap="10px" style={{ marginTop: '2rem', marginBottom: '.5rem' }}>
            <RowBetween>
              <TYPE.main fontSize={'1rem'}>Top NFT Pools</TYPE.main>
              <CustomLink to={'/pairs'}>See All</CustomLink>
            </RowBetween>
          </ListOptions>
          <Panel style={{ marginTop: '6px', padding: '1.125rem 0 ' }}>
            <TopNFTPoolList NFTPools={allNFTPools} useTracked={true} />
          </Panel>
          <span>
            <TYPE.main fontSize={'1.125rem'} style={{ marginTop: '2rem' }}>
              Transactions
            </TYPE.main>
          </span>
          <Panel style={{ margin: '1rem 0' }}>
            <TxnList transactions={transactionsTradegen} />
          </Panel>
        </div>
      </ContentWrapper>
    </PageWrapper>
  )
}

export default withRouter(GlobalPage)
