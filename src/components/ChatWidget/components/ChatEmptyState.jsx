export default function ChatEmptyState({ icon, title, subtitle, animate = false }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-5">
      <div
        className={`w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white flex items-center justify-center mb-5 shadow-lg shadow-pink-500/30 ${
          animate ? "animate-pulse" : ""
        }`}
      >
        {icon}
      </div>
      {title && (
        <h4 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
          {title}
        </h4>
      )}
      {subtitle && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
      )}
    </div>
  );
}


