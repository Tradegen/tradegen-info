import 'feather-icons'

import { transparentize } from 'polished'
import React, { useEffect, useState } from 'react'
import { Bookmark, PlusCircle } from 'react-feather'
import { withRouter } from 'react-router-dom'
import { useMedia } from 'react-use'
import { Text } from 'rebass'
import styled from 'styled-components'

import { ContentWrapper, Hover, PageWrapper, StyledIcon } from '../components'
import { ButtonDark, ButtonLight } from '../components/ButtonStyled'
import Column, { AutoColumn } from '../components/Column'
import CopyHelper from '../components/Copy'
import FormattedName from '../components/FormattedName'
import Link, { BasicLink } from '../components/Link'
import Loader from '../components/LocalLoader'
import Panel from '../components/Panel'
import { AutoRow, RowBetween, RowFixed } from '../components/Row'
import Search from '../components/Search'
import NFTPoolChart from '../components/NFTPoolChart'
import TxnList from '../components/TxnList'
import { useNFTPoolData, useNFTPoolTransactions } from '../contexts/NFTPoolData'
import { ThemedBackground, TYPE } from '../Theme'
import { formattedNum, formattedPercent, calculateTVL, calculatePreviousDayTVL } from '../utils'
import { useSavedNFTPools } from '../contexts/LocalStorage'
import InvestmentPositionsList from '../components/InvestmentPositionsList'
import { useAllTokenData } from '../contexts/TokenData'

const DashboardWrapper = styled.div`
  width: 100%;
`

const PanelWrapper = styled.div`
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: max-content;
  gap: 6px;
  display: inline-grid;
  width: 100%;
  align-items: start;
  @media screen and (max-width: 1024px) {
    grid-template-columns: 1fr;
    align-items: stretch;
    > * {
      /* grid-column: 1 / 4; */
    }

    > * {
      &:first-child {
        width: 100%;
      }
    }
  }
`

const TokenDetailsLayout = styled.div`
  display: inline-grid;
  width: 100%;
  grid-template-columns: auto auto auto 1fr;
  column-gap: 30px;
  align-items: start;

  &:last-child {
    align-items: center;
    justify-items: end;
  }
  @media screen and (max-width: 1024px) {
    grid-template-columns: 1fr;
    align-items: stretch;
    > * {
      /* grid-column: 1 / 4; */
      margin-bottom: 1rem;
    }

    &:last-child {
      align-items: start;
      justify-items: start;
    }
  }
`

const WarningGrouping = styled.div`
  opacity: ${({ disabled }) => disabled && '0.4'};
  pointer-events: ${({ disabled }) => disabled && 'none'};
`

