const socket = io();

const SocketHandler = {
    init() {
        socket.on('roomUpdate', (data) => {
            UI.showScreen('lobby');
            document.getElementById('display-room-code').textContent = data.code;
            UI.updatePlayerList(data.players, data.host, socket.id);
        });

        socket.on('gameStarted', (data) => {
            UI.showScreen('game');
            UI.updateBoard(data.topCard, data.currentColor, data.turnIndex, data.players);
            AudioEngine.init();
        });

        socket.on('yourHand', (hand) => {
            AudioEngine.play('draw');
            UI.renderHand(hand, (cardId) => {
                socket.emit('playCard', cardId);
            });
        });

        socket.on('gameStateUpdate', (data) => {
            if (data.topCard.color === 'special') {
                AudioEngine.play('special');
            } else {
                AudioEngine.play('place');
            }
            UI.updateBoard(data.topCard, data.currentColor, data.turnIndex, data.players);

            if (data.waitingForColor === socket.id) {
                document.getElementById('color-picker').classList.remove('hidden');
            } else {
                document.getElementById('color-picker').classList.add('hidden');
            }

            if (data.waitingForSwap === socket.id || data.waitingForSteal === socket.id) {
                UI.showTargetPicker(data.players.filter(p => p.id !== socket.id));
            } else {
                document.getElementById('target-picker').classList.add('hidden');
            }

            // Show Uno button if hand size is low
            const me = data.players.find(p => p.id === socket.id);
            if (me && me.handCount <= 2) {
                document.getElementById('btn-uno').classList.remove('hidden');
            } else {
                document.getElementById('btn-uno').classList.add('hidden');
            }
        });

        socket.on('betConfirmed', (cardId) => {
            const hand = document.querySelectorAll('#my-hand .card');
            hand.forEach(el => {
                const badge = el.querySelector('.bet-badge');
                if (badge) badge.remove();
            });
            UI.notify('BET LOCKED!', 'special');
        });

        socket.on('gameOver', (data) => {
            UI.showScreen('victory');
            document.getElementById('winner-name').textContent = `${data.winner} WINS!`;
            AudioEngine.play('victory');
        });

        socket.on('powerupCinematic', (data) => {
            UI.showPowerupCinematic(data.user, data.name, data.desc);
            AudioEngine.play('special');
        });

        socket.on('chaosEvent', (data) => {
            UI.notify(`CHAOS EVENT: ${data.name} - ${data.desc}`, 'chaos');
            AudioEngine.play('wild');
        });

        socket.on('error', (msg) => {
            UI.notify(msg, 'error');
        });

        socket.on('unoCalled', (data) => {
            console.log(`${data.username} CALLED UNO!`);
        });
    }
};

SocketHandler.init();
