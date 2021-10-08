import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, Bookmark } from 'react-feather'
import { useMedia } from 'react-use'
import styled from 'styled-components'

import { ContentWrapper, PageWrapper, StyledIcon } from '../components'
import { ButtonDropdown, ButtonLight } from '../components/ButtonStyled'
import { AutoColumn } from '../components/Column'
import DoubleTokenLogo from '../components/DoubleLogo'
import Link, { BasicLink } from '../components/Link'
import MiningPositionList from '../components/MiningPositionList'
import PairReturnsChart from '../components/PairReturnsChart'
import Panel from '../components/Panel'
import PositionList from '../components/PositionList'
import Row, { AutoRow, RowBetween, RowFixed } from '../components/Row'
import Search from '../components/Search'
import TxnList from '../components/TxnList'
import UserChart from '../components/UserChart'
import { FEE_WARNING_TOKENS } from '../constants'
import { useSavedAccounts } from '../contexts/LocalStorage'
import { useMiningPositions, useUserPositions, useUserTransactions } from '../contexts/User'
import { TYPE } from '../Theme'
import { formattedNum } from '../utils'

const AccountWrapper = styled.div`
  background-color: rgba(255, 255, 255, 0.2);
  padding: 6px 16px;
  border-radius: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
`

const Header = styled.div``

const DashboardWrapper = styled.div`
  width: 100%;
`

const DropdownWrapper = styled.div`
  position: relative;
  margin-bottom: 1rem;
  border: 1px solid #edeef2;
  border-radius: 12px;
`

const Flyout = styled.div`
  position: absolute;
  top: 38px;
  left: -1px;
  width: 100%;
  background-color: ${({ theme }) => theme.bg1};
  z-index: 999;
  border-bottom-right-radius: 10px;
  border-bottom-left-radius: 10px;
  padding-top: 4px;
  border: 1px solid #edeef2;
  border-top: none;
`

const MenuRow = styled(Row)`
  width: 100%;
  padding: 12px 0;
  padding-left: 12px;

  :hover {
    cursor: pointer;
    background-color: ${({ theme }) => theme.bg2};
  }
`

const PanelWrapper = styled.div`
  grid-template-columns: 1fr;
  grid-template-rows: max-content;
  gap: 6px;
  display: inline-grid;
  width: 100%;
  align-items: start;
`

const Warning = styled.div`
  background-color: ${({ theme }) => theme.bg2};
  color: ${({ theme }) => theme.text1};
  padding: 1rem;
  font-weight: 600;
  border-radius: 10px;
  margin-bottom: 1rem;
  width: calc(100% - 2rem);
`

function AccountPage({ account }) {
  // get data for this account
  const transactions = useUserTransactions(account)
  const positions = useUserPositions(account)
  const miningPositions = useMiningPositions(account)

  // settings for list view and dropdowns
  const hideLPContent = positions && positions.length === 0
  const [activePosition, setActivePosition] = useState()

  const dynamicPositions = activePosition ? [activePosition] : positions

  useEffect(() => {
    window.scrollTo({
      behavior: 'smooth',
      top: 0,
    })
  }, [])

  const below600 = useMedia('(max-width: 600px)')

  // adding/removing account from saved accounts
  const [savedAccounts, addAccount, removeAccount] = useSavedAccounts()
  const isBookmarked = savedAccounts.includes(account)
  const handleBookmarkClick = useCallback(() => {
    ; (isBookmarked ? removeAccount : addAccount)(account)
  }, [account, isBookmarked, addAccount, removeAccount])

  return (
    <PageWrapper>
      <ContentWrapper>
        <RowBetween>
          <TYPE.body>
            <BasicLink to="/accounts">{'Accounts '}</BasicLink>→{' '}
            <Link lineHeight={'145.23%'} href={'https://explorer.celo.org/address/' + account} target="_blank">
              {' '}
              {account?.slice(0, 42)}{' '}
            </Link>
          </TYPE.body>
          {!below600 && <Search small={true} />}
        </RowBetween>
        <Header>
          <RowBetween>
            <span>
              <TYPE.header fontSize={24}>{account?.slice(0, 6) + '...' + account?.slice(38, 42)}</TYPE.header>
              <Link lineHeight={'145.23%'} href={'https://explorer.celo.org/address/' + account} target="_blank">
                <TYPE.main fontSize={14}>View on Celo Explorer</TYPE.main>
              </Link>
            </span>
            <AccountWrapper>
              <StyledIcon>
                <Bookmark
                  onClick={handleBookmarkClick}
                  style={{ opacity: isBookmarked ? 0.8 : 0.4, cursor: 'pointer' }}
                />
              </StyledIcon>
            </AccountWrapper>
          </RowBetween>
        </Header>
        <DashboardWrapper>
          {!hideLPContent && (
            <PanelWrapper>
              <Panel style={{ gridColumn: '1' }}>
                {activePosition ? (
                  <PairReturnsChart account={account} position={activePosition} />
                ) : (
                  <UserChart account={account} position={activePosition} />
                )}
              </Panel>
            </PanelWrapper>
          )}
          <TYPE.main fontSize={'1.125rem'} style={{ marginTop: '3rem' }}>
            Positions
          </TYPE.main>{' '}
          <Panel
            style={{
              marginTop: '1.5rem',
            }}
          >
            <PositionList positions={positions} />
          </Panel>
          <TYPE.main fontSize={'1.125rem'} style={{ marginTop: '3rem' }}>
            Managed Investments
          </TYPE.main>
          <Panel
            style={{
              marginTop: '1.5rem',
            }}
          >
            {miningPositions && <MiningPositionList miningPositions={miningPositions} />}
            {!miningPositions && (
              <AutoColumn gap="8px" justify="flex-start">
                <TYPE.main>No managed investments.</TYPE.main>
                <AutoRow gap="8px" justify="flex-start">
                  <ButtonLight style={{ padding: '4px 6px', borderRadius: '4px' }}>Learn More</ButtonLight>{' '}
                </AutoRow>{' '}
              </AutoColumn>
            )}
          </Panel>
          <TYPE.main fontSize={'1.125rem'} style={{ marginTop: '3rem' }}>
            Transactions
          </TYPE.main>{' '}
          <Panel
            style={{
              marginTop: '1.5rem',
            }}
          >
            <TxnList transactions={transactions} />
          </Panel>
        </DashboardWrapper>
      </ContentWrapper>
    </PageWrapper>
  )
}

export default AccountPage
