export default function MessageList({
  messages,
  selectedUserId,
  formatTime,
  messagesEndRef,
  loading = false
}) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50 space-y-3">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2 text-gray-500">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading messages...</span>
          </div>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No messages yet. Start the conversation!
        </div>
      ) : (
        messages
          .filter((msg) => msg.content && msg.content.trim()) // Filter out empty messages
          .map((msg, index) => {
            const isSentByMe = msg.senderId !== selectedUserId;

            return (
              <div
                key={msg.id || index}
                className={`flex flex-col max-w-[70%] 
                  ${isSentByMe ? "self-end items-end ml-auto" : "self-start items-start"}`}
              >
                <div className={`px-4 py-3 rounded-2xl break-words ${
                  isSentByMe 
                    ? "bg-blue-600 text-white rounded-br-sm" 
                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
                }`}>
                  {msg.content}
                </div>

                <div className="text-xs text-gray-400 mt-1 px-2">
                  {formatTime(msg.createdAt)}
                </div>
              </div>
            );
          })
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
