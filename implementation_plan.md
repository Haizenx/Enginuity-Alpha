# Video Call Screen Sharing & Post-Call Message Fix

## Goal
Fix the missing post-call duration message and add Screen Sharing functionality to the Video Call modal so users (like Project Managers) can share blueprints during a call.

## Proposed Changes

### 1. Fix Post-Call Message
- **File:** `frontend/chat-front-end/src/components/VideoCallModal.jsx`
- **Issue:** The post-call message was only being sent when the *caller* manually clicked the "End Call" button. If the *receiver* ended the call, the modal just closed and no message was sent.
- **Fix:** Move the `sendSystemMessage` logic into a `useEffect` cleanup function for the caller. This guarantees that whenever the call ends (regardless of who clicked "End Call"), the caller's app will calculate the duration and send the message to the chat exactly once.

### 2. Implement Screen Sharing
- **File:** `frontend/chat-front-end/src/components/VideoCallModal.jsx`
- **Addition:** Add a "Share Screen" button to the control bar.
- **Logic:** 
  - Use `AgoraRTC.createScreenVideoTrack()` when the user clicks the button.
  - Temporarily unpublish the local camera video track and publish the screen track to the channel so the remote user sees the screen.
  - Listen for the browser's native "Stop Sharing" event to automatically revert back to the camera track.
  - Update the UI to highlight when screen sharing is active.

## Open Questions
- Do you want the screen share to completely replace your camera feed for the other person, or would you prefer a more complex layout where they see both your screen and your face? (Replacing the camera feed with the screen share is the standard, most reliable approach).

## User Review Required
Please review the proposed plan and let me know if you approve or if you have any feedback on the open questions!
