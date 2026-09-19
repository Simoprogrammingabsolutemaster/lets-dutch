import { instrument } from "@socket.io/admin-ui";
import { readFile } from "fs/promises";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

let games = {};

async function rand_deck() {
  try {
    const data = await readFile("./deck.json", "utf8");
    const cards = JSON.parse(data);

    // algoritmo gemini per mescolare

    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    // console.log(cards);
    return cards;
  } catch (error) {
    console.error(error);
  }
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:8080", "https://admin.socket.io"],
    credentials: true,
  },
});

app.get("/", (req, res) => {
  res.send("Server running!");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

  let clients;

  socket.on("join-room", (room) => {
    if (room in games) {
      return;
    }

    for (const room_check of socket.rooms) {
      if (room_check != socket.id) {
        socket.leave(room_check);
      }
    }

    socket.join(room);
    clients = io.sockets.adapter.rooms.get(room);
    io.to(room).emit("player-list", [...clients]);
  });
  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.leave(room);
        clients = io.sockets.adapter.rooms.get(room);
        io.to(room).emit("player-list", [...clients]);
        console.log(clients);
      }
    }
  });

  socket.on("start-game", async () => {
    let room;

    for (const room of socket.rooms) {
      if (room != socket.id) {
        room = room;
      }
    }

    //socket.to(room).emit("room", room);

    if (clients[0] != socket.id) {
      return;
    }

    let deck = await rand_deck();

    //let player_count = io.sockets.adapter.rooms.get(room).size;
    let payer_count = clients.size();

    let game = {
      deck: deck,
      player_count: count,
    };
    games[room] = game;
  });
});

const PORT = 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

instrument(io, { auth: false });
