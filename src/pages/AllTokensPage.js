import 'feather-icons'

import React, { useEffect } from 'react'
import { useMedia } from 'react-use'

import { FullWrapper, PageWrapper } from '../components'
import Panel from '../components/Panel'
import { RowBetween } from '../components/Row'
import Search from '../components/Search'
import { TYPE } from '../Theme'
import { useAllPoolData } from '../contexts/PoolData'
import TopPoolList from '../components/PoolList'

function AllPoolsPage() {
  const allPools = useAllPoolData()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const below600 = useMedia('(max-width: 800px)')

  return (
    <PageWrapper>
      <FullWrapper>
        <RowBetween>
          <TYPE.largeHeader>Top Pools</TYPE.largeHeader>
          {!below600 && <Search small={true} />}
        </RowBetween>
        <Panel style={{ marginTop: '6px', padding: below600 && '1rem 0 0 0 ' }}>
          <TopPoolList pools={allPools} itemMax={50} />
        </Panel>
      </FullWrapper>
    </PageWrapper>
  )
}

export default AllPoolsPage
