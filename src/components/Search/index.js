import { transparentize } from 'polished'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search as SearchIcon, X } from 'react-feather'
import { useMedia } from 'react-use'
import styled from 'styled-components'

import { tradegenClient } from '../../apollo/client'
import { POOL_SEARCH, NFT_POOL_SEARCH } from '../../apollo/queries'
import { useAllPoolsInTradegen, useAllNFTPoolsInTradegen } from '../../contexts/GlobalData'
import { useAllPoolData, usePoolData } from '../../contexts/PoolData'
import { useAllNFTPoolData, useNFTPoolData } from '../../contexts/NFTPoolData'
import { TYPE } from '../../Theme'
import FormattedName from '../FormattedName'
import { BasicLink } from '../Link'
import Row, { RowFixed } from '../Row'

const Container = styled.div`
  height: 48px;
  z-index: 30;
  position: relative;

  @media screen and (max-width: 600px) {
    width: 100%;
  }
`

const Wrapper = styled.div`
  display: flex;
  position: relative;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 16px;
  border-radius: 12px;
  background: ${({ theme, small, open }) => (small ? (open ? theme.bg6 : 'none') : transparentize(0.4, theme.bg6))};
  border-bottom-right-radius: ${({ open }) => (open ? '0px' : '12px')};
  border-bottom-left-radius: ${({ open }) => (open ? '0px' : '12px')};
  z-index: 9999;
  width: 100%;
  min-width: 300px;
  box-sizing: border-box;
  box-shadow: ${({ open, small }) =>
    !open && !small
      ? '0px 24px 32px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 0px 1px rgba(0, 0, 0, 0.04) '
      : 'none'};
  @media screen and (max-width: 500px) {
    background: ${({ theme }) => theme.bg6};
    box-shadow: ${({ open }) =>
    !open
      ? '0px 24px 32px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 0px 1px rgba(0, 0, 0, 0.04) '
      : 'none'};
  }
`
const Input = styled.input`
  position: relative;
  display: flex;
  align-items: center;
  white-space: nowrap;
  background: none;
  border: none;
  outline: none;
  width: 100%;
  color: ${({ theme }) => theme.text1};
  font-size: ${({ large }) => (large ? '20px' : '14px')};

  ::placeholder {
    color: ${({ theme }) => theme.text3};
    font-size: 16px;
  }

  @media screen and (max-width: 640px) {
    ::placeholder {
      font-size: 1rem;
    }
  }
`

const SearchIconLarge = styled(SearchIcon)`
  height: 20px;
  width: 20px;
  margin-right: 0.5rem;
  position: absolute;
  right: 10px;
  pointer-events: none;
  color: ${({ theme }) => theme.text3};
`

const CloseIcon = styled(X)`
  height: 20px;
  width: 20px;
  margin-right: 0.5rem;
  position: absolute;
  right: 10px;
  color: ${({ theme }) => theme.text3};
  :hover {
    cursor: pointer;
  }
`

const Menu = styled.div`
  display: flex;
  flex-direction: column;
  z-index: 9999;
  width: 100%;
  top: 50px;
  max-height: 540px;
  overflow: auto;
  left: 0;
  padding-bottom: 20px;
  background: ${({ theme }) => theme.bg6};
  border-bottom-right-radius: 12px;
  border-bottom-left-radius: 12px;
  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.04), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.04);
  display: ${({ hide }) => hide && 'none'};
`

const MenuItem = styled(Row)`
  padding: 1rem;
  font-size: 0.85rem;
  & > * {
    margin-right: 6px;
  }
  :hover {
    cursor: pointer;
    background-color: ${({ theme }) => theme.bg2};
  }
`

const Heading = styled(Row)`
  padding: 1rem;
  display: ${({ hide = false }) => hide && 'none'};
`

const Gray = styled.span`
  color: #888d9b;
`

const Blue = styled.span`
  color: #2172e5;
  :hover {
    cursor: pointer;
  }
`

