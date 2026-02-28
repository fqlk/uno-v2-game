// Main Game Controller - Sleek Premium Edition
document.addEventListener('DOMContentLoaded', () => {
    const btnCreate = document.getElementById('btn-create');
    const btnJoin = document.getElementById('btn-join');
    const btnConfirmJoin = document.getElementById('btn-confirm-join');
    const btnStart = document.getElementById('btn-start');
    const btnBot = document.getElementById('btn-bot');
    const btnUno = document.getElementById('btn-uno');
    const btnRematch = document.getElementById('btn-rematch');

    const usernameInput = document.getElementById('username');
    const roomCodeInput = document.getElementById('room-code');

    const handleInteraction = () => {
        AudioEngine.init();
    };

    // Create Room
    btnCreate.onclick = () => {
        handleInteraction();
        const username = usernameInput.value.trim();
        if (!username) return UI.notify('PLEASE ENTER A NICKNAME', 'error');
        socket.emit('joinRoom', { username, mode: 'create' });
        AudioEngine.play('place');
    };

    // Play vs Bot
    btnBot.onclick = () => {
        handleInteraction();
        const username = usernameInput.value.trim();
        if (!username) return UI.notify('PLEASE ENTER A NICKNAME', 'error');
        socket.emit('joinRoom', { username, mode: 'bot' });
        AudioEngine.play('place');
    };

    // Join Room UI Toggle
    btnJoin.onclick = () => {
        handleInteraction();
        document.getElementById('join-controls').classList.remove('hidden');
        btnCreate.classList.add('hidden');
        btnJoin.classList.add('hidden');
        btnBot.classList.add('hidden');
        AudioEngine.play('place');
    };

    // Confirm Join Room
    btnConfirmJoin.onclick = () => {
        handleInteraction();
        const username = usernameInput.value.trim();
        const roomCode = roomCodeInput.value.trim().toUpperCase();
        if (!username || !roomCode) return UI.notify('INCOMPLETE ROOM DATA', 'error');
        socket.emit('joinRoom', { username, roomCode, mode: 'join' });
        AudioEngine.play('place');
    };

    // Start Game (Host only)
    btnStart.onclick = () => {
        socket.emit('startGame');
        AudioEngine.play('place');
    };

    // Draw card logic
    document.getElementById('draw-pile').onclick = () => {
        socket.emit('drawCard');
    };

    // Color picker logic
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.onclick = () => {
            const color = btn.getAttribute('data-color');
            socket.emit('chooseColor', color);
            document.getElementById('color-picker').classList.add('hidden');
            AudioEngine.play('place');
        };
    });

    // Uno! button
    btnUno.onclick = () => {
        socket.emit('callUno');
        btnUno.classList.add('hidden');
        AudioEngine.play('uno');
    };

    // Rematch button
    btnRematch.onclick = () => {
        window.location.reload();
    };

    // Global click listener for audio init
    document.body.addEventListener('click', handleInteraction, { once: true });
});
