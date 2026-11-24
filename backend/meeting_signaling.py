"""
AuRA_AuDTEX Audio-Only Meeting Room WebSocket Signaling & Passcode Security Engine
- Zero video, zero third-party SaaS dependencies, 100% Python stdlib cryptography.
- Salted PBKDF2-HMAC-SHA256 passcode hashing (never stores or broadcasts plaintext PINs).
- Constant-time verification (hmac.compare_digest) + per-IP/room brute-force lockout.
- Enforces authentication BEFORE a socket can join, receive peer lists, or signal WebRTC.
"""

import time
import json
import hmac
import hashlib
import secrets
import asyncio
from typing import Dict, Any, Optional, Tuple
from fastapi import WebSocket

PBKDF2_ITERATIONS = 120_000
MIN_PASSCODE_LEN = 4
MAX_PASSCODE_LEN = 16
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_SEC = 300.0  # 5 minutes


def normalize_room_id(room_id: str) -> str:
    cleaned = "".join(c for c in (room_id or "").strip().upper() if c.isalnum() or c in "-_")
    return cleaned[:24]


def normalize_passcode(passcode: Optional[str]) -> str:
    if not passcode:
        return ""
    return passcode.strip()


def validate_passcode_format(passcode: str) -> Optional[str]:
    if len(passcode) < MIN_PASSCODE_LEN:
        return f"Passcode must be at least {MIN_PASSCODE_LEN} characters."
    if len(passcode) > MAX_PASSCODE_LEN:
        return f"Passcode cannot exceed {MAX_PASSCODE_LEN} characters."
    return None


