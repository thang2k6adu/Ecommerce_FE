import React from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ChatInput = ({ 
  inputText, 
  setInputText, 
  isLoading, 
  onSendMessage, 
  onKeyPress 
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white border-t border-gray-200 px-6 py-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder={t('admin.agent.placeholder')}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={onKeyPress}
          disabled={isLoading}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-full 
            focus:border-blue-600 focus:ring-2 focus:ring-blue-100 
            disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          onClick={onSendMessage}
          disabled={!inputText.trim() || isLoading}
          className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center 
            hover:bg-blue-700 active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2 px-2">
        💡 {t('admin.agent.suggestion')}
      </p>
    </div>
  );
};

export default ChatInput;

