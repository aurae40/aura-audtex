"""
AuRA_AuDTEX Audio-Only Meeting Room WebSocket Signaling Engine
Zero video, zero third-party SaaS fees. Coordinates peer-to-peer WebRTC audio,
real-time speaking/mute badges, mandatory live-recording disclosure alerts,
and synchronized live transcript broadcasting to every participant in the room.
"""

import time
import json
from typing import Dict, Any, Optional
from fastapi import WebSocket


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

    def get_or_create_room(self, room_id: str) -> AudioMeetingRoom:
        clean_id = room_id.strip().upper()[:24]
        if clean_id not in self.rooms:
            self.rooms[clean_id] = AudioMeetingRoom(clean_id)
        return self.rooms[clean_id]

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

    async def join_room(
        self,
        room_id: str,
        peer_id: str,
        name: str,
        websocket: WebSocket,
    ) -> AudioMeetingRoom:
        room = self.get_or_create_room(room_id)
        is_host = len(room.participants) == 0
        participant = MeetingParticipant(peer_id=peer_id, name=name[:32] or "Guest", websocket=websocket, is_host=is_host)
        room.participants[peer_id] = participant

        # Send full room snapshot + current live recording disclosure state to the new participant
        await self.safe_send(
            websocket,
            {
                "type": "room-joined",
                "roomId": room.room_id,
                "self": participant.to_public_dict(),
                "participants": room.list_participants(),
                "recording": room.get_recording_state(),
            },
        )

        # Notify existing peers so they initiate audio-only WebRTC offers to the newcomer
        await self.broadcast(
            room,
            {
                "type": "peer-joined",
                "participant": participant.to_public_dict(),
                "participants": room.list_participants(),
            },
            exclude_peer_id=peer_id,
        )
        return room

    async def leave_room(self, room_id: str, peer_id: str) -> None:
        clean_id = room_id.strip().upper()[:24]
        room = self.rooms.get(clean_id)
        if not room or peer_id not in room.participants:
            return

        departed = room.participants.pop(peer_id)

        # Reassign host if the host left while others remain
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

        # 1. Peer-to-peer WebRTC Audio Signaling (offer / answer / ice-candidate)
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

        # 3. Live Recording Notification Broadcast (Mandatory disclosure to everyone in the room)
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

        # 4. Shared Live Transcript Token Broadcast
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
