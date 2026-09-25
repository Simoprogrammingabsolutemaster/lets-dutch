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
    origin: [
      "http://localhost:8080",
      "https://admin.socket.io",
      "http://localhost:5173",
    ],
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

        if (!clients) {
          return;
        }

        io.to(room).emit("player-list", [...clients]);
        //console.log(clients);
      }
    }
  });

  socket.on("start-game", async () => {
    let room;
    clients = [...clients];

    for (const tempRoom of socket.rooms) {
      if (tempRoom != socket.id) {
        room = tempRoom;
      }
    }

    //socket.to(room).emit("room", room);

    if (clients[0] != socket.id) {
      console.log(clients[0]);
      return;
    }

    let deck = await rand_deck();

    //let player_count = io.sockets.adapter.rooms.get(room).size;

    let game = {
      deck: deck,
      players: clients,
      hands: {},
    };

    games[room] = game;

    io.to(room).emit("redirect-to-game");
  });

  socket.on("redirection-to-game-successful", () => {
    console.log("sbu");
    let room;

    for (const tempRoom of socket.rooms) {
      if (tempRoom != socket.id) {
        room = tempRoom;
      }
    }

    if (!games[room].players) {
      return;
    }

    if (socket.id != games[room].players[0]) {
      return;
    }

    for (let i = 0; i < games[room].players.length; i++) {
      let id = games[room].players[i];

      games[room].hands[id] = games[room].deck.slice(0, 4);
      io.to(id).emit("show-starting-hand", games[room].deck.slice(0, 2));
      games[room].deck.splice(0, 4);
    }

    //console.dir(games, { depth: 2 });
  });
});

const PORT = 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

instrument(io, { auth: false });
