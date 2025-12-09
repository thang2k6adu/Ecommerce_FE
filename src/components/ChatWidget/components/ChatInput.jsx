import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ChatInput({ value, onChange, onSubmit, disabled, placeholder = "Nhập tin nhắn..." }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!disabled && value.trim()) {
      onSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 flex gap-2"
    >
      <Input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-1 rounded-full border-gray-300 dark:border-gray-700 focus-visible:ring-pink-500 dark:focus-visible:ring-pink-400"
      />
      <Button
        type="submit"
        disabled={disabled || !value.trim()}
        size="icon"
        className="rounded-full bg-gradient-to-br from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white disabled:opacity-50 disabled:cursor-not-allowed w-11 h-11 flex-shrink-0 shadow-lg shadow-pink-500/30"
      >
        <Send className="w-5 h-5" />
      </Button>
    </form>
  );
}


