import express from 'express';
import dotenv from 'dotenv';
import AgoraToken from 'agora-token'; // CommonJS wrapper
const { RtcTokenBuilder, RtcRole } = AgoraToken;

dotenv.config();
const router = express.Router();

const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERT = process.env.AGORA_APP_CERT;

const assertCreds = () => {
  if (!AGORA_APP_ID || !AGORA_APP_CERT) {
    throw new Error('Missing AGORA_APP_ID or AGORA_APP_CERT');
  }
};

// ---------------------------------------------------------------------------
// 📺 Generate deterministic channel name for 1-to-1 calls
// Example request:
// POST /api/video/agora/channel
// Body: { "userA": "alice", "userB": "bob" }
// ---------------------------------------------------------------------------
router.post('/agora/channel', (req, res) => {
  try {
    const { userA, userB } = req.body || {};
    if (!userA || !userB)
      return res.status(400).json({ error: 'userA and userB required' });

    const id1 = String(userA).slice(0, 8);
    const id2 = String(userB).slice(0, 8);
    const channel = `call_${[id1, id2].sort().join('_')}`;

    return res.json({ channel });
  } catch (e) {
    console.error('Channel error:', e);
    return res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// 🎟️ Issue Agora RTC token for a given channel and uid
// Example request:
// POST /api/video/agora/token
// Body: { "channel": "call_alice_bob", "uid": 12345 }
// ---------------------------------------------------------------------------
router.post('/agora/token', (req, res) => {
  try {
    assertCreds();

    const { channel, uid, role = 'publisher', expireSeconds = 3600 } = req.body || {};
    if (!channel)
      return res.status(400).json({ error: 'channel is required' });
    if (!Number.isInteger(uid))
      return res.status(400).json({ error: 'numeric uid is required' });

    const agoraRole =
      role === 'audience' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

    const now = Math.floor(Date.now() / 1000);
    const privilegeExpireTs = now + (Number(expireSeconds) || 3600);

    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERT,
      channel,
      uid,
      agoraRole,
      privilegeExpireTs
    );

    console.log('🎫 ISSUED TOKEN', {
      appId: AGORA_APP_ID.slice(0, 6),
      channel,
      uid,
      role,
      expireAt: privilegeExpireTs
    });

    return res.json({
      appId: AGORA_APP_ID,
      channel,
      token,
      uid,
      expireAt: privilegeExpireTs
    });
  } catch (e) {
    console.error('Agora token error:', e);
    return res.status(500).json({ error: e.message });
  }
});

export default router;