def _hash_passcode_sync(passcode: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac(
        "sha256",
        passcode.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )


async def create_passcode_hash(passcode: str) -> Tuple[bytes, bytes]:
    salt = secrets.token_bytes(16)
    digest = await asyncio.to_thread(_hash_passcode_sync, passcode, salt)
    return salt, digest


async def verify_passcode_hash(passcode: str, salt: bytes, expected_digest: bytes) -> bool:
    candidate = await asyncio.to_thread(_hash_passcode_sync, passcode, salt)
    return hmac.compare_digest(candidate, expected_digest)


class MeetingParticipant:
    def __init__(self, peer_id: str, name: str, websocket: WebSocket, is_host: bool = False):
        self.peer_id = peer_id
        self.name = name
        self.websocket = websocket
        self.is_host = is_host
        self.is_muted = False
        self.is_speaking = False
        self.joined_at = time.time()

    def to_public_dict(self) -> Dict[str, Any]:
        return {
            "peerId": self.peer_id,
            "name": self.name,
            "isHost": self.is_host,
            "isMuted": self.is_muted,
            "isSpeaking": self.is_speaking,
        }


class AudioMeetingRoom:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.created_at = time.time()
        self.participants: Dict[str, MeetingParticipant] = {}
        self.is_recording: bool = False
        self.recording_started_at: Optional[float] = None
        self.recording_host_name: Optional[str] = None
        # Salted PBKDF2-SHA256 passcode state (plaintext is never stored)
        self.passcode_salt: Optional[bytes] = None
        self.passcode_hash: Optional[bytes] = None

    @property
    def is_locked(self) -> bool:
        return self.passcode_salt is not None and self.passcode_hash is not None

    def set_passcode_digest(self, salt: Optional[bytes], digest: Optional[bytes]) -> None:
        self.passcode_salt = salt
        self.passcode_hash = digest

    def get_recording_state(self) -> Dict[str, Any]:
        return {
            "isRecording": self.is_recording,
            "startedAt": self.recording_started_at,
            "hostName": self.recording_host_name,
        }

    def list_participants(self) -> list:
        return [p.to_public_dict() for p in self.participants.values()]


class AudioMeetingRoomManager:
    def __init__(self):
        self.rooms: Dict[str, AudioMeetingRoom] = {}
        # Key: (client_ip, room_id) -> {"fails": int, "locked_until": float, "last_seen": float}
        self._auth_failures: Dict[Tuple[str, str], Dict[str, float]] = {}

    def _prune_stale_failures(self, now: float) -> None:
        if len(self._auth_failures) < 64:
            return
        stale_keys = [
            k
            for k, v in self._auth_failures.items()
            if now - v.get("last_seen", 0.0) > LOCKOUT_DURATION_SEC * 2
        ]
        for k in stale_keys:
            self._auth_failures.pop(k, None)

    def _check_lockout(self, client_ip: str, room_id: str) -> Optional[int]:
        """Returns remaining lockout seconds if IP is rate-limited for this room, else None."""
        now = time.time()
        self._prune_stale_failures(now)
        rec = self._auth_failures.get((client_ip, room_id))
        if not rec:
            return None
        locked_until = rec.get("locked_until", 0.0)
        if now < locked_until:
            return max(1, int(locked_until - now))
        # Lockout expired — reset counter
        if locked_until > 0:
            self._auth_failures.pop((client_ip, room_id), None)
        return None

    def _record_auth_failure(self, client_ip: str, room_id: str) -> Tuple[int, int]:
        """Records a failed passcode attempt. Returns (attempts_remaining, retry_after_sec)."""
        now = time.time()
        key = (client_ip, room_id)
        rec = self._auth_failures.get(key, {"fails": 0, "locked_until": 0.0, "last_seen": now})
        rec["fails"] = int(rec["fails"]) + 1
        rec["last_seen"] = now

        if rec["fails"] >= MAX_FAILED_ATTEMPTS:
            rec["locked_until"] = now + LOCKOUT_DURATION_SEC
            self._auth_failures[key] = rec
            return 0, int(LOCKOUT_DURATION_SEC)

        self._auth_failures[key] = rec
        return max(0, MAX_FAILED_ATTEMPTS - int(rec["fails"])), 0

    def _clear_auth_failures(self, client_ip: str, room_id: str) -> None:
        self._auth_failures.pop((client_ip, room_id), None)

    def get_room_public_info(self, room_id: str) -> Dict[str, Any]:
        """
        Minimal public metadata for pre-join UX.
        Never exposes participant names, host info, or passcode details.
        """
        clean_id = normalize_room_id(room_id)
        room = self.rooms.get(clean_id)
        if not room or len(room.participants) == 0:
            return {
                "roomId": clean_id,
                "exists": False,
                "isLocked": False,
                "participantCount": 0,
                "isRecording": False,
            }
        return {
            "roomId": room.room_id,
            "exists": True,
            "isLocked": room.is_locked,
            "participantCount": len(room.participants),
            "isRecording": room.is_recording,
        }

    async def safe_send(self, ws: WebSocket, payload: Dict[str, Any]) -> None:
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            pass

    async def broadcast(
        self,
        room: AudioMeetingRoom,
        payload: Dict[str, Any],
        exclude_peer_id: Optional[str] = None,
    ) -> None:
        for pid, participant in list(room.participants.items()):
            if exclude_peer_id and pid == exclude_peer_id:
                continue
            await self.safe_send(participant.websocket, payload)

    async def authenticate_and_join(
        self,
        room_id: str,
        peer_id: str,
        name: str,
        passcode: Optional[str],
        client_ip: str,
        websocket: WebSocket,
    ) -> Tuple[Optional[AudioMeetingRoom], Optional[Dict[str, Any]]]:
        """
        Validates passcode / brute-force lockout BEFORE admitting a participant.
        Returns (room, None) on success, or (None, error_payload) on rejection.
        """
        clean_id = normalize_room_id(room_id)
        if not clean_id:
            return None, {
                "type": "auth-error",
                "code": "INVALID_ROOM",
                "closeCode": 4400,
                "message": "Invalid room code.",
            }

        clean_passcode = normalize_passcode(passcode)
        existing_room = self.rooms.get(clean_id)

        # CASE A: Joining an existing active room
        if existing_room and len(existing_room.participants) > 0:
            if existing_room.is_locked:
                lockout_remaining = self._check_lockout(client_ip, clean_id)
                if lockout_remaining is not None:
                    return None, {
                        "type": "auth-error",
                        "code": "RATE_LIMITED",
                        "closeCode": 4429,
                        "retryAfterSec": lockout_remaining,
                        "message": f"Too many incorrect passcode attempts. Try again in {lockout_remaining}s.",
                    }

                if not clean_passcode:
                    return None, {
                        "type": "auth-error",
                        "code": "PASSCODE_REQUIRED",
                        "closeCode": 4403,
                        "message": f"Room {clean_id} is locked. Enter the room passcode to join.",
                    }

                is_valid = await verify_passcode_hash(
                    clean_passcode,
                    existing_room.passcode_salt,  # type: ignore[arg-type]
                    existing_room.passcode_hash,  # type: ignore[arg-type]
                )
                if not is_valid:
                    remaining, retry_after = self._record_auth_failure(client_ip, clean_id)
                    if retry_after > 0:
                        return None, {
                            "type": "auth-error",
                            "code": "RATE_LIMITED",
                            "closeCode": 4429,
                            "attemptsRemaining": 0,
                            "retryAfterSec": retry_after,
                            "message": f"Incorrect passcode. Locked for {retry_after}s to protect this meeting.",
                        }
                    return None, {
                        "type": "auth-error",
                        "code": "INVALID_PASSCODE",
                        "closeCode": 4403,
                        "attemptsRemaining": remaining,
                        "message": f"Incorrect passcode ({remaining} attempt{'s' if remaining != 1 else ''} remaining).",
                    }

                self._clear_auth_failures(client_ip, clean_id)

            room = existing_room
            is_host = False

        # CASE B: Creating a brand-new room (caller becomes Host)
        else:
            salt: Optional[bytes] = None
            digest: Optional[bytes] = None
            if clean_passcode:
                fmt_err = validate_passcode_format(clean_passcode)
                if fmt_err:
                    return None, {
                        "type": "auth-error",
                        "code": "INVALID_PASSCODE_FORMAT",
                        "closeCode": 4400,
                        "message": fmt_err,
                    }
                salt, digest = await create_passcode_hash(clean_passcode)

            room = AudioMeetingRoom(clean_id)
            room.set_passcode_digest(salt, digest)
            self.rooms[clean_id] = room
            is_host = True

        safe_name = (name or "Guest").strip()[:32] or "Guest"
        participant = MeetingParticipant(
            peer_id=peer_id,
            name=safe_name,
            websocket=websocket,
            is_host=is_host,
        )
        room.participants[peer_id] = participant

        await self.safe_send(
            websocket,
            {
                "type": "room-joined",
                "roomId": room.room_id,
                "isLocked": room.is_locked,
                "self": participant.to_public_dict(),
                "participants": room.list_participants(),
                "recording": room.get_recording_state(),
            },
        )

        await self.broadcast(
            room,
            {
                "type": "peer-joined",
                "participant": participant.to_public_dict(),
                "participants": room.list_participants(),
            },
            exclude_peer_id=peer_id,
        )
        return room, None

    async def leave_room(self, room_id: str, peer_id: str) -> None:
        clean_id = normalize_room_id(room_id)
        room = self.rooms.get(clean_id)
        if not room or peer_id not in room.participants:
            return

        departed = room.participants.pop(peer_id)

        if departed.is_host and room.participants:
            next_host = next(iter(room.participants.values()))
            next_host.is_host = True

        if not room.participants:
            self.rooms.pop(clean_id, None)
            return

        await self.broadcast(
            room,
            {
                "type": "peer-left",
                "peerId": peer_id,
                "name": departed.name,
                "participants": room.list_participants(),
            },
        )

    async def handle_message(self, room: AudioMeetingRoom, sender_id: str, data: Dict[str, Any]) -> None:
        msg_type = data.get("type")
        sender = room.participants.get(sender_id)
        if not sender:
            return

        # 1. Peer-to-peer WebRTC Audio Signaling
        if msg_type in ("offer", "answer", "ice-candidate"):
            target_id = data.get("targetPeerId")
            target = room.participants.get(target_id) if target_id else None
            if target:
                await self.safe_send(
                    target.websocket,
                    {
                        "type": msg_type,
                        "fromPeerId": sender_id,
                        "fromName": sender.name,
                        "payload": data.get("payload"),
                    },
                )
            return

        # 2. Mute / Speaking State Broadcast
        if msg_type == "media-state":
            if "isMuted" in data:
                sender.is_muted = bool(data["isMuted"])
            if "isSpeaking" in data:
                sender.is_speaking = bool(data["isSpeaking"])
            await self.broadcast(
                room,
                {
                    "type": "participants-updated",
                    "participants": room.list_participants(),
                },
            )
            return

        # 3. Host-Only Live Room Passcode Lock / Unlock / Change
        if msg_type == "set-passcode":
            if not sender.is_host:
                await self.safe_send(
                    sender.websocket,
                    {
                        "type": "room-error",
                        "message": "Only the room host can lock or unlock this meeting.",
                    },
                )
                return

            raw_pin = data.get("passcode")
            clean_pin = normalize_passcode(raw_pin) if isinstance(raw_pin, str) else ""

            if not clean_pin:
                room.set_passcode_digest(None, None)
            else:
                fmt_err = validate_passcode_format(clean_pin)
                if fmt_err:
                    await self.safe_send(
                        sender.websocket,
                        {"type": "room-error", "message": fmt_err},
                    )
                    return
                salt, digest = await create_passcode_hash(clean_pin)
                room.set_passcode_digest(salt, digest)

            await self.broadcast(
                room,
                {
                    "type": "room-lock-updated",
                    "isLocked": room.is_locked,
                    "updatedBy": sender.name,
                },
            )
            return

        # 4. Live Recording Disclosure Broadcast
        if msg_type == "recording-state":
            is_rec = bool(data.get("isRecording", False))
            room.is_recording = is_rec
            room.recording_started_at = time.time() if is_rec else None
            room.recording_host_name = sender.name if is_rec else None
            await self.broadcast(
                room,
                {
                    "type": "recording-state",
                    "recording": room.get_recording_state(),
                    "triggeredBy": sender.name,
                },
            )
            return

        # 5. Shared Live Transcript Token Broadcast
        if msg_type == "transcript-batch":
            tokens = data.get("tokens")
            if isinstance(tokens, list) and tokens:
                await self.broadcast(
                    room,
                    {
                        "type": "transcript-batch",
                        "speaker": data.get("speaker") or sender.name,
                        "tokens": tokens,
                    },
                    exclude_peer_id=sender_id,
                )
            return


meeting_room_manager = AudioMeetingRoomManager()
