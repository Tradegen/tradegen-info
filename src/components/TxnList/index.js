import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import React, { useEffect, useState } from 'react'
import { useMedia } from 'react-use'
import { Box, Flex, Text } from 'rebass'
import styled from 'styled-components'

import { TYPE } from '../../Theme'
import { formattedNum, formatTime, urls } from '../../utils'
import { Divider, EmptyCard } from '..'
import DropdownSelect from '../DropdownSelect'
import Link from '../Link'
import LocalLoader from '../LocalLoader'
import { RowBetween, RowFixed } from '../Row'

dayjs.extend(utc)

const PageButtons = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 2em;
  margin-bottom: 0.5em;
`

const Arrow = styled.div`
  color: #2f80ed;
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
  grid-template-areas: 'txn value time';

  > * {
    justify-content: flex-end;
    width: 100%;

    &:first-child {
      justify-content: flex-start;
      text-align: left;
      width: 100px;
    }
  }

  @media screen and (min-width: 500px) {
    > * {
      &:first-child {
        width: 180px;
      }
    }
  }

  @media screen and (min-width: 780px) {
    max-width: 1320px;
    grid-template-columns: 1.2fr 1fr 1fr 1fr 1fr;
    grid-template-areas: 'txn value amountToken amountOther time';

    > * {
      &:first-child {
        width: 180px;
      }
    }
  }

  @media screen and (min-width: 1080px) {
    max-width: 1320px;
    grid-template-columns: 1.2fr 1fr 1fr 1fr 1fr;
    grid-template-areas: 'txn value amountToken amountOther account time';
  }
`

const ClickableText = styled(Text)`
  color: ${({ theme }) => theme.text1};
  user-select: none;
  text-align: end;

  &:hover {
    cursor: pointer;
    opacity: 0.6;
  }

  @media screen and (max-width: 640px) {
    font-size: 14px;
  }
`

const DataText = styled(Flex)`
  align-items: center;
  text-align: right;
  color: ${({ theme }) => theme.text1};

  & > * {
    font-size: 1em;
  }

  @media screen and (max-width: 40em) {
    font-size: 0.85rem;
  }
`

const SortText = styled.button`
  cursor: pointer;
  font-weight: ${({ active, theme }) => (active ? 500 : 400)};
  margin-right: 0.75rem !important;
  border: none;
  background-color: transparent;
  font-size: 1rem;
  padding: 0px;
  color: ${({ active, theme }) => (active ? theme.text1 : theme.text3)};
  outline: none;

  @media screen and (max-width: 600px) {
    font-size: 14px;
  }
