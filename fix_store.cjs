const fs = require('fs');
const file = 'frontend/chat-front-end/src/store/useChatStore.js';
let content = fs.readFileSync(file, 'utf8');

// Update sendMessage
content = content.replace(
  'set({ messages: [...messages, res.data] });',
  `set((state) => ({ 
        messages: [...state.messages, res.data],
        users: state.users.map(u => 
          u._id === selectedUser._id 
            ? { ...u, updatedAt: new Date().toISOString(), lastActivity: new Date().toISOString() } 
            : u
        )
      }));`
);

// Update subscribeToMessages listener
const oldListener = `      const isRelevantMessage = selectedUser && (
        (newMessage.senderId === selectedUser._id && newMessage.receiverId === authUser._id) ||
        (newMessage.senderId === authUser._id && newMessage.receiverId === selectedUser._id)
      );

      if (isRelevantMessage) {
        console.log("✅ Adding message to current conversation");
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      } else {
        console.log("⚠️ Message not for current conversation");
        if (newMessage.senderId !== authUser._id) {
          toast.success("New message received!");
        }
      }`;

const newListener = `      const isRelevantMessage = selectedUser && (
        (newMessage.senderId === selectedUser._id && newMessage.receiverId === authUser._id) ||
        (newMessage.senderId === authUser._id && newMessage.receiverId === selectedUser._id)
      );

      const otherUserId = newMessage.senderId === authUser._id ? newMessage.receiverId : newMessage.senderId;

      if (isRelevantMessage) {
        console.log("✅ Adding message to current conversation");
        set((state) => ({
          messages: [...state.messages, newMessage],
          users: state.users.map(u => 
            u._id === otherUserId 
              ? { ...u, updatedAt: new Date().toISOString(), lastActivity: new Date().toISOString() }
              : u
          )
        }));
      } else {
        console.log("⚠️ Message not for current conversation");
        set((state) => ({
          users: state.users.map(u => 
            u._id === otherUserId 
              ? { ...u, updatedAt: new Date().toISOString(), lastActivity: new Date().toISOString() }
              : u
          )
        }));
        if (newMessage.senderId !== authUser._id) {
          toast.success("New message received!");
        }
      }`;

content = content.replace(oldListener, newListener);

fs.writeFileSync(file, content);
console.log('Store updated');
