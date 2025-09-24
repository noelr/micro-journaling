import { useState, useEffect, useRef } from 'react'
import { useServer } from './hooks/useServer'

function App() {
  const [inputValue, setInputValue] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const { items, createEntry, removeFailedItem, error, loading, connectionState } = useServer()
  const prevItemsLength = useRef(0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (inputValue.trim()) {
      const source = { app: 'web', url: window.location.href }
      await createEntry(inputValue, source)
      setInputValue('')
      setFocusedIndex(-1)
    }
  }


  // Adjust focusedIndex when new items are added to the list
  useEffect(() => {
    if (prevItemsLength.current < items.length && focusedIndex >= 0) {
      // New item(s) were added to the top, adjust index to keep focus on the same item
      const itemsAdded = items.length - prevItemsLength.current
      setFocusedIndex(prev => prev + itemsAdded)
    }
    prevItemsLength.current = items.length
  }, [items.length, focusedIndex])

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't listen for j/k when input is focused
      if (document.activeElement?.tagName === 'INPUT') {
        return
      }

      if (e.key === 'j' && items.length > 0) {
        e.preventDefault()
        setFocusedIndex(prev => prev < items.length - 1 ? prev + 1 : prev)
      } else if (e.key === 'k' && items.length > 0) {
        e.preventDefault()
        setFocusedIndex(prev => prev > 0 ? prev - 1 : 0)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [items.length])

  // Handle focus when focusedIndex changes
  useEffect(() => {
    if (focusedIndex >= 0) {
      const element = document.querySelector(`[data-index="${focusedIndex}"]`)
      if (element) {
        element.focus()
      }
    }
  }, [focusedIndex])

  return (
    <div className="flex h-screen bg-gray-100 gap-6 p-6">
      {/* Left Panel - 2/3 width */}
      <div className="flex-2 bg-gray-100 flex flex-col">
        {/* Search Header with Connection Status */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <form onSubmit={handleSubmit} className="flex-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Add a tought"
                className="w-full px-4 py-3 bg-white rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </form>
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm">
              <div className={`w-2 h-2 rounded-full ${
                connectionState === 'connected' ? 'bg-green-500' :
                connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`} />
              <span className="text-xs text-gray-600 font-medium uppercase">
                {connectionState === 'connected' ? 'Live' :
                 connectionState === 'connecting' ? 'Connecting' :
                 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-700">Failed to load entries: {error}</span>
              {connectionState !== 'connected' && (
                <span className="text-sm text-red-600 ml-2">(Waiting for connection...)</span>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600 mr-2"></div>
              <span className="text-sm text-blue-700">Loading entries...</span>
            </div>
          </div>
        )}

        {/* Sort Header */}
        {items.length > 0 && (
          <div className="px-3 py-2 text-xs text-gray-500 font-medium">
            {items.length} RESULTS SORTED BY DATE ▼
          </div>
        )}

        {/* List Items */}
        <div className="flex-1 overflow-y-auto space-y-3 p-2">
          {items.map((item, index) => {
            const date = new Date(item.timestamp)
            const statusStr = item.statuses && item.statuses.length > 0
              ? item.statuses.map(s => s.type).join(', ') + ' '
              : ''

            return (
              <div
                key={item.id}
                data-index={index}
                tabIndex={0}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(-1)}
                className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 relative"
              >
                <div className="flex items-start">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <h3 className="text-base font-medium text-gray-900">
                          {statusStr && (
                            <span className="text-sm text-blue-600 mr-2">[{statusStr.trim()}]</span>
                          )}
                          {item.message}
                        </h3>
                        {item._pending && (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
                        )}
                        {item._error && (
                          <button
                            onClick={() => removeFailedItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                            title={item._error}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <span className="text-sm text-gray-400">{date.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Panel - 1/3 width - Selected Item Details */}
      <div className="flex-1">
        {focusedIndex >= 0 && items[focusedIndex] ? (
          <div className="p-6 bg-white border-l rounded-lg shadow-sm border-gray-200">
            <div className="space-y-4">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Entry Details</div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">ID</div>
                  <div className="text-sm font-mono">{items[focusedIndex].id}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">Message</div>
                  <div className="text-sm">{items[focusedIndex].message}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">Timestamp</div>
                  <div className="text-sm">{new Date(items[focusedIndex].timestamp).toLocaleString()}</div>
                </div>

                {items[focusedIndex].statuses && items[focusedIndex].statuses.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Tags</div>
                    <div className="flex flex-wrap gap-1">
                      {items[focusedIndex].statuses.map((status, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {status.type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {items[focusedIndex].source && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Source</div>
                    <div className="text-sm space-y-1">
                      {items[focusedIndex].source.app && (
                        <div><span className="text-gray-500">App:</span> {items[focusedIndex].source.app}</div>
                      )}
                      {items[focusedIndex].source.pwd && (
                        <div><span className="text-gray-500">Path:</span> <span className="font-mono text-xs">{items[focusedIndex].source.pwd}</span></div>
                      )}
                      {items[focusedIndex].source.url && (
                        <div><span className="text-gray-500">URL:</span> <span className="font-mono text-xs break-all">{items[focusedIndex].source.url}</span></div>
                      )}
                      {items[focusedIndex].source.ip && (
                        <div><span className="text-gray-500">IP:</span> {items[focusedIndex].source.ip}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-1 text-center text-xs text-gray-400 font-medium">
            {items.length > 0 ? 'SELECT AN ENTRY' : error ? 'UNABLE TO LOAD ENTRIES' : loading ? 'LOADING...' : 'NO ENTRIES'}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