export const Search = ({ small = false }) => {
  let allPools = useAllPoolsInTradegen()
  const allPoolData = useAllPoolData()

  let allNFTPools = useAllNFTPoolsInTradegen()
  const allNFTPoolData = useAllNFTPoolData()

  console.log(allPoolData)
  console.log(allNFTPoolData)

  const [showMenu, toggleMenu] = useState(false)
  const [value, setValue] = useState('')
  const [, toggleShadow] = useState(false)
  const [, toggleBottomShadow] = useState(false)

  // fetch new data on pools and NFT pools if needed
  usePoolData(value)
  useNFTPoolData(value)

  const below700 = useMedia('(max-width: 700px)')
  const below470 = useMedia('(max-width: 470px)')
  const below410 = useMedia('(max-width: 410px)')

  useEffect(() => {
    if (value !== '') {
      toggleMenu(true)
    } else {
      toggleMenu(false)
    }
  }, [value])

  const [searchedPools, setSearchedPools] = useState([])
  const [searchedNFTPools, setSearchedNFTPools] = useState([])

  useEffect(() => {
    async function fetchData() {
      try {
        if (value?.length > 0) {
          let pools = await tradegenClient.query({
            query: POOL_SEARCH,
            variables: {
              value: value ? value.toUpperCase() : '',
              id: value,
            },
          })

          let NFTPools = await tradegenClient.query({
            query: NFT_POOL_SEARCH,
            variables: {
              value: value ? value.toUpperCase() : '',
              id: value,
            },
          })

          const foundPools = pools.data.asAddress.concat(pools.data.asName)
          setSearchedPools(foundPools)

          const foundNFTPools = NFTPools.data.asAddress.concat(NFTPools.data.asName)
          setSearchedNFTPools(foundNFTPools)
        }
      } catch (e) {
        console.log(e)
      }
    }
    fetchData()
  }, [value])

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
  }

  // add the searched pools to the list if not found yet
  allPools = allPools.concat(
    searchedPools.filter((searchedPool) => {
      let included = false
      allPools.map((pool) => {
        if (pool.id === searchedPool.id) {
          included = true
        }
        return true
      })
      return !included
    })
  )

  // add the searched NFT pools to the list if not found yet
  allNFTPools = allNFTPools.concat(
    searchedNFTPools.filter((searchedNFTPool) => {
      let included = false
      allNFTPools.map((NFTPool) => {
        if (NFTPool.id === searchedNFTPool.id) {
          included = true
        }
        return true
      })
      return !included
    })
  )

  let uniquePools = []
  let found = {}
  allPools &&
    allPools.map((pool) => {
      if (pool && !found[pool.id]) {
        found[pool.id] = true
        uniquePools.push(pool)
      }
      return true
    })

  console.log(allPools)

  let uniqueNFTPools = []
  let found2 = {}
  allNFTPools &&
    allNFTPools.map((NFTPool) => {
      if (NFTPool && !found2[NFTPool.id]) {
        found2[NFTPool.id] = true
        uniqueNFTPools.push(NFTPool)
      }
      return true
    })

  const filteredPoolList = useMemo(() => {
    return uniquePools
      ? uniquePools
        .sort((a, b) => {
          const poolA = allPoolData[a.id]
          const poolB = allPoolData[b.id]

          return (poolA && poolB) ? (poolA.totalValueLockedUSD > poolB.totalValueLockedUSD ? -1 : 1) : -1
        })
        .filter((pool) => {
          const regexMatches = Object.keys(pool).map((poolEntryKey) => {
            const isAddress = value.slice(0, 2) === '0x'
            if (poolEntryKey === 'id' && isAddress) {
              return pool[poolEntryKey].match(new RegExp(escapeRegExp(value), 'i'))
            }
            if (poolEntryKey === 'name' && !isAddress) {
              return pool[poolEntryKey].match(new RegExp(escapeRegExp(value), 'i'))
            }
            return false
          })
          return regexMatches.some((m) => m)
        })
      : []
  }, [allPoolData, uniquePools, value])

  const filteredNFTPoolList = useMemo(() => {
    return uniqueNFTPools
      ? uniqueNFTPools
        .sort((a, b) => {
          const NFTPoolA = allNFTPoolData[a.id]
          const NFTPoolB = allNFTPoolData[b.id]

          return (NFTPoolA && NFTPoolB) ? (NFTPoolA.totalValueLockedUSD > NFTPoolB.totalValueLockedUSD ? -1 : 1) : -1
        })
        .filter((NFTPool) => {
          const regexMatches = Object.keys(NFTPool).map((NFTPoolEntryKey) => {
            const isAddress = value.slice(0, 2) === '0x'
            if (NFTPoolEntryKey === 'id' && isAddress) {
              return NFTPool[NFTPoolEntryKey].match(new RegExp(escapeRegExp(value), 'i'))
            }
            if (NFTPoolEntryKey === 'name' && !isAddress) {
              return NFTPool[NFTPoolEntryKey].match(new RegExp(escapeRegExp(value), 'i'))
            }
            return false
          })
          return regexMatches.some((m) => m)
        })
      : []
  }, [allNFTPoolData, uniqueNFTPools, value])

  useEffect(() => {
    if (Object.keys(filteredPoolList).length > 2) {
      toggleShadow(true)
    } else {
      toggleShadow(false)
    }
  }, [filteredPoolList])

  useEffect(() => {
    if (Object.keys(filteredNFTPoolList).length > 2) {
      toggleBottomShadow(true)
    } else {
      toggleBottomShadow(false)
    }
  }, [filteredNFTPoolList])

  const [poolsShown, setPoolsShown] = useState(3)
  const [NFTPoolsShown, setNFTPoolsShown] = useState(3)

  function onDismiss() {
    setPoolsShown(3)
    setNFTPoolsShown(3)
    toggleMenu(false)
    setValue('')
  }

  // refs to detect clicks outside modal
  const wrapperRef = useRef()
  const menuRef = useRef()

  const handleClick = (e) => {
    if (
      !(menuRef.current && menuRef.current.contains(e.target)) &&
      !(wrapperRef.current && wrapperRef.current.contains(e.target))
    ) {
      setPoolsShown(3)
      setNFTPoolsShown(3)
      toggleMenu(false)
    }
  }

  useEffect(() => {
    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
    }
  })

  return (
    <Container small={small}>
      <Wrapper open={showMenu} shadow={true} small={small}>
        <Input
          large={!small}
          type={'text'}
          ref={wrapperRef}
          placeholder={
            small
              ? ''
              : below410
                ? 'Search...'
                : below470
                  ? 'Search Tradegen...'
                  : below700
                    ? 'Search pools and NFT pools...'
                    : 'Search Tradegen pools and NFT pools...'
          }
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
          }}
          onFocus={() => {
            if (!showMenu) {
              toggleMenu(true)
            }
          }}
        />
        {!showMenu ? <SearchIconLarge /> : <CloseIcon onClick={() => toggleMenu(false)} />}
      </Wrapper>
      <Menu hide={!showMenu} ref={menuRef}>
        <Heading>
          <Gray>Pools</Gray>
        </Heading>
        <div>
          {filteredPoolList && Object.keys(filteredPoolList).length === 0 && (
            <MenuItem>
              <TYPE.body>No results</TYPE.body>
            </MenuItem>
          )}
          {filteredPoolList &&
            filteredPoolList.slice(0, poolsShown).map((pool) => {
              return (
                <BasicLink to={'/pool/' + pool.id} key={pool.id} onClick={onDismiss}>
                  <MenuItem>
                    <RowFixed>
                      <FormattedName text={pool.name} maxCharacters={20} style={{ marginRight: '6px' }} />
                    </RowFixed>
                  </MenuItem>
                </BasicLink>
              )
            })}
          <Heading
            hide={!(Object.keys(filteredPoolList).length > 3 && Object.keys(filteredPoolList).length >= poolsShown)}
          >
            <Blue
              onClick={() => {
                setPoolsShown(poolsShown + 5)
              }}
            >
              See more...
            </Blue>
          </Heading>
        </div>
        <Heading>
          <Gray>NFT Pools</Gray>
        </Heading>
        <div>
          {Object.keys(filteredNFTPoolList).length === 0 && (
            <MenuItem>
              <TYPE.body>No results</TYPE.body>
            </MenuItem>
          )}
          {filteredNFTPoolList.slice(0, NFTPoolsShown).map((NFTPool) => {
            return (
              <BasicLink to={'/nftpool/' + NFTPool.id} key={NFTPool.id} onClick={onDismiss}>
                <MenuItem>
                  <RowFixed>
                    <FormattedName text={NFTPool.name} maxCharacters={20} style={{ marginRight: '6px' }} />
                  </RowFixed>
                </MenuItem>
              </BasicLink>
            )
          })}

          <Heading
            hide={!(Object.keys(filteredNFTPoolList).length > 3 && Object.keys(filteredNFTPoolList).length >= NFTPoolsShown)}
          >
            <Blue
              onClick={() => {
                setNFTPoolsShown(NFTPoolsShown + 5)
              }}
            >
              See more...
            </Blue>
          </Heading>
        </div>
      </Menu>
    </Container>
  )
}

export default Search
