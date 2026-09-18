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
    origin: "*",
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

  socket.on("join-room", (room) => {
    if (room in games) {
      return;
    }

    socket.join(room);
    const clients = io.sockets.adapter.rooms.get(room);
    io.to(room).emit("player-list", [...clients]);
  });

  socket.on("start-game", async (room) => {
    let deck = await rand_deck();

    console.log(io.sockets.adapter.rooms.get(room).size);
    let game = {
      deck: deck,
    };

    games[room] = game;
  });
});

const PORT = 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
