const UI = {
    screens: {
        start: document.getElementById('screen-start'),
        lobby: document.getElementById('screen-lobby'),
        game: document.getElementById('screen-game'),
        victory: document.getElementById('screen-victory')
    },

    init() {
        this.initMouseGlow();
        this.initVFX();
    },

    initMouseGlow() {
        const glow = document.getElementById('mouse-glow');
        if (!glow) return;

        document.addEventListener('mousemove', (e) => {
            glow.style.opacity = '1';
            glow.style.left = e.clientX + 'px';
            glow.style.top = e.clientY + 'px';
        });

        document.addEventListener('mouseleave', () => {
            glow.style.opacity = '0';
        });
    },

    initVFX() {
        const layer = document.getElementById('vfx-layer');
        if (!layer) return;

        // Spawn occasional background particles
        setInterval(() => {
            const p = document.createElement('div');
            p.style.position = 'absolute';
            p.style.left = Math.random() * 100 + '%';
            p.style.top = '110%';
            p.style.width = '2px';
            p.style.height = '2px';
            p.style.background = 'rgba(255, 255, 255, 0.2)';
            p.style.boxShadow = '0 0 10px rgba(0, 242, 255, 0.5)';
            p.style.borderRadius = '50%';
            layer.appendChild(p);

            p.animate([
                { transform: 'translateY(0) scale(1)', opacity: 0 },
                { transform: 'translateY(-100px)', opacity: 0.5, offset: 0.2 },
                { transform: `translateY(-${window.innerHeight + 200}px) scale(0)`, opacity: 0 }
            ], {
                duration: Math.random() * 5000 + 5000,
                easing: 'linear'
            }).onfinish = () => p.remove();
        }, 300);
    },

    showScreen(screenName) {
        Object.values(this.screens).forEach(s => s.classList.add('hidden'));
        const activeScreen = this.screens[screenName];
        activeScreen.classList.remove('hidden');

        // Cinematic Spring Entrance
        activeScreen.animate([
            { opacity: 0, transform: 'scale(0.9) translateY(40px) rotateX(-10deg)' },
            { opacity: 1, transform: 'scale(1) translateY(0) rotateX(0deg)' }
        ], { duration: 1000, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
    },

    notify(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'opponent-box';
        if (type === 'chaos') toast.classList.add('chaos-alert');
        if (type === 'error') toast.style.borderColor = 'var(--accent-red)';

        toast.style.padding = '1rem 2rem';
        toast.style.background = 'var(--glass-bg)';
        toast.style.backdropFilter = 'blur(20px)';
        toast.style.borderLeft = `4px solid ${type === 'error' ? 'var(--accent-red)' : (type === 'special' ? 'var(--accent)' : 'var(--primary)')}`;
        toast.innerHTML = `<span style="font-weight: 700; letter-spacing: 2px; text-shadow: 0 0 10px rgba(255,255,255,0.3);">${message.toUpperCase()}</span>`;

        container.appendChild(toast);

        toast.animate([
            { transform: 'translateX(100px) scale(0.8)', opacity: 0 },
            { transform: 'translateX(0) scale(1)', opacity: 1 }
        ], { duration: 600, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });

        setTimeout(() => {
            toast.animate([
                { transform: 'translateX(0) scale(1)', opacity: 1 },
                { transform: 'translateX(100px) scale(0.8)', opacity: 0 }
            ], { duration: 400, easing: 'ease-in' }).onfinish = () => toast.remove();
        }, 5000);
    },

    spawnParticles(x, y, color = 'var(--primary)', count = 20) {
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.style.position = 'fixed';
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            p.style.width = Math.random() * 8 + 4 + 'px';
            p.style.height = p.style.width;
            p.style.borderRadius = '50%';
            p.style.background = color;
            p.style.pointerEvents = 'none';
            p.style.zIndex = '10000';
            p.style.boxShadow = `0 0 20px ${color}`;

            document.body.appendChild(p);

            const destX = (Math.random() - 0.5) * 600;
            const destY = (Math.random() - 0.5) * 600;

            p.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${destX}px, ${destY}px) scale(0)`, opacity: 0 }
            ], {
                duration: Math.random() * 800 + 400,
                easing: 'cubic-bezier(0.1, 0.8, 0.1, 1)'
            }).onfinish = () => p.remove();
        }
    },

    updatePlayerList(players, hostId, myId) {
        const list = document.getElementById('player-list');
        list.innerHTML = '';
        players.forEach((p, index) => {
            const el = document.createElement('div');
            el.className = 'btn-premium';
            el.style.justifyContent = 'space-between';
            el.innerHTML = `
                <span>${p.username.toUpperCase()} ${p.id === hostId ? ' (HOST)' : ''}</span>
                ${p.id === myId ? '<span style="color: var(--primary); font-size: 0.7rem; font-weight: 800;">YOU</span>' : ''}
            `;
            list.appendChild(el);

            el.animate([
                { opacity: 0, transform: 'translateY(20px)' },
                { opacity: 1, transform: 'translateY(0)' }
            ], { duration: 600, delay: index * 100, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
        });

        if (myId === hostId) {
            document.getElementById('btn-start').classList.remove('hidden');
            document.getElementById('waiting-msg').classList.add('hidden');
        }
    },

    createCardElement(card) {
        const el = document.createElement('div');
        el.className = `card ${card.color} ${card.value}`;

        // Premium inner card styling
        el.innerHTML = `
            <div style="font-weight: 800; font-size: 3rem; text-shadow: 0 5px 15px rgba(0,0,0,0.5);">${this.formatCardValue(card.value)}</div>
            <div style="position: absolute; top: 15px; left: 15px; font-weight: 800; font-size: 1rem;">${this.formatCardValue(card.value)}</div>
            <div style="position: absolute; bottom: 15px; right: 15px; font-weight: 800; font-size: 1rem; transform: rotate(180deg);">${this.formatCardValue(card.value)}</div>
        `;
        return el;
    },

    renderHand(hand, onPlay) {
        const container = document.getElementById('my-hand');
        container.innerHTML = '';
        hand.forEach((card, index) => {
            const el = this.createCardElement(card);
            if (index > 0) el.style.marginLeft = '-80px';

            el.onclick = (e) => {
                this.spawnParticles(e.clientX, e.clientY, `var(--${card.color === 'special' ? 'accent' : (card.color === 'wild' ? 'primary' : 'primary')})`);
                onPlay(card.id);
            };

            el.oncontextmenu = (e) => {
                e.preventDefault();
                socket.emit('betCard', card.id);
            };

            if (card.isBet) {
                const badge = document.createElement('div');
                badge.className = 'bet-badge';
                badge.textContent = 'BET';
                el.appendChild(badge);
            }

            container.appendChild(el);

            el.animate([
                { opacity: 0, transform: 'translateY(150px) rotate(15deg) scale(0.5)' },
                { opacity: 1, transform: 'translateY(0) rotate(0deg) scale(1)' }
            ], {
                duration: 800,
                delay: index * 40,
                easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
            });
        });
    },

    formatCardValue(val) {
        const symbols = {
            draw2: '+2',
            wildDraw4: '+4',
            skip: '⊘',
            reverse: '⇄',
            bomb: '💥',
            swapHands: '🤝',
            colorBomb: '🌀',
            stealCard: '🔫',
            freezeTurn: '❄️'
        };
        return symbols[val] || val.toUpperCase();
    },

    updateBoard(topCard, currentColor, turnIndex, players) {
        const discard = document.getElementById('discard-pile');
        discard.innerHTML = '';
        const el = this.createCardElement(topCard);
        discard.appendChild(el);

        const swatch = document.getElementById('color-swatch');
        const colorMap = {
            red: 'var(--accent-red)',
            blue: 'var(--primary)',
            green: '#00ff88',
            yellow: '#ffcc00',
            special: 'var(--accent)',
            wild: 'var(--primary)'
        };
        const activeColor = colorMap[currentColor] || 'var(--primary)';
        swatch.style.background = activeColor;
        swatch.style.boxShadow = `0 0 30px ${activeColor}`;

        const currentTurnName = players[turnIndex]?.username;
        document.getElementById('current-turn').textContent = (currentTurnName || '-').toUpperCase();

        this.renderOpponents(players, turnIndex);

        // Shake board on special cards
        if (topCard.color === 'special') {
            document.getElementById('game-container').animate([
                { transform: 'translate(2px, 2px) rotate(0deg)' },
                { transform: 'translate(-2px, -4px) rotate(-1deg)' },
                { transform: 'translate(-6px, 0px) rotate(1deg)' },
                { transform: 'translate(6px, 4px) rotate(0deg)' },
                { transform: 'translate(2px, -2px) rotate(1deg)' }
            ], { duration: 300 });
        }
    },

    renderOpponents(players, turnIndex) {
        const container = document.getElementById('opponents');
        container.innerHTML = '';
        players.forEach((p, idx) => {
            const el = document.createElement('div');
            el.className = `opponent-box ${idx === turnIndex ? 'active' : ''}`;
            el.innerHTML = `
                <p style="font-weight: 800; font-size: 1rem; letter-spacing: 1px;">${p.username.toUpperCase()}</p>
                <p style="font-size: 0.75rem; color: var(--primary); font-weight: 700; opacity: 0.8;">${p.handCount} DATA UNITS</p>
            `;
            container.appendChild(el);
        });
    },

    showPowerupCinematic(user, name, desc) {
        const overlay = document.getElementById('powerup-overlay');
        const puUser = document.getElementById('pu-user');
        const puName = document.getElementById('pu-name');
        const puDesc = document.getElementById('pu-desc');

        puUser.textContent = `${user.toUpperCase()} HAS INITIATED`;
        puName.textContent = name;
        puDesc.textContent = desc;

        overlay.classList.remove('hidden');
        overlay.style.opacity = '1';

        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 800);
        }, 3500);
    },

    showTargetPicker(players) {
        const picker = document.getElementById('target-picker');
        const list = document.getElementById('target-list');
        list.innerHTML = '';
        players.forEach(p => {
            const btn = document.createElement('button');
            btn.className = 'btn-premium btn-primary';
            btn.textContent = p.username.toUpperCase();
            btn.onclick = () => {
                socket.emit('selectTarget', p.id);
                picker.classList.add('hidden');
            };
            list.appendChild(btn);
        });
        picker.classList.remove('hidden');
    }
};

UI.init();
