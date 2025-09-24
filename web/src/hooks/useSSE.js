import { useEffect, useRef, useCallback, useState } from 'react'

export function useSSE(url, onMessage) {
  const [connectionState, setConnectionState] = useState('disconnected')
  const eventSourceRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setConnectionState('connecting')
    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('SSE connection established')
      setConnectionState('connected')
      reconnectAttemptsRef.current = 0
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type !== 'heartbeat') {
          onMessage(data)
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      setConnectionState('error')
      eventSource.close()

      // Implement exponential backoff for reconnection
      const attempts = reconnectAttemptsRef.current
      const delay = Math.min(1000 * Math.pow(2, attempts), 30000)

      console.log(`Reconnecting in ${delay}ms (attempt ${attempts + 1})`)

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current += 1
        connect()
      }, delay)
    }

    return eventSource
  }, [url, onMessage])

  useEffect(() => {
    const eventSource = connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (eventSource) {
        eventSource.close()
      }
      setConnectionState('disconnected')
    }
  }, [connect])

  return { connectionState }
}