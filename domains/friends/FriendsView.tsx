import React, { useState, useEffect, useRef, useMemo } from 'react'
import { FriendsMode, User } from '../../lib/types'
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  fetchFriends,
  fetchOutgoingFriendRequests,
  fetchPendingFriendRequests,
  removeFriend,
  type OutgoingFriendRequest,
  type PendingFriendRequest,
} from '../../services/friendService'
import { useClickOutside } from '../../lib/hooks/useClickOutside'
import { SearchInput } from '../../lib/ui/components/SearchInput'
import { LoadingSpinner } from '../../lib/ui/components/LoadingSpinner'
import { PendingRequestsSection } from './components/PendingRequestsSection'
import { FriendsListSection } from './components/FriendsListSection'

interface FriendsViewProps {
  activeTab: FriendsMode
}

export const FriendsView: React.FC<FriendsViewProps> = ({ activeTab }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [friends, setFriends] = useState<User[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<OutgoingFriendRequest[]>([])
  const [loadingFriends, setLoadingFriends] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [loadingOutgoing, setLoadingOutgoing] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Close menu when clicking outside
  useClickOutside(menuRef, () => setOpenMenuId(null), openMenuId !== null)

  // Fetch friends when FRIENDS tab is active
  useEffect(() => {
    const loadFriends = async () => {
      if (activeTab === 'FRIENDS') {
        setLoadingFriends(true)
        try {
          const fetchedFriends = await fetchFriends()
          setFriends(fetchedFriends)
        } catch (error) {
          console.error('Error loading friends:', error)
          setFriends([])
        } finally {
          setLoadingFriends(false)
        }
      }
    }
    loadFriends()
  }, [activeTab])

  useEffect(() => {
    const loadRequests = async () => {
      if (activeTab === 'FRIENDS') {
        setLoadingRequests(true)
        try {
          const fetchedRequests = await fetchPendingFriendRequests()
          setPendingRequests(fetchedRequests)
        } catch (error) {
          console.error('Error loading friend requests:', error)
          setPendingRequests([])
        } finally {
          setLoadingRequests(false)
        }
      }
    }
    loadRequests()
  }, [activeTab])

  useEffect(() => {
    const loadOutgoing = async () => {
      if (activeTab === 'FRIENDS') {
        setLoadingOutgoing(true)
        try {
          const fetchedOutgoing = await fetchOutgoingFriendRequests()
          setOutgoingRequests(fetchedOutgoing)
        } catch (error) {
          console.error('Error loading outgoing requests:', error)
          setOutgoingRequests([])
        } finally {
          setLoadingOutgoing(false)
        }
      }
    }
    loadOutgoing()
  }, [activeTab])

  const filteredFriends = useMemo(
    () => friends.filter((friend) => friend.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [friends, searchTerm]
  )

  const groupedFriends = useMemo(() => {
    const groups: Record<string, User[]> = {}
    filteredFriends.forEach((friend) => {
      const firstLetter = friend.name.charAt(0).toUpperCase()
      if (!groups[firstLetter]) {
        groups[firstLetter] = []
      }
      groups[firstLetter].push(friend)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredFriends])

  const updateProcessingIds = (id: string, isProcessing: boolean) => {
    setProcessingIds((prev) => {
      const next = new Set(prev)
      isProcessing ? next.add(id) : next.delete(id)
      return next
    })
  }

  const handleRemoveFriend = async (friend: User) => {
    if (!window.confirm(`Remove ${friend.name} from your friends?`)) return
    updateProcessingIds(friend.id, true)
    const success = await removeFriend(friend.id)
    if (success) {
      setFriends((prev) => prev.filter((f) => f.id !== friend.id))
    }
    updateProcessingIds(friend.id, false)
  }

  const handleAcceptRequest = async (request: PendingFriendRequest) => {
    updateProcessingIds(request.id, true)
    const success = await acceptFriendRequest(request.id, request.requesterId)
    if (success) {
      setPendingRequests((prev) => prev.filter((r) => r.id !== request.id))
      setFriends((prev) => [request.requester, ...prev])
    }
    updateProcessingIds(request.id, false)
  }

  const handleDeclineRequest = async (request: PendingFriendRequest) => {
    updateProcessingIds(request.id, true)
    const success = await declineFriendRequest(request.id)
    if (success) {
      setPendingRequests((prev) => prev.filter((r) => r.id !== request.id))
    }
    updateProcessingIds(request.id, false)
  }

  const handleCancelRequest = async (request: OutgoingFriendRequest) => {
    updateProcessingIds(request.id, true)
    const success = await cancelFriendRequest(request.id)
    if (success) {
      setOutgoingRequests((prev) => prev.filter((r) => r.id !== request.id))
    }
    updateProcessingIds(request.id, false)
  }

  const handleMenuToggle = (friendId: string) => {
    setOpenMenuId((prev) => (prev === friendId ? null : friendId))
  }

  return (
    <div className="w-full pb-20 pt-2 space-y-6">
      <div className="bg-slate-900/50 p-1">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search friends..."
          size="lg"
        />
      </div>

      {activeTab === 'FRIENDS' && (
        <div className="animate-fade-in">
          {loadingFriends ? (
            <LoadingSpinner message="Loading friends..." />
          ) : (
            <>
              <PendingRequestsSection
                incomingRequests={pendingRequests}
                outgoingRequests={outgoingRequests}
                isLoadingIncoming={loadingRequests}
                isLoadingOutgoing={loadingOutgoing}
                processingIds={processingIds}
                onAccept={handleAcceptRequest}
                onDecline={handleDeclineRequest}
                onCancel={handleCancelRequest}
              />

              <FriendsListSection
                groupedFriends={groupedFriends}
                filteredCount={filteredFriends.length}
                searchTerm={searchTerm}
                openMenuId={openMenuId}
                processingIds={processingIds}
                menuRef={menuRef}
                onMenuToggle={handleMenuToggle}
                onRemoveFriend={handleRemoveFriend}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
