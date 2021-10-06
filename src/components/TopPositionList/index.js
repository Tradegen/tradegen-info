import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import React, { useEffect, useState } from 'react'
import { withRouter } from 'react-router-dom'
import { useMedia } from 'react-use'
import { Box, Flex } from 'rebass'
import styled from 'styled-components'

import { TYPE } from '../../Theme'
import { formattedNum } from '../../utils'
import { Divider } from '..'
import { CustomLink } from '../Link'
import LocalLoader from '../LocalLoader'
import { RowFixed } from '../Row'

dayjs.extend(utc)

const PageButtons = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 2em;
  margin-bottom: 0.5em;
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
  grid-template-columns: 10px 1.5fr 1fr 1fr 1fr;
  grid-template-areas: 'number account type name value';
  padding: 0 4px;

  > * {
    justify-content: flex-end;
  }

  @media screen and (max-width: 1080px) {
    grid-template-columns: 10px 1.5fr 1fr 1fr;
    grid-template-areas: 'number name pair value';
  }

  @media screen and (max-width: 600px) {
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-areas: 'name pair value';
  }
`

const ListWrapper = styled.div``

const DataText = styled(Flex)`
  align-items: center;
  text-align: center;
  color: ${({ theme }) => theme.text1};
  & > * {
    font-size: 14px;
  }

  @media screen and (max-width: 600px) {
    font-size: 13px;
  }
`

function TopPositionList({ positions, disbaleLinks, maxItems = 10 }) {
    const below600 = useMedia('(max-width: 600px)')
    const below800 = useMedia('(max-width: 800px)')

    // pagination
    const [page, setPage] = useState(1)
    const [maxPage, setMaxPage] = useState(1)
    const ITEMS_PER_PAGE = maxItems

    useEffect(() => {
        setMaxPage(1) // edit this to do modular
        setPage(1)
    }, [positions])

    useEffect(() => {
        if (positions) {
            let extraPages = 1
            if (Object.keys(positions).length % ITEMS_PER_PAGE === 0) {
                extraPages = 0
            }
            setMaxPage(Math.floor(Object.keys(positions).length / ITEMS_PER_PAGE) + extraPages)
        }
    }, [ITEMS_PER_PAGE, positions])

    const ListItem = ({ position, index }) => {
        return (
            <DashGrid style={{ height: '48px' }} disbaleLinks={disbaleLinks} focus={true}>
                {!below600 && (
                    <DataText area="number" fontWeight="500">
                        {index}
                    </DataText>
                )}
                <DataText area="name" fontWeight="500" justifyContent="flex-start">
                    <CustomLink style={{ marginLeft: below600 ? 0 : '1rem', whiteSpace: 'nowrap' }} to={'/account/' + position.user.id}>
                        {below800 ? position.user.id.slice(0, 4) + '...' + position.user.id.slice(38, 42) : position.user.id}
                    </CustomLink>
                </DataText>
                <DataText area="type">{position.type}</DataText>
                <DataText>
                    <CustomLink area="pair" to={'/pair/' + position.address}>
                        <RowFixed>
                            {position.name}
                        </RowFixed>
                    </CustomLink>
                </DataText>
                <DataText area="value">{formattedNum(position.usd, true)}</DataText>
            </DashGrid>
        )
    }

    const positionList =
        positions &&
        positions.slice(ITEMS_PER_PAGE * (page - 1), page * ITEMS_PER_PAGE).map((position, index) => {
            return (
                <div key={index}>
                    <ListItem key={index} index={(page - 1) * 10 + index + 1} position={position} />
                    <Divider />
                </div>
            )
        })

    return (
        <ListWrapper>
            <DashGrid center={true} disbaleLinks={disbaleLinks} style={{ height: 'fit-content', padding: ' 0 0 1rem 0' }}>
                {!below600 && (
                    <Flex alignItems="center" justifyContent="flex-start">
                        <TYPE.main area="number">#</TYPE.main>
                    </Flex>
                )}
                <Flex alignItems="center" justifyContent="flex-start">
                    <TYPE.main area="name">Account</TYPE.main>
                </Flex>
                <Flex alignItems="center" justifyContent="flexEnd">
                    <TYPE.main area="type">Type</TYPE.main>
                </Flex>
                <Flex alignItems="center" justifyContent="flexEnd">
                    <TYPE.main area="pair">Name</TYPE.main>
                </Flex>
                <Flex alignItems="center" justifyContent="flexEnd">
                    <TYPE.main area="value">Value</TYPE.main>
                </Flex>
            </DashGrid>
            <Divider />
            <List p={0}>{!positionList ? <LocalLoader /> : positionList}</List>
            <PageButtons>
                <div onClick={() => setPage(page === 1 ? page : page - 1)}>
                    <Arrow faded={page === 1 ? true : false}>←</Arrow>
                </div>
                <TYPE.body>{'Page ' + page + ' of ' + maxPage}</TYPE.body>
                <div onClick={() => setPage(page === maxPage ? page : page + 1)}>
                    <Arrow faded={page === maxPage ? true : false}>→</Arrow>
                </div>
            </PageButtons>
        </ListWrapper>
    )
}

export default withRouter(TopPositionList)
