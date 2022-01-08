import React from 'react'
import { useHistory } from 'react-router-dom'
import { useMedia } from 'react-use'
import { Flex } from 'rebass'
import styled from 'styled-components'

import Icon from '../../assets/name.png'
import Logo from '../../assets/name.png'
import Link, { BasicLink } from '../Link'
import { RowFixed } from '../Row'

const TitleWrapper = styled.div`
  text-decoration: none;
  z-index: 10;
  width: 100%;
  &:hover {
    cursor: pointer;
  }
`

const UniIcon = styled(Link)`
  transition: transform 0.3s ease;
  :hover {
    transform: rotate(-5deg);
  }
`

const Option = styled.div`
  font-weight: 500;
  font-size: 14px;
  opacity: ${({ activeText }) => (activeText ? 1 : 0.6)};
  color: ${({ theme }) => theme.white};
  display: flex;
  margin-left: 12px;
  :hover {
    opacity: 1;
  }
`

export default function Title() {
  const history = useHistory()
  const below1080 = useMedia('(max-width: 1080px)')

  return (
    <TitleWrapper onClick={() => history.push('/')}>
      <Flex alignItems="center" style={{ justifyContent: 'space-between' }}>
        <RowFixed>
          <UniIcon id="link" onClick={() => history.push('/')}>
            {!below1080 ? (
              <img width={'160px'} style={{ marginTop: '0px' }} src={Logo} alt="logo" />
            ) : (
              <img width={'70px'} src={Icon} alt="logo" />
            )}
          </UniIcon>
        </RowFixed>
        {below1080 && (
          <RowFixed style={{ alignItems: 'flex-end' }}>
            <BasicLink to="/home">
              <Option activeText={history.location.pathname === '/home' ?? undefined}>Overview</Option>
            </BasicLink>
            <BasicLink to="/pools">
              <Option
                activeText={
                  (history.location.pathname.split('/')[1] === 'pools' ||
                    history.location.pathname.split('/')[1] === 'pool') ??
                  undefined
                }
              >
                Pools
              </Option>
            </BasicLink>
            <BasicLink to="/nftpools">
              <Option
                activeText={
                  (history.location.pathname.split('/')[1] === 'nftpools' ||
                    history.location.pathname.split('/')[1] === 'nftpool') ??
                  undefined
                }
              >
                NFT Pools
              </Option>
            </BasicLink>

            <BasicLink to="/accounts">
              <Option
                activeText={
                  (history.location.pathname.split('/')[1] === 'accounts' ||
                    history.location.pathname.split('/')[1] === 'account') ??
                  undefined
                }
              >
                Accounts
              </Option>
            </BasicLink>
          </RowFixed>
        )}
      </Flex>
    </TitleWrapper>
  )
}
