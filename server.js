import { instrument } from "@socket.io/admin-ui";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { rand_deck } from "./utils.js";

let games = {};

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
  let clients;

  function getRoom() {
    let room;

    for (const tempRoom of socket.rooms) {
      if (tempRoom != socket.id) {
        room = tempRoom;
      }
    }

    return room;
  }

  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

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
    let room = getRoom();
    clients = [...clients];

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
      activePlayer: Math.floor(Math.random() * clients.length),
      lastDrawn: "",
    };

    games[room] = game;

    io.to(room).emit("redirect-to-game");
  });

  socket.on("redirection-to-game-successful", () => {
    let room = getRoom();

    if (!games[room]?.players) {
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
      //console.log(games[room].hands[id]);
    }
    //console.dir(games, { depth: 2 });
  });

  socket.on("burn", (swap) => {
    let successfull;
    let room = getRoom();
    if (
      games[room].deck[0].id.slice(0, -2) ==
      games[room].hands[socket.id][swap].id.slice(0, -2)
    ) {
      //fixare burn bottone 1

      games[room].hands[socket.id].splice(swap, 1);
      successfull = true;
      io.to(room).emit("burn-result", socket.id, successfull);
      console.log("true");
    } else {
      let card = games[room].deck[1];
      games[room].deck.slice(0, 1);
      games[room].hands[socket.id].push(card);
      successfull = false;
      io.to(room).emit("burn-result", socket.id, successfull);
      console.log("false");
    }
  });

  socket.on("next-turn", () => {
    let room = getRoom();

    if (socket.id != games[room].players[games[room].activePlayer]) {
      return;
    }

    games[room].activePlayer =
      (games[room].activePlayer + 1) % games[room].players.length;

    let discarded_card = games[room].deck[0];
    io.to(room).emit("discarded-card", discarded_card);
    console.log(discarded_card);
    io.to(room).emit(
      "active-player",
      games[room].players[games[room].activePlayer],
    );
    //console.log(games[room].players[games[room].activePlayer]);
  });

  socket.on("draw-card", () => {
    let room = getRoom();

    if (socket.id != games[room].players[games[room].activePlayer]) {
      return;
    }

    if (socket.id == games[room]?.lastDrawn) {
      return;
    }

    let draw_card = games[room].deck[1];
    io.to(games[room].players[games[room].activePlayer]).emit(
      "drawn-card",
      draw_card,
    );
    games[room].lastDrawn = socket.id;
  });
  socket.on("choice", (choice, swap) => {
    let room = getRoom();

    console.log(
      games[room].hands[games[room].players[games[room].activePlayer]],
    );

    console.log(choice, swap);
    let draw_card = games[room].deck[1];

    if (socket.id != games[room].players[games[room]?.activePlayer]) {
      return;
    }

    if (choice == 0) {
      //cioè se decide di pescare e scartare
      games[room].deck.shift();
    } else if (choice == 1) {
      //pesca e swappa
      games[room].deck[1] =
        games[room].hands[games[room].players[games[room].activePlayer]][swap];
      games[room].hands[games[room].players[games[room].activePlayer]][swap] =
        draw_card;
      games[room].deck.shift();
      console.log(
        games[room].hands[games[room].players[games[room].activePlayer]],
      );
    } else if (choice == 2) {
      //carta sartata swappi
    }
  });
});

function game(room, socket) {
  socket.on;
  const count = games[room].players.length;

  //aggiungi cosa per far sì che solo il player giusto possa mandare richieste
  let discarded_card = games[room].deck[0];
  let draw_card = games[room].deck[1];

  io.to(room).emit("discarded-card", discarded_card);
  io.to(room).emit("active-player", games[room].players[i]);

  /*socket.on("turn-choice", (choice, swap) => {
    console.log(choice, swap);
    if (choice == 0) {
      socket.to(games[room].players[]).emit("draw-card", draw_card);
      //cioè se decide di pescare e scartare
      games[room].deck.shift();
    } else if (choice == 1) {
      //pesca e swappa
      games[room].deck[1] = games[room].hands[games[room].players[i]][swap];
      games[room].hands[games[room].players[i]][swap] = draw_card;
      games[room].deck.shift();
    } else if (choice == 2) {
      //carta sartata swappi
    }
  });*/
}

const PORT = 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

instrument(io, {
  mode: "development",
  auth: false,
});
