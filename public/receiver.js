(function () {
    let senderID;
    const socket = io();
  
    /*socket.on("connect", function () {
      console.log("Connected to server!");
    });*/ 
  
    function generateID() {
      return `${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}`;
    }

    function downloadBlob(blob, filename) {
      const url = window.URL.createObjectURL(blob); // สร้าง element สำหรับการดาวน์โหลด
      const a = document.createElement('a'); //กำหนดคลิงค์ได้จากการสร้าง element
     //กำหนดให้ element a ถูกซ่อน , กำหนดค่า URL ให้ a , กำหนด attribute download
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a); 
      //ทำให้ลิงก์ที่สร้างขึ้นเป็นส่วนหนึ่งของเนื้อหาที่แสดงบนหน้าเว็บไซต์ 
      //และผู้ใช้จะสามารถเห็นลิงก์นี้และใช้งานได้

      a.click(); // ดาวน์โหลดไฟล์
      
      window.URL.revokeObjectURL(url); // ลบ element
      document.body.removeChild(a); //พื่อทำความสะอาดและป้องกันการสร้าง element เพิ่มเติมที่ไม่จำเป็นใน DOM ในภายหลัง
    }
  
    document.querySelector("#receiver-start-con-btn").addEventListener("click", function () {
      senderID = document.querySelector("#join-id").value;
      if (!senderID) {
        //console.error("senderID is not set.");
        return;
      }
      //console.log("senderID: ", senderID);
  
      let joinID = generateID();
      socket.emit("receiver-join", {
        uid: joinID,
        sender_uid: senderID
      });
      document.querySelector(".join-screen").classList.remove("active");
      document.querySelector(".fs-screen").classList.add("active");
    });
  
    let fileShare = {};
    let totalBufferSize = 0; // เพิ่มตัวแปรเก็บขนาดของข้อมูลทั้งหมด
    socket.on("fs-meta", function (metadata) {
      fileShare.metadata = metadata; //เก็บข้อมูลทั้งหมด
      fileShare.transmitted = 0; // รีเซ็ตค่า Transmitted เมื่อได้รับข้อมูล metadata ใหม่
      fileShare.buffer = [];
      totalBufferSize = metadata.total_buffer_size; // กำหนดค่าขนาดของข้อมูลทั้งหมด
      let el = document.createElement("div");
      el.classList.add("item");
      el.innerHTML = `
              <div class= "progress"> 0% </div>
              <div class= "filename"> ${metadata.filename} </div>
              `;
      document.querySelector(".file-list").appendChild(el);
  
      fileShare.progress_node = el.querySelector(".progress");
    });

    socket.on("fs-share", function (buffer) {
      //console.log("buffer: ", buffer);
      fileShare.buffer.push(buffer);
      //ได้รับข้อมูล buffer จากเซิร์ฟเวอร์ โค้ดจะทำการ push buffer ลงใน fileShare.buffer 
      //ซึ่งเป็นตัวแปรที่ใช้เก็บข้อมูล buffer ที่ได้รับมาเพื่อจะนำไปใช้ในการสร้างไฟล์ในภายหลัง

      fileShare.transmitted += buffer.byteLength; //เพิ่มขนาดของ buffer ที่ได้รับมาล่าสุดเข้าไป

      const progress = (fileShare.transmitted / totalBufferSize) * 100; // คำนวณ %

      fileShare.progress_node.innerText = Math.trunc(progress) + "%";
      if (fileShare.transmitted == totalBufferSize) {
        //console.log("File transmission completed.");
        downloadBlob(new Blob(fileShare.buffer), fileShare.metadata.filename);
        fileShare = {};
      } else {
        //console.log("Requesting more data from sender...");
        socket.emit("fs-start", { // เพื่อให้เซิร์ฟเวอร์เริ่มส่งข้อมูลต่อไป
          uid: senderID 
        });
      }
    });
})();
