import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatHeader({ title = "Chat hỗ trợ", status = "Đang hoạt động", onClose }) {
  return (
    <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-5 rounded-t-2xl flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <MessageCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-semibold text-base">{title}</h3>
          <p className="text-xs text-pink-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            {status}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="text-white hover:bg-white/20 rounded-lg h-9 w-9"
      >
        <X className="w-5 h-5" />
      </Button>
    </div>
  );
}