function NFTPoolPage({ address, history }) {
    const {
        id,
        name,
        manager,
        maxSupply,
        tokenPrice,
        totalSupply,
        positionAddresses,
        positionBalances,
        oneDayVolumeUSD,
        totalValueLockedUSD,
        volumeChangeUSD,
        priceChangeUSD,
        totalValueLockedChangeUSD,
        oneDayData
    } = useNFTPoolData(address)

    useEffect(() => {
        document.querySelector('body').scrollTo(0, 0)
    }, [])

    const allTokens = useAllTokenData();
    let currentTVL = calculateTVL(allTokens, positionAddresses, positionBalances)
    let previousTVL = calculatePreviousDayTVL(allTokens, oneDayData.positionAddresses, oneDayData.positionBalances)
    let currentPrice = BigInt(currentTVL) * BigInt(1e18) / BigInt(totalSupply);
    let previousPrice = BigInt(previousTVL) * BigInt(1e18) / BigInt(oneDayData.totalSupply)
    console.log(currentPrice)

    let priceChange = 100 * (Number(currentPrice.toString()) - Number(previousPrice.toString())) / Number(previousPrice.toString())
    console.log(priceChange)

    let TVLChange = 100 * (Number(currentTVL.toString()) - Number(previousTVL.toString())) / Number(previousTVL.toString())
    console.log(TVLChange)

    // detect color from token
    const backgroundColor = '#5271FF'

    // all transactions with this NFT pool
    const transactions = useNFTPoolTransactions(address)

    // volume
    const volume = formattedNum(!!oneDayVolumeUSD ? oneDayVolumeUSD : 0, true)
    const volumeChange = formattedPercent(volumeChangeUSD)

    const below1080 = useMedia('(max-width: 1080px)')
    const below800 = useMedia('(max-width: 800px)')
    const below600 = useMedia('(max-width: 600px)')
    const below500 = useMedia('(max-width: 500px)')

    const [savedNFTPools, addNFTPool] = useSavedNFTPools()

    useEffect(() => {
        window.scrollTo({
            behavior: 'smooth',
            top: 0,
        })
    }, [])

    return (
        <PageWrapper>
            <ThemedBackground backgroundColor={transparentize(0.6, backgroundColor)} />
            <ContentWrapper>
                <RowBetween style={{ flexWrap: 'wrap', alingItems: 'start' }}>
                    <AutoRow align="flex-end" style={{ width: 'fit-content' }}>
                        <TYPE.body>
                            <BasicLink to="/nftpools">{'NFT Pools '}</BasicLink>→ {name}
                        </TYPE.body>
                        <Link
                            style={{ width: 'fit-content' }}
                            color={backgroundColor}
                            external
                            href={'https://explorer.celo.org/address/' + address}
                        >
                            <Text style={{ marginLeft: '.15rem' }} fontSize={'14px'} fontWeight={400}>
                                ({address.slice(0, 8) + '...' + address.slice(36, 42)})
                            </Text>
                        </Link>
                    </AutoRow>
                    {!below600 && <Search small={true} />}
                </RowBetween>
                <WarningGrouping disabled={false}>
                    <DashboardWrapper style={{ marginTop: below1080 ? '0' : '1rem' }}>
                        <RowBetween
                            style={{
                                flexWrap: 'wrap',
                                marginBottom: '2rem',
                                alignItems: 'flex-start',
                            }}
                        >
                            <RowFixed style={{ flexWrap: 'wrap' }}>
                                <RowFixed style={{ alignItems: 'baseline' }}>
                                    <TYPE.main fontSize={below1080 ? '1.5rem' : '2rem'} fontWeight={500} style={{ marginRight: '1rem' }}>
                                        <RowFixed gap="6px">
                                            <FormattedName text={name} />{' '}
                                        </RowFixed>
                                    </TYPE.main>{' '}
                                    {!below1080 && (
                                        <>
                                            <TYPE.main fontSize={'1.5rem'} fontWeight={500} style={{ marginRight: '1rem' }}>
                                                {formattedNum(Number(currentPrice.toString()) / 1e36, true)}
                                            </TYPE.main>
                                            {formattedPercent(priceChange)}
                                        </>
                                    )}
                                </RowFixed>
                            </RowFixed>
                            <span>
                                <RowFixed ml={below500 ? '0' : '2.5rem'} mt={below500 ? '1rem' : '0'}>
                                    {!!!savedNFTPools[address] && !below800 ? (
                                        <Hover onClick={() => addNFTPool(address, name)}>
                                            <StyledIcon>
                                                <PlusCircle style={{ marginRight: '0.5rem' }} />
                                            </StyledIcon>
                                        </Hover>
                                    ) : !below1080 ? (
                                        <StyledIcon>
                                            <Bookmark style={{ marginRight: '0.5rem', opacity: 0.4 }} />
                                        </StyledIcon>
                                    ) : (
                                        <></>
                                    )}
                                    <Link href={"https://app.tradegen.io/#/nftpool/" + address} target="_blank">
                                        <ButtonDark ml={'.5rem'} mr={below1080 && '.5rem'} color={backgroundColor}>
                                            Trade
                                        </ButtonDark>
                                    </Link>
                                </RowFixed>
                            </span>
                        </RowBetween>

                        <>
                            {!below1080 && (
                                <RowFixed>
                                    <TYPE.main fontSize={'1.125rem'} mr="6px">
                                        NFT Pool Stats
                                    </TYPE.main>
                                </RowFixed>
                            )}
                            <PanelWrapper style={{ marginTop: below1080 ? '0' : '1rem' }}>
                                {below1080 && currentPrice && (
                                    <Panel>
                                        <AutoColumn gap="20px">
                                            <RowBetween>
                                                <TYPE.main>Price</TYPE.main>
                                                <div />
                                            </RowBetween>
                                            <RowBetween align="flex-end">
                                                {' '}
                                                <TYPE.main fontSize={'1.5rem'} lineHeight={1} fontWeight={500}>
                                                    {formattedNum(Number(currentPrice.toString()) / 1e36, true)}
                                                </TYPE.main>
                                                <TYPE.main>{formattedPercent(priceChange)}</TYPE.main>
                                            </RowBetween>
                                        </AutoColumn>
                                    </Panel>
                                )}
                                <Panel>
                                    <AutoColumn gap="20px">
                                        <RowBetween>
                                            <TYPE.main>Total Value Locked</TYPE.main>
                                            <div />
                                        </RowBetween>
                                        <RowBetween align="flex-end">
                                            <TYPE.main fontSize={'1.5rem'} lineHeight={1} fontWeight={500}>
                                                {formattedNum(Number(currentTVL.toString()) / 1e18, true)}
                                            </TYPE.main>
                                            <TYPE.main>{formattedPercent(TVLChange)}</TYPE.main>
                                        </RowBetween>
                                    </AutoColumn>
                                </Panel>
                                <Panel>
                                    <AutoColumn gap="20px">
                                        <RowBetween>
                                            <TYPE.main>Volume (24hrs)</TYPE.main>
                                            <div />
                                        </RowBetween>
                                        <RowBetween align="flex-end">
                                            <TYPE.main fontSize={'1.5rem'} lineHeight={1} fontWeight={500}>
                                                {volume}
                                            </TYPE.main>
                                            <TYPE.main>{volumeChange}</TYPE.main>
                                        </RowBetween>
                                    </AutoColumn>
                                </Panel>

                                <Panel>
                                    <AutoColumn gap="20px">
                                        <RowBetween>
                                            <TYPE.main>Max Supply</TYPE.main>
                                            <div />
                                        </RowBetween>
                                        <RowBetween align="flex-end">
                                            <TYPE.main fontSize={'1.5rem'} lineHeight={1} fontWeight={500}>
                                                {maxSupply} tokens
                                            </TYPE.main>
                                        </RowBetween>
                                    </AutoColumn>
                                </Panel>
                                <Panel
                                    style={{
                                        gridColumn: below1080 ? '1' : '2/4',
                                        gridRow: below1080 ? '' : '1/4',
                                    }}
                                >
                                    <NFTPoolChart address={address} color={backgroundColor} base={Number(currentPrice.toString()) / 1e36} />
                                </Panel>
                            </PanelWrapper>
                        </>

                        <RowBetween mt={40} mb={'1rem'}>
                            <TYPE.main fontSize={'1.125rem'}>Positions</TYPE.main> <div />
                        </RowBetween>
                        <Panel rounded>
                            {positionAddresses ? <InvestmentPositionsList color={backgroundColor} positions={positionAddresses} balances={positionBalances} /> : <Loader />}
                        </Panel>

                        <RowBetween mt={40} mb={'1rem'}>
                            <TYPE.main fontSize={'1.125rem'}>Transactions</TYPE.main> <div />
                        </RowBetween>
                        <Panel rounded>
                            {transactions ? <TxnList color={backgroundColor} transactions={transactions} /> : <Loader />}
                        </Panel>
                        <>
                            <RowBetween style={{ marginTop: '3rem' }}>
                                <TYPE.main fontSize={'1.125rem'}>NFT Pool Information</TYPE.main>{' '}
                            </RowBetween>
                            <Panel
                                rounded
                                style={{
                                    marginTop: '1.5rem',
                                }}
                                p={20}
                            >
                                <TokenDetailsLayout>
                                    <Column>
                                        <TYPE.main>Name</TYPE.main>
                                        <TYPE.main style={{ marginTop: '.5rem' }} fontSize={24} fontWeight="500">
                                            <FormattedName text={name} maxCharacters={18} />
                                        </TYPE.main>
                                    </Column>
                                    <Column>
                                        <TYPE.main>Manager</TYPE.main>
                                        <AutoRow align="flex-end">
                                            <TYPE.main style={{ marginTop: '.5rem' }} fontSize={24} fontWeight="500">
                                                {manager.slice(0, 8) + '...' + manager.slice(36, 42)}
                                            </TYPE.main>
                                            <CopyHelper toCopy={manager} />
                                        </AutoRow>
                                    </Column>
                                    <Column>
                                        <TYPE.main>Address</TYPE.main>
                                        <AutoRow align="flex-end">
                                            <TYPE.main style={{ marginTop: '.5rem' }} fontSize={24} fontWeight="500">
                                                {address.slice(0, 8) + '...' + address.slice(36, 42)}
                                            </TYPE.main>
                                            <CopyHelper toCopy={address} />
                                        </AutoRow>
                                    </Column>
                                    <ButtonLight color={backgroundColor}>
                                        <Link color={backgroundColor} external href={`https://explorer.celo.org/address/${address}`}>
                                            View on Celo Explorer ↗
                                        </Link>
                                    </ButtonLight>
                                </TokenDetailsLayout>
                            </Panel>
                        </>
                    </DashboardWrapper>
                </WarningGrouping>
            </ContentWrapper>
        </PageWrapper>
    )
}

export default withRouter(NFTPoolPage)
