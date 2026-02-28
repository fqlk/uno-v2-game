const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const GameLogic = require('./gameLogic');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '../public')));

const rooms = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinRoom', ({ username, roomCode, mode }) => {
        let room;
        if (mode === 'create' || mode === 'bot') {
            roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            room = {
                code: roomCode,
                host: socket.id,
                players: [],
                status: 'waiting',
                gameState: null
            };
            rooms.set(roomCode, room);

            if (mode === 'bot') {
                const bot = {
                    id: 'bot-' + Math.random().toString(36).substr(2, 5),
                    username: 'Uno Bot 🤖',
                    hand: [],
                    isBot: true
                };
                room.players.push(bot);
            }
        } else {
            room = rooms.get(roomCode);
            if (!room) {
                return socket.emit('error', 'Room not found');
            }
            if (room.players.length >= 6) {
                return socket.emit('error', 'Room is full');
            }
        }

        const player = {
            id: socket.id,
            username,
            hand: [],
            isReady: false
        };
        room.players.push(player);
        socket.join(roomCode);
        socket.roomCode = roomCode;

        io.to(roomCode).emit('roomUpdate', {
            code: roomCode,
            players: room.players.map(p => ({ username: p.username, id: p.id })),
            host: room.host
        });
    });

    socket.on('startGame', () => {
        const room = rooms.get(socket.roomCode);
        if (room && room.host === socket.id) {
            const deck = GameLogic.generateDeck();

            room.players.forEach(player => {
                player.hand = deck.splice(0, 7);
            });

            const topCard = deck.pop();
            room.gameState = {
                deck,
                discardPile: [topCard],
                currentColor: topCard.color === 'wild' || topCard.color === 'special' ? 'red' : topCard.color,
                turnIndex: 0,
                direction: 1,
                status: 'playing',
                pendingDraw: 0,
                turnCount: 0,
                hostId: room.host,
                players: room.players
            };

            room.status = 'playing';

            io.to(room.code).emit('gameStarted', {
                topCard: room.gameState.discardPile[room.gameState.discardPile.length - 1],
                currentColor: room.gameState.currentColor,
                turnIndex: room.gameState.turnIndex,
                players: room.players.map(p => ({ username: p.username, id: p.id, handCount: p.hand.length }))
            });

            room.players.forEach(p => {
                if (!p.isBot) io.to(p.id).emit('yourHand', p.hand);
            });

            if (room.players[room.gameState.turnIndex].isBot) {
                processBotTurn(room);
            }
        }
    });

    socket.on('playCard', (cardId) => {
        const room = rooms.get(socket.roomCode);
        if (!room || room.status !== 'playing') return;

        const player = room.players.find(p => p.id === socket.id);
        const playerIndex = room.players.indexOf(player);

        if (room.gameState.turnIndex !== playerIndex) {
            return socket.emit('error', 'Not your turn');
        }

        if (room.gameState.pendingDraw > 0) {
            return socket.emit('error', 'You must draw cards due to penalty');
        }

        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;

        const card = player.hand[cardIndex];
        const topCard = room.gameState.discardPile[room.gameState.discardPile.length - 1];

        if (GameLogic.isValidMove(card, topCard, room.gameState.currentColor, player.hand)) {
            player.hand.splice(cardIndex, 1);
            room.gameState.discardPile.push(card);

            // Check bets BEFORE updating stats
            const betWinners = GameLogic.checkBetResult(room.gameState, card);
            betWinners.forEach(win => {
                io.to(room.code).emit('powerupCinematic', {
                    user: win.username,
                    name: 'BET WON!',
                    desc: `MATCHED ${win.card.value.toUpperCase()} - CARD DISCARDED!`
                });
            });

            if (card.color !== 'wild' && card.color !== 'special') {
                room.gameState.currentColor = card.color;
            }

            GameLogic.handleAction(card, room.gameState);

            if (card.color === 'special') {
                const info = GameLogic.getPowerupInfo(card.value);
                io.to(room.code).emit('powerupCinematic', {
                    user: player.username,
                    name: info.name,
                    desc: info.desc
                });
            }

            room.gameState.turnCount++;
            if (room.gameState.turnCount % 5 === 0) {
                const event = GameLogic.triggerChaosEvent(room.gameState);
                io.to(room.code).emit('chaosEvent', {
                    name: event.name,
                    desc: event.desc
                });
            }

            if (!room.gameState.waitingForColor && !room.gameState.waitingForSwap && !room.gameState.waitingForSteal) {
                room.gameState.turnIndex = GameLogic.nextIndex(room.gameState.turnIndex, room.gameState.direction, room.players.length);
            }

            io.to(room.code).emit('gameStateUpdate', {
                topCard: card,
                currentColor: room.gameState.currentColor,
                turnIndex: room.gameState.turnIndex,
                waitingForColor: room.gameState.waitingForColor !== null ? room.players[room.gameState.waitingForColor]?.id : null,
                waitingForSwap: room.gameState.waitingForSwap !== null ? room.players[room.gameState.waitingForSwap]?.id : null,
                waitingForSteal: room.gameState.waitingForSteal !== null ? room.players[room.gameState.waitingForSteal]?.id : null,
                players: room.players.map(p => ({ username: p.username, id: p.id, handCount: p.hand.length }))
            });

            socket.emit('yourHand', player.hand);

            if (player.hand.length === 0) {
                io.to(room.code).emit('gameOver', { winner: player.username });
                room.status = 'finished';
            } else if (room.players[room.gameState.turnIndex].isBot && !room.gameState.waitingForColor) {
                processBotTurn(room);
            }
        } else {
            socket.emit('error', 'Invalid move');
        }
    });

    socket.on('drawCard', () => {
        const room = rooms.get(socket.roomCode);
        if (!room || room.status !== 'playing') return;

        const player = room.players.find(p => p.id === socket.id);
        const playerIndex = room.players.indexOf(player);

        if (room.gameState.turnIndex !== playerIndex) {
            return socket.emit('error', 'Not your turn');
        }

        if (room.gameState.pendingDraw > 0) {
            for (let i = 0; i < room.gameState.pendingDraw; i++) {
                if (room.gameState.deck.length === 0) GameLogic.reshuffle(room.gameState);
                player.hand.push(room.gameState.deck.pop());
            }
            room.gameState.pendingDraw = 0;
            room.gameState.turnIndex = GameLogic.nextIndex(room.gameState.turnIndex, room.gameState.direction, room.players.length);

            socket.emit('yourHand', player.hand);
            io.to(room.code).emit('gameStateUpdate', {
                topCard: room.gameState.discardPile[room.gameState.discardPile.length - 1],
                currentColor: room.gameState.currentColor,
                turnIndex: room.gameState.turnIndex,
                players: room.players.map(p => ({ username: p.username, id: p.id, handCount: p.hand.length }))
            });

            if (room.players[room.gameState.turnIndex].isBot) processBotTurn(room);
            return;
        }

        const card = room.gameState.deck.pop();
        player.hand.push(card);

        const topCard = room.gameState.discardPile[room.gameState.discardPile.length - 1];
        const canPlay = GameLogic.isValidMove(card, topCard, room.gameState.currentColor, player.hand);

        socket.emit('yourHand', player.hand);

        if (!canPlay) {
            room.gameState.turnIndex = GameLogic.nextIndex(room.gameState.turnIndex, room.gameState.direction, room.players.length);
        }

        io.to(room.code).emit('gameStateUpdate', {
            topCard,
            currentColor: room.gameState.currentColor,
            turnIndex: room.gameState.turnIndex,
            players: room.players.map(p => ({ username: p.username, id: p.id, handCount: p.hand.length }))
        });

        if (!canPlay && room.players[room.gameState.turnIndex].isBot) {
            processBotTurn(room);
        }
    });

    socket.on('chooseColor', (color) => {
        const room = rooms.get(socket.roomCode);
        if (!room || room.status !== 'playing') return;

        const player = room.players.find(p => p.id === socket.id);
        const playerIndex = room.players.indexOf(player);

        if (room.gameState.waitingForColor === playerIndex) {
            room.gameState.currentColor = color;
            room.gameState.waitingForColor = null;
            room.gameState.turnIndex = GameLogic.nextIndex(room.gameState.turnIndex, room.gameState.direction, room.players.length);

            io.to(room.code).emit('gameStateUpdate', {
                topCard: room.gameState.discardPile[room.gameState.discardPile.length - 1],
                currentColor: room.gameState.currentColor,
                turnIndex: room.gameState.turnIndex,
                players: room.players.map(p => ({ username: p.username, id: p.id, handCount: p.hand.length }))
            });

            if (room.players[room.gameState.turnIndex].isBot) processBotTurn(room);
        }
    });

    socket.on('selectTarget', (targetId) => {
        const room = rooms.get(socket.roomCode);
        if (!room || room.status !== 'playing') return;

        const player = room.players.find(p => p.id === socket.id);
        const target = room.players.find(p => p.id === targetId);
        if (!target || target.id === socket.id) return;

        if (room.gameState.waitingForSwap === room.players.indexOf(player)) {
            const tempHand = [...player.hand];
            player.hand = [...target.hand];
            target.hand = tempHand;
            room.gameState.waitingForSwap = null;
            room.gameState.turnIndex = GameLogic.nextIndex(room.gameState.turnIndex, room.gameState.direction, room.players.length);

            io.to(player.id).emit('yourHand', player.hand);
            if (!target.isBot) io.to(target.id).emit('yourHand', target.hand);

            io.to(room.code).emit('gameStateUpdate', {
                topCard: room.gameState.discardPile[room.gameState.discardPile.length - 1],
                currentColor: room.gameState.currentColor,
                turnIndex: room.gameState.turnIndex,
                players: room.players.map(p => ({ username: p.username, id: p.id, handCount: p.hand.length }))
            });

            if (room.players[room.gameState.turnIndex].isBot) processBotTurn(room);
        }

        if (room.gameState.waitingForSteal === room.players.indexOf(player)) {
            if (target.hand.length > 0) {
                const cardIndex = Math.floor(Math.random() * target.hand.length);
                const card = target.hand.splice(cardIndex, 1)[0];
                player.hand.push(card);
            }
            room.gameState.waitingForSteal = null;
            room.gameState.turnIndex = GameLogic.nextIndex(room.gameState.turnIndex, room.gameState.direction, room.players.length);

            io.to(player.id).emit('yourHand', player.hand);
            if (!target.isBot) io.to(target.id).emit('yourHand', target.hand);

            io.to(room.code).emit('gameStateUpdate', {
                topCard: room.gameState.discardPile[room.gameState.discardPile.length - 1],
                currentColor: room.gameState.currentColor,
                turnIndex: room.gameState.turnIndex,
                players: room.players.map(p => ({ username: p.username, id: p.id, handCount: p.hand.length }))
            });

            if (room.players[room.gameState.turnIndex].isBot) processBotTurn(room);
        }
    });

    socket.on('betCard', (cardId) => {
        const room = rooms.get(socket.roomCode);
        if (!room || room.status !== 'playing') return;
        const player = room.players.find(p => p.id === socket.id);
        const card = player.hand.find(c => c.id === cardId);
        if (card) {
            player.lockedBet = card;
            socket.emit('betConfirmed', card.id);
        }
    });

    socket.on('disconnect', () => {
        const room = rooms.get(socket.roomCode);
        if (room) {
            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.players.length === 0) {
                rooms.delete(socket.roomCode);
            } else {
                if (room.host === socket.id) room.host = room.players[0].id;
                io.to(room.code).emit('roomUpdate', {
                    code: room.code,
                    players: room.players.map(p => ({ username: p.username, id: p.id })),
                    host: room.host
                });
            }
        }
    });
});

