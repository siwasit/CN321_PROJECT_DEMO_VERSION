// (function () {
//     let receiverID; 
//     const socket = io();

//     function generateID() {
//         return `${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}`;
//     }

//     document.querySelector("#sender-start-con-btn").addEventListener("click", function () {
//         //จะเริ่มทำงานเมื่อกด click  โดยจะสร้างไอดีและส่งข้อมูลไปยังการเชื่อมต่อ
//         let joinID = generateID(); 
//         //จะแทนที่ข้อความภายใน element ที่มี id เป็น "join-id" 
//         document.querySelector('#join-id').innerHTML = `
//             <b>Room ID </b>
//             <span>${joinID}</span>
//         `;
//         //ส่งข้อมูลการเชื่อมต่อไปยัง server โดยใช้ Socket.IO 
//         socket.emit("sender-join", {
//             uid: joinID
//         });
//     });

//     socket.on("init", function (uid) { 
//         receiverID = uid;
//         document.querySelector(".join-screen").classList.remove("active");
//         document.querySelector(".fs-screen").classList.add("active");
//     });

//     document.querySelector("#file-input").addEventListener("change", function (e) {
//         let file = e.target.files[0]; //เลือกไฟล์ที่ต้องการส่ง
//         if (!file) {
//             return;
//         }
//         //อ่านไฟล์และส่งข้อมูลไปยัง server 
//         let reader = new FileReader();
//         reader.onload = function (e) {
//             let buffer = new Uint8Array(reader.result);
//             // สร้าง Uint8Array เพื่อเก็บข้อมูลจากไฟล์ที่อ่านเข้ามา 
//             //โดยใช้ข้อมูลจาก reader.result ที่ได้อ่านได้จาก FileReader
//             let el = document.createElement("div");
//             el.classList.add("item");
//             el.innerHTML = `
//                 <div class= "progress"> 0% </div>
//                 <div class= "filename"> ${file.name} </div>
//             `; //แสดง % ที่ขึ้นในหน้าจอ โดยใช้ HTML

//             document.querySelector(".file-list").appendChild(el);
//             shareFile({
//                 filename: file.name,
//                 total_buffer_size: buffer.length,
//                 buffer_size: 1024
//             }, buffer, el.querySelector(".progress")); 
//             //ได้ element ที่มี class ชื่อ "progress" ซึ่งจะถูกใช้ในการอัพเดตค % ของการส่งไฟล์
//         }
//         reader.readAsArrayBuffer(file);
//     });

//     function shareFile(metadata, buffer, progress_node) {
//         //console.log("Metadata:", metadata);
//         socket.emit("file-meta", { //ส่งข้อมูล metadata ไปยังเซิร์ฟเวอร์
//             uid: receiverID,
//             metadata: metadata
//         });

//         function sendChunk() {
//             if (buffer.length === 0) {
//                 // ถ้าไม่มีข้อมูลใน buffer แล้วแสดงว่าไฟล์ได้ถูกส่งทั้งหมดแล้ว
//                 //console.log("File transmission completed.");
//                 return;
//             }

//             let chunk = buffer.slice(0, metadata.buffer_size);
//             //ใช้ในการแบ่งข้อมูล
//             buffer = buffer.slice(metadata.buffer_size, buffer.length);
//             //ลบข้อมูลเพื่อไม่ให้ส่งซ้ำ
//             progress_node.innerText = Math.trunc((metadata.total_buffer_size - buffer.length) / metadata.total_buffer_size * 100) + "%";
//             //คำนวน %

//             socket.emit("file-raw", {
//                 uid: receiverID,
//                 buffer: chunk
//             });
//             //console.log("Sent file-raw event");

//             // อัพเดตโปรเกรสหลังจากส่งข้อมูล ลดเวลาในการทำงาน
//             //ให้ส่งข้อมูลชิ้นใหม่ถัดๆไปโดยไม่ต้องรอ
//             setTimeout(sendChunk, 0);
//         }
//         sendChunk();
//     }
// })();

(function () {
    let receiverID;
    const socket = new WebSocket("ws://localhost:7460"); // Change the URL to match your WebSocket server address

    socket.addEventListener("open", function (event) {
        console.log("Connected to WebSocket server");
    });

    function generateID() {
        return `${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}`;
    }

    document.querySelector("#sender-start-con-btn").addEventListener("click", function () {
        let joinID = generateID();
        document.querySelector('#join-id').innerHTML = `
            <b>Room ID </b>
            <span>${joinID}</span>
        `;
        socket.send(JSON.stringify({ type: "sender-join", uid: joinID }));
    });

    socket.addEventListener("message", function (event) {
        const data = JSON.parse(event.data);
        console.log(data)
        switch (data.type) {
            case "init":
                receiverID = data.uid;
                document.querySelector(".join-screen").classList.remove("active");
                document.querySelector(".fs-screen").classList.add("active");
                break;
            default:
                break;
        }
    });

    document.querySelector("#file-input").addEventListener("change", function (e) {
        let file = e.target.files[0];
        if (!file) {
            return;
        }

        let reader = new FileReader();
        reader.onload = function (e) {
            let buffer = new Uint8Array(reader.result);
            let el = document.createElement("div");
            el.classList.add("item");
            el.innerHTML = `
                <div class= "progress"> 0% </div>
                <div class= "filename"> ${file.name} </div>
            `;
            document.querySelector(".file-list").appendChild(el);
            shareFile({
                filename: file.name,
                total_buffer_size: buffer.length,
                buffer_size: 1024
            }, buffer, el.querySelector(".progress"));
        }
        reader.readAsArrayBuffer(file);
    });

    function shareFile(metadata, buffer, progress_node) {
        socket.send(JSON.stringify({ type: "file-meta", uid: receiverID, metadata: metadata }));

        function sendChunk() {
            if (buffer.length === 0) {
                return;
            }

            let chunk = buffer.slice(0, metadata.buffer_size);
            buffer = buffer.slice(metadata.buffer_size);

            console.log('chunk: ', chunk, buffer);

            progress_node.innerText = Math.trunc((metadata.total_buffer_size - buffer.length) / metadata.total_buffer_size * 100) + "%";
                  
            // socket.send(JSON.stringify({ type: "file-raw", uid: receiverID, buffer: chunk }));
            socket.send(JSON.stringify({ type: "file-raw", uid: receiverID, buffer: Array.from(chunk) }));
            
            setTimeout(sendChunk, 0);
        }
        sendChunk();
    }

})();