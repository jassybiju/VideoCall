import WebSocket, { WebSocketServer } from "ws";
import {v4 as uuidv4} from 'uuid'


const wss = new WebSocketServer({ port: 5000 ,host : '0.0.0.0' });

const users = new Map<string, WebSocket>()
const rooms = new Map<string, Set<string> >()


wss.on("connection", (socket) => {
    console.log("Connection Successful");
    const userId = uuidv4()
    users.set(userId, socket)

    console.log('User connected', userId)

    socket.send(JSON.stringify({
        type : 'welcome',
        userId
    }))

    socket.on('message',(message) => {
        console.log( rooms)
        const data = JSON.parse(message.toString())
        handleMessage(userId, data)
    })

    socket.on('close',()=>{
        handleDisconnect(userId)
    })
  
});

function handleMessage(userId : string, data : {type : string , roomId: string, target : string, payload : string}) {

    switch(data.type){
        case 'join-room':
            joinRoom(userId, data.roomId)
            break
        case 'signal':
            forwardSignal(userId, data.target, data.payload)
            break
    }
}


function joinRoom(userId : string, roomId : string){
    if(!rooms.has(roomId)){
        rooms.set(roomId, new Set())
    }
    const room  = rooms.get(roomId)!
    if(room.size >= 4){
        users.get(userId)?.send(JSON.stringify({
            type : "room-full"
        }))
        return
    }
    console.log("sending exisiting user")
    users.get(userId)?.send(JSON.stringify({
        type : "existing-users",
        users : Array.from(room)
    }))

    room.add(userId)

    console.log(`User ${userId} joined room ${roomId}`)
    console.log(rooms)
    room.forEach(id => {
        if(id !== userId){
            users.get(id)?.send(JSON.stringify({
                type : 'user-joined',
                userId
            }))
        }
    })

}

function forwardSignal(fromUser: string, toUser : string, payload : any) {
    if(users.has(toUser)){
        users.get(toUser)?.send(JSON.stringify({
            type : 'signal',
            from : fromUser,
            payload
        }))
    }
}

function handleDisconnect(userId : string){
    users.delete(userId)
    console.log("Removed User ")

    rooms.forEach((room, roomId) => {
        if(room.has(userId)){
            room.delete(userId)

            room.forEach((id) => {
                users.get(id)?.send(JSON.stringify({
                    type : 'user-left',
                    userId
                }))
            })

            if(room.size === 0){
                rooms.delete(roomId)
                console.log("Removed Room", roomId)
            }
        }
    })

}