function processBotTurn(room) {
    if (!room || room.status !== 'playing') return;
    const bot = room.players[room.gameState.turnIndex];
    if (!bot || !bot.isBot) return;

    setTimeout(() => {
        const topCard = room.gameState.discardPile[room.gameState.discardPile.length - 1];

        // Handle draw penalties
        if (room.gameState.pendingDraw > 0) {
            for (let i = 0; i < room.gameState.pendingDraw; i++) {
                if (room.gameState.deck.length === 0) GameLogic.reshuffle(room.gameState);
                bot.hand.push(room.gameState.deck.pop());
            }
            room.gameState.pendingDraw = 0;
            room.gameState.turnIndex = GameLogic.nextIndex(room.gameState.turnIndex, room.gameState.direction, room.players.length);

            io.to(room.code).emit('gameStateUpdate', {
                topCard,
                currentColor: room.gameState.currentColor,
                turnIndex: room.gameState.turnIndex,
                players: room.players.map(p => ({ username: p.username, id: p.id, handCount: p.hand.length }))
            });
            if (room.players[room.gameState.turnIndex].isBot) processBotTurn(room);
            return;
        }

        const playableCards = bot.hand.filter(c => GameLogic.isValidMove(c, topCard, room.gameState.currentColor, bot.hand));

        if (playableCards.length > 0) {
            let cardToPlay = playableCards.find(c => c.color === 'special' || c.color === 'wild') || playableCards[0];
            const cardIndex = bot.hand.indexOf(cardToPlay);
            bot.hand.splice(cardIndex, 1);
            room.gameState.discardPile.push(cardToPlay);

            if (cardToPlay.color !== 'wild' && cardToPlay.color !== 'special') {
                room.gameState.currentColor = cardToPlay.color;
            } else {
                const colorCounts = bot.hand.reduce((acc, c) => {
                    if (c.color !== 'wild' && c.color !== 'special') acc[c.color] = (acc[c.color] || 0) + 1;
                    return acc;
                }, { red: 0, green: 0, blue: 0, yellow: 0 });
                room.gameState.currentColor = Object.keys(colorCounts).reduce((a, b) => colorCounts[a] > colorCounts[b] ? a : b);
            }

            GameLogic.handleAction(cardToPlay, room.gameState);

            if (!room.gameState.waitingForColor && !room.gameState.waitingForSwap && !room.gameState.waitingForSteal) {
                room.gameState.turnIndex = GameLogic.nextIndex(room.gameState.turnIndex, room.gameState.direction, room.players.length);
            }

            io.to(room.code).emit('gameStateUpdate', {
                topCard: cardToPlay,
                currentColor: room.gameState.currentColor,
                turnIndex: room.gameState.turnIndex,
                players: room.players.map(p => ({ username: p.username, id: p.id, handCount: p.hand.length }))
            });

            if (bot.hand.length === 0) {
                io.to(room.code).emit('gameOver', { winner: bot.username });
                room.status = 'finished';
            } else if (room.players[room.gameState.turnIndex].isBot && !room.gameState.waitingForColor) {
                processBotTurn(room);
            }
        } else {
            if (room.gameState.deck.length === 0) GameLogic.reshuffle(room.gameState);
            const card = room.gameState.deck.pop();
            bot.hand.push(card);

            if (!GameLogic.isValidMove(card, topCard, room.gameState.currentColor, bot.hand)) {
                room.gameState.turnIndex = GameLogic.nextIndex(room.gameState.turnIndex, room.gameState.direction, room.players.length);
            }

            io.to(room.code).emit('gameStateUpdate', {
                topCard,
                currentColor: room.gameState.currentColor,
                turnIndex: room.gameState.turnIndex,
                players: room.players.map(p => ({ username: p.username, id: p.id, handCount: p.hand.length }))
            });

            if (room.players[room.gameState.turnIndex].isBot) processBotTurn(room);
        }
    }, 1500);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
