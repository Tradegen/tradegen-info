import 'feather-icons'

import React, { useEffect } from 'react'
import { withRouter } from 'react-router-dom'
import { useMedia } from 'react-use'
import styled from 'styled-components'

import { FullWrapper, PageWrapper } from '../components'
import AccountSearch from '../components/AccountSearch'
import LocalLoader from '../components/LocalLoader'
import LPList from '../components/LPList'
import Panel from '../components/Panel'
import { RowBetween } from '../components/Row'
import Search from '../components/Search'
import { useTopLps, useTopPositions } from '../contexts/GlobalData'
import { TYPE } from '../Theme'

const AccountWrapper = styled.div`
  @media screen and (max-width: 600px) {
    width: 100%;
  }
`

function AccountLookup() {
  // scroll to top
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const topLps = useTopLps()
  const topPositions = useTopPositions()

  console.log(topPositions)

  const below600 = useMedia('(max-width: 600px)')

  return (
    <PageWrapper>
      <FullWrapper>
        <RowBetween>
          <TYPE.largeHeader>Wallet analytics</TYPE.largeHeader>
          {!below600 && <Search small={true} />}
        </RowBetween>
        <AccountWrapper>
          <AccountSearch />
        </AccountWrapper>
        <TYPE.main fontSize={'1.125rem'} style={{ marginTop: '2rem' }}>
          Top Liquidity Positions
        </TYPE.main>
        <Panel>{topLps && topLps.length > 0 ? <LPList lps={topLps} maxItems={200} /> : <LocalLoader />}</Panel>
      </FullWrapper>
    </PageWrapper>
  )
}

export default withRouter(AccountLookup)
