import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import React, { useEffect, useMemo, useState } from 'react'
import { withRouter } from 'react-router-dom'
import { useMedia } from 'react-use'
import { Box, Flex, Text } from 'rebass'
import styled from 'styled-components'

import { TYPE } from '../../Theme'
import { formattedNum, formattedPercent, toSignificant } from '../../utils'
import { Divider } from '..'
import FormattedName from '../FormattedName'
import { CustomLink } from '../Link'
import Row from '../Row'
import TokenLogo from '../TokenLogo'
import { useAllTokenData } from '../../contexts/TokenData'

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
    LIQ: 'totalLiquidityUSD',
    VAL: 'value',
    BAL: 'balance',
    SYMBOL: 'symbol',
    NAME: 'name',
    PRICE: 'priceUSD',
    CHANGE: 'priceChangeUSD',
}

// @TODO rework into virtualized list
function InvestmentPositionsList({ positions, balances, itemMax = 10, useTracked = false }) {
    // page state
    const [page, setPage] = useState(1)
    const [maxPage, setMaxPage] = useState(1)

    const allTokens = useAllTokenData()

    const tokens = positions.reduce((res, key) => {
        res[key] = allTokens[key]
        return res
    }, {})

    console.log(tokens)

    // sorting
    const [sortDirection, setSortDirection] = useState(true)
    const [sortedColumn, setSortedColumn] = useState(SORT_FIELD.VAL)

    const below1080 = useMedia('(max-width: 1080px)')
    const below680 = useMedia('(max-width: 680px)')
    const below600 = useMedia('(max-width: 600px)')

    useEffect(() => {
        setMaxPage(1) // edit this to do modular
        setPage(1)
    }, [tokens])

    const formattedTokens = useMemo(() => {
        return (
            tokens &&
            Object.keys(tokens)
                .map((key) => tokens[key])
                .filter((tok) => tok && tok.totalLiquidityUSD > 0)
        )
    }, [tokens])

    const filteredList = useMemo(() => {
        return (
            formattedTokens &&
            formattedTokens
                .sort((a, b) => {
                    if (sortedColumn === SORT_FIELD.SYMBOL || sortedColumn === SORT_FIELD.NAME) {
                        return a[sortedColumn] > b[sortedColumn] ? (sortDirection ? -1 : 1) * 1 : (sortDirection ? -1 : 1) * -1
                    }
                    return parseFloat(a[sortedColumn]) > parseFloat(b[sortedColumn])
                        ? (sortDirection ? -1 : 1) * 1
                        : (sortDirection ? -1 : 1) * -1
                })
                .slice(itemMax * (page - 1), page * itemMax)
        )
    }, [formattedTokens, itemMax, page, sortDirection, sortedColumn])

    useEffect(() => {
        if (tokens && formattedTokens) {
            let extraPages = 1
            if (formattedTokens.length % itemMax === 0) {
                extraPages = 0
            }
            setMaxPage(Math.floor(formattedTokens.length / itemMax) + extraPages)
        }
    }, [tokens, formattedTokens, itemMax])

    const ListItem = ({ item, index }) => {
        console.log(balances[index] / 1e18)
        let valueUSD = balances[index] ? Number(balances[index] * item.priceUSD / 1e18) : 0;
        return (
            <DashGrid style={{ height: '48px' }} focus={true}>
                <DataText area="name" fontWeight="500">
                    <Row>
                        <TokenLogo address={item.id} />
                        <CustomLink style={{ marginLeft: '16px', whiteSpace: 'nowrap' }} to={'/token/' + item.id}>
                            <FormattedName
                                text={below680 ? item.symbol : item.name}
                                maxCharacters={below600 ? 8 : 19}
                                adjustSize={true}
                                link={true}
                            />
                        </CustomLink>
                    </Row>
                </DataText>
                {!below680 && (
                    <DataText area="symbol" color="text" fontWeight="500">
                        <FormattedName text={item.symbol} maxCharacters={5} />
                    </DataText>
                )}
                <DataText area="price" color="text" fontWeight="500">
                    {formattedNum(item.priceUSD, true)}
                </DataText>
                {!below1080 && <DataText area="liq">{balances[index] ? toSignificant(balances[index] / 1e18, 3) : 0}</DataText>}
                <DataText area="vol">{formattedNum(valueUSD, true)}</DataText>
                {!below1080 && <DataText area="change">{formattedPercent(item.priceChangeUSD)}</DataText>}
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

                        }}
                    >
                        {below680 ? 'Symbol' : 'Name'}
                    </ClickableText>
                </Flex>
                {!below680 && (
                    <Flex alignItems="center">
                        <ClickableText
                            area="symbol"
                            onClick={() => {

                            }}
                        >
                            Symbol
                        </ClickableText>
                    </Flex>
                )}
                <Flex alignItems="center">
                    <ClickableText
                        area="price"
                        onClick={(e) => {

                        }}
                    >
                        Price
                    </ClickableText>
                </Flex>
                {!below1080 && (
                    <Flex alignItems="center">
                        <ClickableText
                            area="liq"
                            onClick={(e) => {

                            }}
                        >
                            Balance
                        </ClickableText>
                    </Flex>
                )}
                <Flex alignItems="center">
                    <ClickableText
                        area="vol"
                        onClick={() => {

                        }}
                    >
                        Value

                    </ClickableText>
                </Flex>
                {!below1080 && (
                    <Flex alignItems="center">
                        <ClickableText
                            area="change"
                            onClick={(e) => {

                            }}
                        >
                            Price Change (24hrs)

                        </ClickableText>
                    </Flex>
                )}
            </DashGrid>
            <Divider />
            <List p={0}>
                {filteredList &&
                    filteredList.map((item, index) => {
                        return (item &&
                            <div key={index}>
                                <ListItem key={index} index={(page - 1) * itemMax + index} item={item} />
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

export default withRouter(InvestmentPositionsList)
