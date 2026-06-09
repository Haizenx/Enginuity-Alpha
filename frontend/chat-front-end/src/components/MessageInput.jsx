import { useRef, useState } from "react";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { useChatStore } from "../store/useChatStore";

const MessageInput = ({ selectedUser, onSent }) => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  
  const sendMessageFromStore = useChatStore((s) => s.sendMessage);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendMessage = async () => {
    const body = (text || "").trim();
    if (!body && !imagePreview) return;
    if (!selectedUser?._id) return;
    
    setSending(true);
    try {
      await sendMessageFromStore({
        text: body,
        image: imagePreview,
      });
      
      onSent?.({
        text: body,
        image: imagePreview,
        createdAt: new Date().toISOString(),
      });
      
      setText("");
      removeImage();
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
    <div className="p-4 md:p-6 bg-transparent flex flex-col gap-2">
      {imagePreview && (
        <div className="relative w-24 h-24 mb-2">
          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl shadow-md border border-slate-200" />
          <button
            onClick={removeImage}
            className="absolute -top-2 -right-2 w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center shadow-md text-slate-500 hover:text-slate-800 transition-colors border border-slate-200"
            type="button"
          >
            <X size={14} strokeWidth={3} />
          </button>
        </div>
      )}
      
      <form onSubmit={onSubmit} className="flex gap-3 bg-white p-2 md:p-2.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 transition-shadow focus-within:shadow-[0_8px_30px_rgb(79,70,229,0.15)] focus-within:border-indigo-100 items-center">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImageChange}
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors shrink-0 \${imagePreview ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
        >
          <Image size={20} />
        </button>

        <input
          className="flex-1 bg-transparent border-0 focus:ring-0 text-slate-800 px-2 placeholder:text-slate-400 outline-none w-full"
          placeholder={`Message \${selectedUser?.fullName || "user"}...`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          className="w-12 h-12 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:shadow-none flex-shrink-0"
          disabled={sending || (!text.trim() && !imagePreview) || !selectedUser?._id}
        >
          <Send className="size-5 ml-1" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
