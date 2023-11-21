const express = require("express");
const http = require("http");
const path = require("path");
const mqtt = require("mqtt");
const mysql = require("mysql2/promise"); // Menggunakan versi promise dari mysql2
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "sparco",
};
const app = express();
// Mengizinkan CORS untuk mengakses dari domain berbeda
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/api/peserta", async (req, res) => {
  try {
    // Membuat koneksi ke database
    const connection = await mysql.createConnection(dbConfig);

    // Mengambil data dari database
    const [rows] = await connection.execute(
      "SELECT * FROM peserta ORDER BY start_pos ASC"
    );

    // Menutup koneksi
    connection.end();

    res.json(rows);
  } catch (error) {
    console.error("Error fetching data from MySQL:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/kategori", async (req, res) => {
  try {
    // Membuat koneksi ke database
    const connection = await mysql.createConnection(dbConfig);

    // Mengambil data dari database
    const [rows] = await connection.execute("SELECT * FROM kategori");

    // Menutup koneksi
    connection.end();

    res.json(rows);
  } catch (error) {
    console.error("Error fetching data from MySQL:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/peserta/:id_kategori/:heat", async (req, res) => {
  try {
    // Membuat koneksi ke database
    const connection = await mysql.createConnection(dbConfig);

    // Mengambil data dari database
    const [rows] = await connection.execute(
      "SELECT * FROM peserta WHERE id_kategori = " +
        req.params.id_kategori +
        " AND heat = " +
        req.params.heat
    );

    // Menutup koneksi
    connection.end();

    res.json(rows);
  } catch (error) {
    console.error("Error fetching data from MySQL:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.use("/assets", express.static(path.join(__dirname, "assets")));
const server = http.createServer(app);
// Serve the HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Serve the mqtt.js library
app.get("/mqtt.js", (req, res) => {
  res.sendFile(path.join(__dirname, "node_modules/mqtt/dist/mqtt.min.js"));
});

// Replace 'mqtt://broker.example.com' with your MQTT broker address
const brokerUrl = "mqtt://192.168.43.18";
const topic = "tombol"; // Replace with the topic you want to subscribe to

const client = mqtt.connect(brokerUrl);
const timeoutDuration = 60 * 1000; // 1 minute in milliseconds

let lastReceivedValue = null;
let lastReceivedTime = 0;
client.on("connect", () => {
  console.log("Connected to MQTT broker");
  client.subscribe(topic, (err) => {
    if (!err) {
      console.log(`Subscribed to ${topic}`);
    } else {
      console.error("Error subscribing to topic:", err);
    }
  });
});

client.on("message", (topic, message) => {
  if (topic === "tombol") {
    const receivedValue = message.toString();

    // Check if the received value is different or if enough time has passed since the last received value
    if (
      receivedValue !== lastReceivedValue ||
      Date.now() - lastReceivedTime >= timeoutDuration
    ) {
      console.log(`Received value: ${receivedValue}`);

      // Update the last received value and time
      lastReceivedValue = receivedValue;
      lastReceivedTime = Date.now();
    } else {
      console.log(
        `Duplicate value received. Ignoring for ${
          timeoutDuration / 1000
        } seconds.`
      );
    }
  }
});

client.on("error", (err) => {
  console.error("MQTT error:", err);
});

// Handle process termination gracefully
process.on("SIGINT", () => {
  client.end();
  process.exit();
});

const port = 3000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