`

const SORT_FIELD = {
  VALUE: 'amountUSD',
  NAME: 'name',
  TIMESTAMP: 'timestamp',
  TYPE: 'investmentType'
}

const TXN_TYPE = {
  ALL: 'All',
  DEPOSIT: 'Deposits',
  WITHDRAW: 'Withdraws',
  MINT: 'Mint Fees',
}

const ITEMS_PER_PAGE = 10

function getTransactionType(event, name) {
  const formattedName = name?.length > 20 ? name.slice(0, 19) + '...' : name
  switch (event) {
    case TXN_TYPE.DEPOSIT:
      return 'Deposit into ' + formattedName
    case TXN_TYPE.WITHDRAW:
      return 'Withdraw from ' + formattedName
    case TXN_TYPE.MINT:
      return 'Mint fees for ' + formattedName
    default:
      return ''
  }
}

// @TODO rework into virtualized list
function TxnList({ transactions, nameOverride, color }) {
  // page state
  const [page, setPage] = useState(1)
  const [maxPage, setMaxPage] = useState(1)

  // sorting
  const [sortDirection, setSortDirection] = useState(true)
  const [sortedColumn, setSortedColumn] = useState(SORT_FIELD.TIMESTAMP)
  const [filteredItems, setFilteredItems] = useState()
  const [txFilter, setTxFilter] = useState(TXN_TYPE.ALL)

  console.log(transactions)

  useEffect(() => {
    setMaxPage(1) // edit this to do modular
    setPage(1)
  }, [transactions])

  // parse the txns and format for UI
  useEffect(() => {
    if (transactions && transactions.depositPools && transactions.withdrawPools && transactions.mintFeePools && transactions.depositNFTPools && transactions.withdrawNFTPools) {
      let newTxns = []
      //Pools
      if (transactions.depositPools.length > 0) {
        transactions.depositPools.map((deposit) => {
          let newTxn = {}
          newTxn.hash = deposit.poolTransaction.id
          newTxn.timestamp = deposit.poolTransaction.timestamp
          newTxn.type = TXN_TYPE.DEPOSIT
          newTxn.investmentType = "Pool"
          newTxn.account = deposit.userAddress
          newTxn.amountUSD = deposit.amount
          newTxn.name = deposit.poolTransaction.pool.name
          return newTxns.push(newTxn)
        })
      }
      if (transactions.withdrawPools.length > 0) {
        transactions.withdrawPools.map((withdraw) => {
          let newTxn = {}
          newTxn.hash = withdraw.poolTransaction.id
          newTxn.timestamp = withdraw.poolTransaction.timestamp
          newTxn.type = TXN_TYPE.WITHDRAW
          newTxn.investmentType = "Pool"
          newTxn.account = withdraw.userAddress
          newTxn.amountUSD = BigInt(withdraw.tokenAmount) * BigInt(withdraw.poolTransaction.pool.tokenPrice) / BigInt("1000000000000000000")
          newTxn.name = withdraw.poolTransaction.pool.name
          return newTxns.push(newTxn)
        })
      }
      if (transactions.mintFeePools.length > 0) {
        transactions.mintFeePools.map((mint) => {
          let newTxn = {}
          newTxn.hash = mint.poolTransaction.id
          newTxn.timestamp = mint.poolTransaction.timestamp
          newTxn.type = TXN_TYPE.MINT
          newTxn.investmentType = "Pool"
          newTxn.account = mint.managerAddress
          newTxn.amountUSD = BigInt(mint.feesMinted) * BigInt(mint.tokenPrice) / BigInt("1000000000000000000")
          newTxn.name = mint.poolTransaction.pool.name
          return newTxns.push(newTxn)
        })
      }
      //NFT Pools
      if (transactions.depositNFTPools.length > 0) {
        transactions.depositNFTPools.map((deposit) => {
          let newTxn = {}
          newTxn.hash = deposit.NFTPoolTransaction.id
          newTxn.timestamp = deposit.NFTPoolTransaction.timestamp
          newTxn.type = TXN_TYPE.DEPOSIT
          newTxn.investmentType = "NFT Pool"
          newTxn.account = deposit.userAddress
          newTxn.amountUSD = deposit.USDAmount
          newTxn.name = deposit.NFTPoolTransaction.NFTPool.name
          return newTxns.push(newTxn)
        })
      }
      if (transactions.withdrawNFTPools.length > 0) {
        transactions.withdrawNFTPools.map((withdraw) => {
          let newTxn = {}
          newTxn.hash = withdraw.NFTPoolTransaction.id
          newTxn.timestamp = withdraw.NFTPoolTransaction.timestamp
          newTxn.type = TXN_TYPE.WITHDRAW
          newTxn.investmentType = "NFT Pool"
          newTxn.account = withdraw.userAddress
          newTxn.amountUSD = withdraw.USDAmount
          newTxn.name = withdraw.NFTPoolTransaction.NFTPool.name
          return newTxns.push(newTxn)
        })
      }

      const filtered = newTxns.filter((item) => {
        if (txFilter !== TXN_TYPE.ALL) {
          return item.type === txFilter
        }
        return true
      })
      setFilteredItems(filtered)
      let extraPages = 1
      if (filtered.length % ITEMS_PER_PAGE === 0) {
        extraPages = 0
      }
      if (filtered.length === 0) {
        setMaxPage(1)
      } else {
        setMaxPage(Math.floor(filtered.length / ITEMS_PER_PAGE) + extraPages)
      }
    }
  }, [transactions, txFilter])

  useEffect(() => {
    setPage(1)
  }, [txFilter])

  const filteredList =
    filteredItems &&
    filteredItems
      .sort((a, b) => {
        return parseFloat(a[sortedColumn]) > parseFloat(b[sortedColumn])
          ? (sortDirection ? -1 : 1) * 1
          : (sortDirection ? -1 : 1) * -1
      })
      .slice(ITEMS_PER_PAGE * (page - 1), page * ITEMS_PER_PAGE)

  const below1080 = useMedia('(max-width: 1080px)')
  const below780 = useMedia('(max-width: 780px)')

  const ListItem = ({ item }) => {
    return (
      <DashGrid style={{ height: '48px' }}>
        <DataText area="txn" fontWeight="500">
          <Link color={color} external href={urls.showTransaction(item.hash)}>
            {getTransactionType(item.type, item.name)}
          </Link>
        </DataText>
        {!below1080 && (
          <DataText area="investmentType">{item.investmentType}</DataText>
        )}
        <DataText area="value">
          {formattedNum(parseFloat((BigInt(item.amountUSD.toString()) / BigInt("10000000000000000")).toString()) / 100, true)}
        </DataText>
        {!below1080 && (
          <DataText area="account">
            <Link color={color} external href={'https://explorer.celo.org/address/' + item.account}>
              {item.account && item.account.slice(0, 6) + '...' + item.account.slice(38, 42)}
            </Link>
          </DataText>
        )}
        <DataText area="time">{formatTime(item.timestamp)}</DataText>
      </DashGrid>
    )
  }

  return (
    <>
      <DashGrid center={true} style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
        {below780 ? (
          <RowBetween area="txn">
            <DropdownSelect options={TXN_TYPE} active={txFilter} setActive={setTxFilter} color={color} />
          </RowBetween>
        ) : (
          <RowFixed area="txn" gap="10px" pl={4}>
            <SortText
              onClick={() => {
                setTxFilter(TXN_TYPE.ALL)
              }}
              active={txFilter === TXN_TYPE.ALL}
            >
              All
            </SortText>
            <SortText
              onClick={() => {
                setTxFilter(TXN_TYPE.DEPOSIT)
              }}
              active={txFilter === TXN_TYPE.DEPOSIT}
            >
              Deposits
            </SortText>
            <SortText
              onClick={() => {
                setTxFilter(TXN_TYPE.WITHDRAW)
              }}
              active={txFilter === TXN_TYPE.WITHDRAW}
            >
              Withdraws
            </SortText>
            <SortText
              onClick={() => {
                setTxFilter(TXN_TYPE.MINT)
              }}
              active={txFilter === TXN_TYPE.MINT}
            >
              Mint Fees
            </SortText>
          </RowFixed>
        )}

        <Flex alignItems="center" justifyContent="flexStart">
          <ClickableText
            color="textDim"
            area="value"
            onClick={(e) => {
              setSortedColumn(SORT_FIELD.TYPE)
              setSortDirection(sortedColumn !== SORT_FIELD.TYPE ? true : !sortDirection)
            }}
          >
            Type {sortedColumn === SORT_FIELD.TYPE ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </Flex>
        <Flex alignItems="center" justifyContent="flexStart">
          <ClickableText
            color="textDim"
            area="value"
            onClick={(e) => {
              setSortedColumn(SORT_FIELD.VALUE)
              setSortDirection(sortedColumn !== SORT_FIELD.VALUE ? true : !sortDirection)
            }}
          >
            Total Value {sortedColumn === SORT_FIELD.VALUE ? (!sortDirection ? '↑' : '↓') : ''}
          </ClickableText>
        </Flex>
        <>
          {!below1080 && (
            <Flex alignItems="center">
              <TYPE.body area="account">Account</TYPE.body>
            </Flex>
          )}
          <Flex alignItems="center">
            <ClickableText
              area="time"
              color="textDim"
              onClick={() => {
                setSortedColumn(SORT_FIELD.TIMESTAMP)
                setSortDirection(sortedColumn !== SORT_FIELD.TIMESTAMP ? true : !sortDirection)
              }}
            >
              Time {sortedColumn === SORT_FIELD.TIMESTAMP ? (!sortDirection ? '↑' : '↓') : ''}
            </ClickableText>
          </Flex>
        </>
      </DashGrid>
      <Divider />
      <List p={0}>
        {!filteredList ? (
          <LocalLoader />
        ) : filteredList.length === 0 ? (
          <EmptyCard>No recent transactions found.</EmptyCard>
        ) : (
          filteredList.map((item, index) => {
            return (
              <div key={index}>
                <ListItem key={index} index={index + 1} item={item} />
                <Divider />
              </div>
            )
          })
        )}
      </List>
      <PageButtons>
        <div
          onClick={(e) => {
            setPage(page === 1 ? page : page - 1)
          }}
        >
          <Arrow faded={page === 1 ? true : false}>←</Arrow>
        </div>
        <TYPE.body>{'Page ' + page + ' of ' + maxPage}</TYPE.body>
        <div
          onClick={(e) => {
            setPage(page === maxPage ? page : page + 1)
          }}
        >
          <Arrow faded={page === maxPage ? true : false}>→</Arrow>
        </div>
      </PageButtons>
    </>
  )
}

export default TxnList
