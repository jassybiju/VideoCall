import Stream from "stream";

export default class PeerManager {
  private readonly peers;
  constructor(
    private readonly socket: WebSocket,
    private readonly localStream: MediaStream,
    private readonly onRemoteStream: (id: string, stream: MediaStream) => void,
  private readonly onPeerLeave: (id: string) => void,
  ) {
    this.peers = new Map<string, RTCPeerConnection>();

    this.socket.onmessage = (evn) => {
        console.log(evn)
      const data = JSON.parse(evn.data);
      this.handleMessage(data);
    };
  }

  async handleMessage(data : {type : string,from : string,payload : {type : string, candidate : RTCIceCandidateInit, sdp : RTCSessionDescriptionInit} ,users : Array<string>, userId : string}) {
    console.log(data)
    switch (data.type){
        case "existing-users":
            for(const id of data.users){
                console.log(id)
                await this.createPeer(id , true)
            }
            break
        
        case "signal":
            await this.handleSignal(data)
            break
        
        case 'user-left':
            this.removePeer(data.userId)
            break
    }
  }

  async createPeer(targetId : string, isInitiator : boolean){
    const pc = new RTCPeerConnection({
        iceServers : [{ urls : 'stun:stun.l.google.com:19302' }]
    })

    this.peers.set(targetId, pc)

    this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream)
    })
    console.log(targetId, isInitiator)
    pc.ontrack = evn => {
        console.log(`added ${evn.streams[0]}`)
        this.onRemoteStream(targetId, evn.streams[0])
    }

    pc.onicecandidate = evn => {
        if(evn.candidate){
            this.socket.send(JSON.stringify({
                type : 'signal',
                target : targetId,
                payload : {
                    type : 'ice',
                    candidate : evn.candidate
                }
            }))
        }
    }

    if(isInitiator){
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        this.socket.send(
            JSON.stringify({
                type : "signal",
                target : targetId,
                payload : {
                    type : 'offer',
                    sdp : offer
                }
            })

        )
    }
  }

  async handleSignal (data : {from : string, payload : {type : string, sdp : RTCSessionDescriptionInit, candidate : RTCLocalIceCandidateInit}}) {
    const {from , payload} = data

    let pc = this.peers.get(from)

    if(!pc){
        await this.createPeer(from, false)
        pc = this.peers.get(from)!
    }

    if(payload.type == 'offer'){
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        this.socket.send(
            JSON.stringify({
                type : 'signal',
                target : from,
                payload : {
                    type : 'answer',
                    sdp : answer
                }
            })
        )
    }
    if(payload.type === 'answer'){
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
    }
    if(payload.type == 'ice'){
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
    }
  }

  removePeer(id : string){
    const pc = this.peers.get(id)
    if(pc){
        pc.close()
        this.peers.delete(id)
        this.onPeerLeave(id)
    }
  }
}
