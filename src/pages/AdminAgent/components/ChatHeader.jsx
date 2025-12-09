import React from 'react';
import { Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ChatHeader = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{t('admin.agent.title')}</h1>
          <p className="text-sm text-gray-500">{t('admin.agent.subtitle')}</p>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;

