import { useState, useEffect, useCallback } from 'react'
import { useSSE } from './useSSE'

const API_URL = 'http://localhost:3000/api'

export function useServer() {
  const [items, setItems] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [connectionState, setConnectionState] = useState('disconnected')

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/review`)
      if (!response.ok) {
        throw new Error(`Failed to fetch entries: ${response.statusText}`)
      }
      const data = await response.json()
      setItems(data.reverse()) // Show newest first
      setError(null)
    } catch (error) {
      console.error('Error fetching entries:', error)
      setError(error.message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Handle SSE messages
  const handleSSEMessage = useCallback((message) => {
    console.log('SSE message received:', message)

    switch (message.type) {
      case 'connected':
        console.log('SSE connected')
        break

      case 'entry:created':
        // Only add if it's untagged (no statuses)
        if (!message.data.statuses || message.data.statuses.length === 0) {
          setItems(prevItems => {
            // Check if entry already exists (avoid duplicates)
            // This includes checking for temporary IDs that need to be replaced
            const exists = prevItems.some(item =>
              item.id === message.data.id ||
              // Don't add if we have a pending item with the same message from the same source
              (item._pending && item.message === message.data.message &&
               item.source?.app === message.data.source?.app)
            )
            if (exists) return prevItems
            return [message.data, ...prevItems]
          })
        }
        break

      case 'entry:tagged':
        // Remove entry when it gets tagged
        setItems(prevItems =>
          prevItems.filter(item => item.id !== message.data.entry.id)
        )
        break

      case 'entry:untagged':
        // Add entry back if all tags are removed
        if (!message.data.entry.statuses || message.data.entry.statuses.length === 0) {
          setItems(prevItems => {
            // Check if already exists
            const exists = prevItems.some(item => item.id === message.data.entry.id)
            if (exists) return prevItems
            // Add to beginning
            return [message.data.entry, ...prevItems]
          })
        }
        break

      default:
        break
    }
  }, [])

  // Setup SSE connection
  const { connectionState: sseState } = useSSE(`${API_URL}/events`, handleSSEMessage)

  useEffect(() => {
    setConnectionState(sseState)
  }, [sseState])

  // Initial fetch and refetch when connection comes online
  useEffect(() => {
    fetchEntries()
  }, [])

  // Auto-refresh when connection state changes to connected after being offline
  useEffect(() => {
    if (connectionState === 'connected' && error) {
      fetchEntries()
    }
  }, [connectionState, error, fetchEntries])

  const createEntry = async (message, source) => {
    // Create optimistic item with pending status
    const tempId = `temp_${Date.now()}`
    const optimisticItem = {
      id: tempId,
      message: message,
      timestamp: new Date().toISOString(),
      statuses: [],
      source: source,
      _pending: true
    }

    // Add optimistically
    setItems(prevItems => [optimisticItem, ...prevItems])

    try {
      const response = await fetch(`${API_URL}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          source: source
        })
      })

      if (response.ok) {
        const newItem = await response.json()
        // Replace optimistic item with real one
        setItems(prevItems =>
          prevItems.map(item => item.id === tempId ? newItem : item)
        )
        return { success: true, item: newItem }
      } else {
        throw new Error(`Failed to create entry: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error creating entry:', error)
      // Mark item as failed
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === tempId
            ? { ...item, _pending: false, _error: error.message }
            : item
        )
      )
      return { success: false, error: error.message }
    }
  }

  const removeFailedItem = (itemId) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId))
  }

  return {
    items,
    createEntry,
    removeFailedItem,
    error,
    loading,
    connectionState,
    refetch: fetchEntries
  }
}
