import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import React, { useEffect, useMemo, useState } from 'react'
import { withRouter } from 'react-router-dom'
import { useMedia } from 'react-use'
import { Box, Flex, Text } from 'rebass'
import styled from 'styled-components'
import { useAllTokenData } from '../../contexts/TokenData'

import { TYPE } from '../../Theme'
import { formattedNum, formattedPercent, calculateTVL, calculatePreviousDayTVL } from '../../utils'
import { Divider } from '..'
import FormattedName from '../FormattedName'
import { CustomLink } from '../Link'
import Row from '../Row'

dayjs.extend(utc)

const PageButtons = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 2em;
  margin-bottom: 2em;
`

const Arrow = styled.div`
  color: ${({ theme }) => theme.primary1};
  opacity: ${(props) => (props.faded ? 0.3 : 1)};
  padding: 0 20px;
  user-select: none;
  :hover {
    cursor: pointer;
  }
`

const List = styled(Box)`
  -webkit-overflow-scrolling: touch;
`

const DashGrid = styled.div`
  display: grid;
  grid-gap: 1em;
  grid-template-columns: 100px 1fr 1fr;
  grid-template-areas: 'name liq vol';
  padding: 0 1.125rem;

  > * {
    justify-content: flex-end;

    &:first-child {
      justify-content: flex-start;
      text-align: left;
      width: 100px;
    }
  }

  @media screen and (min-width: 680px) {
    display: grid;
    grid-gap: 1em;
    grid-template-columns: 180px 1fr 1fr 1fr;
    grid-template-areas: 'name symbol liq vol ';

    > * {
      justify-content: flex-end;
      width: 100%;

      &:first-child {
        justify-content: flex-start;
      }
    }
  }

  @media screen and (min-width: 1080px) {
    display: grid;
    grid-gap: 0.5em;
    grid-template-columns: 1.5fr 0.6fr 1fr 1fr 1fr 1fr;
    grid-template-areas: 'name symbol liq vol price change';
  }
`

const ListWrapper = styled.div``

const ClickableText = styled(Text)`
  text-align: end;
  &:hover {
    cursor: pointer;
    opacity: 0.6;
  }
  user-select: none;
  color: ${({ theme }) => theme.text1} !important;
  @media screen and (max-width: 640px) {
    font-size: 0.85rem;
  }
`

const DataText = styled(Flex)`
  align-items: center;
  text-align: center;
  color: ${({ theme }) => theme.text1} !important;

  & > * {
    font-size: 14px;
  }

  @media screen and (max-width: 600px) {
    font-size: 12px;
  }
