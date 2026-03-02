"use client";

import React, { useEffect, useRef, useState } from "react";
import PeerManager from "../app/_lib/peerManager";

const VideoRoom = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<WebSocket>(null);
  const [peerManager, setPeerManager] = useState<PeerManager | null>(null);
  const [remoteStream, setRemoteStream] = useState<Record<string, MediaStream>>(
    {},
  );

  useEffect(() => {
    const ws = new WebSocket("wss://528f-120-61-42-79.ngrok-free.app");

    ws.onopen = async () => {
      console.log("Connected to signaling server");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio : true
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      console.log(new Boolean(socketRef.current), socketRef.current);
      if (socketRef.current) {
        console.log(123);
        const manager = new PeerManager(
          socketRef.current,
          stream,
          (id: string, remoteStream: MediaStream) => {
            setRemoteStream((prev) => ({
              ...prev,
              [id]: remoteStream,
            }));
          },
          (id: string) => {
            setRemoteStream((prev) => {
              const updated: Record<string, MediaStream> = { ...prev };
              delete updated[id];
              return updated;
            });
          },
        );

        setPeerManager(manager);
      }

      ws.send(
        JSON.stringify({
          type: "join-room",
          roomId: "test-room",
        }),
      );
    };

    socketRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  //   useEffect(() => {
  //     async function init() {
  //       const stream = await navigator.mediaDevices.getUserMedia({
  //         video: true,
  //         audio: true,
  //       });

  //       if (localVideoRef.current) {
  //         localVideoRef.current.srcObject = stream;
  //       }
  //       if (socketRef.current) {
  //         const manager = new PeerManager(
  //           socketRef.current,
  //           stream,
  //           (id: string, remoteStream: MediaStream) => {
  //             setRemoteStream((prev) => ({
  //               ...prev,
  //               [id]: remoteStream,
  //             }));
  //           },
  //           (id: string) => {
  //             setRemoteStream((prev) => {
  //               const updated: Record<string, MediaStream> = { ...prev };
  //               delete updated[id];
  //               return updated;
  //             });
  //           },
  //         );

  //         setPeerManager(manager);
  //       }
  //     }
  //     if (socketRef.current) init();
  //   }, []);
  console.log(remoteStream);
  return (
    <div>
      <h2>Video Room</h2>
      <video ref={localVideoRef} autoPlay muted></video>
      {Object.entries(remoteStream).map(([id, stream]) => (
        <video
          key={id}
          autoPlay
          ref={(video) => {
            if (video) {
              video.srcObject = stream;
            }
          }}
        ></video>
      ))}
    </div>
  );
};

export default VideoRoom;
