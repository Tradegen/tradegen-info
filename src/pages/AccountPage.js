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
import { useSavedAccounts } from '../contexts/LocalStorage'
import { useManagedInvestments, useUserPositions, useUserTransactions } from '../contexts/User'
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

const PanelWrapper = styled.div`
  grid-template-columns: 1fr;
  grid-template-rows: max-content;
  gap: 6px;
  display: inline-grid;
  width: 100%;
  align-items: start;
`

function AccountPage({ account }) {
  // get data for this account
  const transactions = useUserTransactions(account)
  const positions = useUserPositions(account)
  const managedInvestments = useManagedInvestments(account)

  console.log(positions)

  // settings for list view and dropdowns
  const hideLPContent = positions && positions.length === 0
  const [activePosition, setActivePosition] = useState()

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
            {managedInvestments && <PositionList positions={managedInvestments} />}
            {!managedInvestments && (
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