`

const SORT_FIELD = {
    TVL: 'totalValueLockedUSD',
    NAME: 'name',
    PRICE: 'priceUSD',
    CHANGE: 'priceChangeUSD',
    CAP: 'maxSupply',
    ROI: 'totalReturn'
}

// @TODO rework into virtualized list
function TopNFTPoolList({ NFTPools, itemMax = 10, useTracked = false }) {
    // page state
    const [page, setPage] = useState(1)
    const [maxPage, setMaxPage] = useState(1)

    const allTokens = useAllTokenData();

    // sorting
    const [sortDirection, setSortDirection] = useState(true)
    const [sortedColumn, setSortedColumn] = useState(SORT_FIELD.TVL)

    const below1080 = useMedia('(max-width: 1080px)')
    const below680 = useMedia('(max-width: 680px)')
    const below600 = useMedia('(max-width: 600px)')

    useEffect(() => {
        setMaxPage(1) // edit this to do modular
        setPage(1)
    }, [NFTPools])

    const formattedNFTPools = useMemo(() => {
        return (
            NFTPools &&
            Object.keys(NFTPools)
                .map((key) => NFTPools[key])
                .filter((NFTPool) => NFTPool.totalValueLockedUSD > 0)
        )
    }, [NFTPools])

    const filteredList = useMemo(() => {
        return (
            formattedNFTPools &&
            formattedNFTPools
                .sort((a, b) => {
                    if (sortedColumn === SORT_FIELD.NAME) {
                        return a[sortedColumn] > b[sortedColumn] ? (sortDirection ? -1 : 1) * 1 : (sortDirection ? -1 : 1) * -1
                    }
                    return parseFloat(a[sortedColumn]) > parseFloat(b[sortedColumn])
                        ? (sortDirection ? -1 : 1) * 1
                        : (sortDirection ? -1 : 1) * -1
                })
                .slice(itemMax * (page - 1), page * itemMax)
        )
    }, [formattedNFTPools, itemMax, page, sortDirection, sortedColumn])

    useEffect(() => {
        if (NFTPools && formattedNFTPools) {
            let extraPages = 1
            if (formattedNFTPools.length % itemMax === 0) {
                extraPages = 0
            }
            setMaxPage(Math.floor(formattedNFTPools.length / itemMax) + extraPages)
        }
    }, [NFTPools, formattedNFTPools, itemMax])

    const ListItem = ({ item, index }) => {
        let currentTVL = calculateTVL(allTokens, item.positionAddresses, item.positionBalances)
        let previousTVL = calculatePreviousDayTVL(allTokens, item.oneDayData.positionAddresses, item.oneDayData.positionBalances)
        console.log(item)
        let currentPrice = BigInt(currentTVL) / BigInt(item.totalSupply);
        let previousPrice = BigInt(previousTVL) / BigInt(item.oneDayData.totalSupply)
        console.log(currentPrice)

        let priceChange = 100 * (Number(currentPrice.toString()) - Number(previousPrice.toString())) / Number(previousPrice.toString())
        console.log(priceChange)

        let totalReturn;
        if (!item || !item.tokenPrice) {
            totalReturn = 0;
        }
        else {
            totalReturn = 100 * (Number(currentPrice) - 1e18) / 1e18
        }

        return (
            <DashGrid style={{ height: '48px' }} focus={true}>
                <DataText area="name" fontWeight="500">
                    <Row>
                        {!below680 && <div style={{ marginRight: '1rem', width: '10px' }}>{index}</div>}
                        <CustomLink style={{ marginLeft: '16px', whiteSpace: 'nowrap' }} to={'/nftpool/' + item.id}>
                            <FormattedName
                                text={item.name}
                                maxCharacters={below600 ? 8 : 19}
                                adjustSize={true}
                                link={true}
                            />
                        </CustomLink>
                    </Row>
                </DataText>
                {!below1080 && (
                    <DataText area="tvl">{formattedNum(currentTVL / 1e18, true)}</DataText>
                )}
                {!below1080 && (
                    <DataText area="cap">{item.maxSupply.toString()} tokens</DataText>
                )}
                <DataText area="price" color="text" fontWeight="500">
                    {formattedNum(Number(currentPrice.toString()) / 1e18, true)}
                </DataText>
                {!below1080 && <DataText area="change">{formattedPercent(priceChange)}</DataText>}
                <DataText area="roi">{formattedPercent(totalReturn)}</DataText>
            </DashGrid>
        )
    }

    return (
        <ListWrapper>
            <DashGrid center={true} style={{ height: 'fit-content', padding: '0 1.125rem 1rem 1.125rem' }}>
                <Flex alignItems="center" justifyContent="flexStart">
                    <ClickableText
                        color="text"
                        area="name"
                        fontWeight="500"
                        onClick={(e) => {
                            setSortedColumn(SORT_FIELD.NAME)
                            setSortDirection(sortedColumn !== SORT_FIELD.NAME ? true : !sortDirection)
                        }}
                    >
                        {below680 ? 'Symbol' : 'Name'} {sortedColumn === SORT_FIELD.NAME ? (!sortDirection ? '↑' : '↓') : ''}
                    </ClickableText>
                </Flex>
                {!below1080 && (
                    <Flex alignItems="center">
                        <ClickableText
                            area="tvl"
                            onClick={(e) => {
                                setSortedColumn(SORT_FIELD.TVL)
                                setSortDirection(sortedColumn !== SORT_FIELD.TVL ? true : !sortDirection)
                            }}
                        >
                            TVL {sortedColumn === SORT_FIELD.TVL ? (!sortDirection ? '↑' : '↓') : ''}
                        </ClickableText>
                    </Flex>
                )}
                {!below1080 && (
                    <Flex alignItems="center">
                        <ClickableText
                            area="fee"
                            onClick={() => {
                                setSortedColumn(SORT_FIELD.FEE)
                                setSortDirection(
                                    sortedColumn !== (SORT_FIELD.FEE) ? true : !sortDirection
                                )
                            }}
                        >
                            Max Supply
                            {sortedColumn === (SORT_FIELD.FEE) ? (!sortDirection ? '↑' : '↓') : ''}
                        </ClickableText>
                    </Flex>
                )}
                <Flex alignItems="center">
                    <ClickableText
                        area="price"
                        onClick={(e) => {
                            setSortedColumn(SORT_FIELD.PRICE)
                            setSortDirection(sortedColumn !== SORT_FIELD.PRICE ? true : !sortDirection)
                        }}
                    >
                        Price {sortedColumn === SORT_FIELD.PRICE ? (!sortDirection ? '↑' : '↓') : ''}
                    </ClickableText>
                </Flex>
                {!below1080 && (
                    <Flex alignItems="center">
                        <ClickableText
                            area="change"
                            onClick={(e) => {
                                setSortedColumn(SORT_FIELD.CHANGE)
                                setSortDirection(sortedColumn !== SORT_FIELD.CHANGE ? true : !sortDirection)
                            }}
                        >
                            Price Change (24hrs)
                            {sortedColumn === SORT_FIELD.CHANGE ? (!sortDirection ? '↑' : '↓') : ''}
                        </ClickableText>
                    </Flex>
                )}
                <Flex alignItems="center">
                    <ClickableText
                        area="roi"
                        onClick={(e) => {
                            setSortedColumn(SORT_FIELD.ROI)
                            setSortDirection(sortedColumn !== SORT_FIELD.ROI ? true : !sortDirection)
                        }}
                    >
                        Total Return
                        {sortedColumn === SORT_FIELD.ROI ? (!sortDirection ? '↑' : '↓') : ''}
                    </ClickableText>
                </Flex>
            </DashGrid>
            <Divider />
            <List p={0}>
                {filteredList &&
                    filteredList.map((item, index) => {
                        return (
                            <div key={index}>
                                <ListItem key={index} index={(page - 1) * itemMax + index + 1} item={item} />
                                <Divider />
                            </div>
                        )
                    })}
            </List>
            {maxPage > 1 && (
                <PageButtons>
                    <div onClick={() => setPage(page === 1 ? page : page - 1)}>
                        <Arrow faded={page === 1 ? true : false}>←</Arrow>
                    </div>
                    <TYPE.body>{'Page ' + page + ' of ' + maxPage}</TYPE.body>
                    <div onClick={() => setPage(page === maxPage ? page : page + 1)}>
                        <Arrow faded={page === maxPage ? true : false}>→</Arrow>
                    </div>
                </PageButtons>
            )}
        </ListWrapper>
    )
}

export default withRouter(TopNFTPoolList)
