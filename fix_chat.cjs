const fs = require('fs');
const file = 'frontend/chat-front-end/src/components/ChatContainer.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add useRef to React import if not there
if (content.includes('import { useEffect } from "react"')) {
  content = content.replace('import { useEffect } from "react"', 'import { useEffect, useRef } from "react"');
}

// Modify MessagesList
const newList = `const MessagesList = ({ meId, messages }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
      {messages?.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-70">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
             <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
          </div>
          <span className="text-sm font-medium">No messages yet. Say hello!</span>
        </div>
      )}
      {messages?.map((m) => (
        <ChatMessage key={m._id || \`\${m.senderId}-\${m.createdAt}\`} meId={meId} msg={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};`;

content = content.replace(/const MessagesList = \([\s\S]*?\}\);/, newList);

fs.writeFileSync(file, content);
console.log('Chat scroll fixed');
