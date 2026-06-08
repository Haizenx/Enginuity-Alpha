import { useState } from "react";
import { Send } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

const MessageInput = ({ selectedUser, onSent }) => {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  
  // Use store's sendMessage function
  const sendMessageFromStore = useChatStore((s) => s.sendMessage);

  const sendMessage = async () => {
    const body = (text || "").trim();
    if (!body || !selectedUser?._id) return;
    
    setSending(true);
    try {
      await sendMessageFromStore({ text: body });
      
      // Notify parent component
      onSent?.({
        text: body,
        createdAt: new Date().toISOString(),
      });
      
      setText("");
    } catch (e) {
      console.error("sendMessage error:", e);
    } finally {
      setSending(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    await sendMessage();
  };

  return (
    <div className="p-4 md:p-6 bg-transparent">
      <form onSubmit={onSubmit} className="flex gap-3 bg-white p-2 md:p-2.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 transition-shadow focus-within:shadow-[0_8px_30px_rgb(79,70,229,0.15)] focus-within:border-indigo-100">
        <input
          className="flex-1 bg-transparent border-0 focus:ring-0 text-slate-800 px-4 placeholder:text-slate-400 outline-none w-full"
          placeholder={`Message ${selectedUser?.fullName || "user"}...`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          className="w-12 h-12 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:shadow-none flex-shrink-0"
          disabled={sending || !text.trim() || !selectedUser?._id}
        >
          <Send className="size-5 ml-1" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;