// const express = require("express");
// const path = require("path");

// const app = express();
// const server = require("http").createServer(app);

// const io = require("socket.io")(server);
// app.use(express.static(path.join(__dirname + "/public")));

// io.on("connection",function(socket){
//     socket.on("sender-join" , function(data){
//         socket.join(data.uid);
//     });
//     socket.on("receiver-join",function(data){
//         socket.join(data.uid);
//         socket.in(data.sender_uid).emit("init",data.uid);
//     });
//     socket.on("file-meta",function(data){
//         socket.in(data.uid).emit("fs-meta",data.metadata);
//     });
//     socket.on("file-start",function(data){
//         socket.in(data.uid).emit("fs-share",{});
//     });
//     socket.on("file-raw",function(data){
//         socket.in(data.uid).emit("fs-share",data.buffer);
//     });
// });
// server.listen(7458);

const WebSocket = require("ws");
const http = require("http");
const express = require("express");
const path = require("path");

const app = express();
const server = http.createServer(app);

app.use(express.static(path.join(__dirname, "/public")));

const wss = new WebSocket.Server({ server });

const clients = {};
const receiverRooms = {};

wss.on("connection", function connection(socket) {
    socket.on("message", function incoming(message) {
        const data = JSON.parse(message);
        console.log(data)
        switch (data.type) {
            case "sender-join":
                handleSenderJoin(socket, data);
                break;
            case "receiver-join":
                handleReceiverJoin(socket, data);
                break;
            case "file-meta":
                // Emitting metadata to a specific room (uid)

                wss.clients.forEach(function each(client) {
                    // console.log(client.readyState, WebSocket.OPEN, '|', client !== socket, '|', client.room, receiverRooms[data.uid])
                    if (client.readyState === WebSocket.OPEN && client !== socket && client.room === receiverRooms[data.uid]) {
                        client.send(JSON.stringify({ type: "fs-meta", metadata: data.metadata }));
                    }
                });
                break;
            case "file-start":
                // Emitting file share signal to a specific room (uid)
                // console.log('hi1')
                // wss.clients.forEach(function each(client) {
                //     if (client.readyState === WebSocket.OPEN && client !== socket && client.room === data.uid) {
                //         // client.send(JSON.stringify({ type: "fs-share", buffer: {} }));
                //         console.log('fs-share')
                //     }
                // });

                wss.clients.forEach(function each(client) {
                    // console.log(client.readyState, WebSocket.OPEN, '|', client !== socket, '|', client.room, receiverRooms[data.uid])
                    if (client.readyState === WebSocket.OPEN && client !== socket && client.room === receiverRooms[data.uid]) {
                        client.send(JSON.stringify({ type: "fs-share", buffer: {} }));
                    }
                });
                break;
            case "file-raw":
                // Emitting file raw data to a specific room (uid)
                // console.log('hi2')
                // wss.clients.forEach(function each(client) {
                //     if (client.readyState === WebSocket.OPEN && client !== socket && client.room === data.uid) {
                //         // client.send(JSON.stringify({ type: "fs-share", buffer: data.buffer }));
                //         console.log('buffer: data.buffer')
                //     }
                // });

                wss.clients.forEach(function each(client) {
                    // console.log(client.readyState, WebSocket.OPEN, '|', client !== socket, '|', client.room, receiverRooms[data.uid])
                    if (client.readyState === WebSocket.OPEN && client !== socket && client.room === receiverRooms[data.uid]) {
                        // console.log(data.buffer)
                        client.send(JSON.stringify({ type: "fs-share", buffer: data.buffer }));
                    }
                });
                break;
            default:
                break;
        }
    });
});

function handleSenderJoin(socket, data) {
    const joinID = data.uid;

    // Create a room if it doesn't exist
    if (!clients[joinID]) {
        clients[joinID] = [];
    }

    // Add the client to the room
    clients[joinID].push(socket);

    // Optionally, you may want to notify the client that they've successfully joined
    // wss.send(JSON.stringify({ type: "sender-join-success", message: "You've successfully joined the room." }));
}

function handleReceiverJoin(socket, data) {
    const receiverID = data.uid;
    const senderID = data.sender_uid;

    socket.room = senderID;
    

    // Check if the sender's room exists
    if (clients[senderID]) {
        // Iterate over clients in the sender's room
        clients[senderID].forEach(function (client) {
            // Check if the client WebSocket connection is open and is not the receiver's connection
            // console.log("WebSocket connection:", client)
            if (client.readyState === WebSocket.OPEN && client !== socket) {
                // Send an "init" message to the client in the sender's room
                receiverRooms[receiverID] = senderID;
                console.log(receiverRooms)
                client.send(JSON.stringify({ type: "init", uid: receiverID }));
            }
        });
    } else {
        // Handle the case where the sender's room does not exist
        // This might involve notifying the receiver or taking appropriate action
        console.log("Sender's room not found:", senderID);
    }
}

server.listen(7460, function () {
    console.log("Server is running on port 7460");
});