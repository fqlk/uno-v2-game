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

        setInterval(() => {
            const p = document.createElement('div');
            p.style.cssText = `
                position: absolute;
                left: ${Math.random() * 100}%;
                top: 110%;
                width: 2px;
                height: 2px;
                background: rgba(255, 255, 255, 0.15);
                box-shadow: 0 0 8px rgba(0, 212, 255, 0.4);
                border-radius: 50%;
            `;
            layer.appendChild(p);

            p.animate([
                { transform: 'translateY(0) scale(1)', opacity: 0 },
                { transform: 'translateY(-100px)', opacity: 0.4, offset: 0.2 },
                { transform: `translateY(-${window.innerHeight + 200}px) scale(0)`, opacity: 0 }
            ], {
                duration: Math.random() * 5000 + 5000,
                easing: 'linear'
            }).onfinish = () => p.remove();
        }, 500);
    },

    showScreen(screenName) {
        Object.values(this.screens).forEach(s => s.classList.add('hidden'));
        const activeScreen = this.screens[screenName];
        activeScreen.classList.remove('hidden');

        activeScreen.animate([
            { opacity: 0, transform: 'translateY(20px) scale(0.97)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' }
        ], { duration: 600, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
    },

    notify(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message.toUpperCase()}</span>`;

        container.appendChild(toast);

        toast.animate([
            { transform: 'translateX(60px)', opacity: 0 },
            { transform: 'translateX(0)', opacity: 1 }
        ], { duration: 400, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });

        setTimeout(() => {
            toast.animate([
                { transform: 'translateX(0)', opacity: 1 },
                { transform: 'translateX(60px)', opacity: 0 }
            ], { duration: 300, easing: 'ease-in' }).onfinish = () => toast.remove();
        }, 4000);
    },

    spawnParticles(x, y, color = 'var(--primary)', count = 15) {
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                width: ${Math.random() * 6 + 3}px;
                height: ${Math.random() * 6 + 3}px;
                border-radius: 50%;
                background: ${color};
                pointer-events: none;
                z-index: 10000;
                box-shadow: 0 0 10px ${color};
            `;
            document.body.appendChild(p);

            const destX = (Math.random() - 0.5) * 400;
            const destY = (Math.random() - 0.5) * 400;

            p.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${destX}px, ${destY}px) scale(0)`, opacity: 0 }
            ], {
                duration: Math.random() * 600 + 300,
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
                <span>${p.username.toUpperCase()} ${p.id === hostId ? '(HOST)' : ''}</span>
                ${p.id === myId ? '<span style="color: var(--primary); font-size: 0.65rem; font-weight: 800;">YOU</span>' : ''}
            `;
            list.appendChild(el);

            el.animate([
                { opacity: 0, transform: 'translateY(15px)' },
                { opacity: 1, transform: 'translateY(0)' }
            ], { duration: 500, delay: index * 80, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
        });

        if (myId === hostId) {
            document.getElementById('btn-start').classList.remove('hidden');
            document.getElementById('waiting-msg').classList.add('hidden');
        }
    },

    createCardElement(card) {
        const el = document.createElement('div');
        el.className = `card ${card.color}`;

        const displayValue = this.formatCardValue(card.value);
        el.innerHTML = `
            <span class="card-corner top">${displayValue}</span>
            <span class="card-value">${displayValue}</span>
            <span class="card-corner bottom">${displayValue}</span>
        `;
        return el;
    },

    renderHand(hand, onPlay) {
        const container = document.getElementById('my-hand');
        container.innerHTML = '';
        hand.forEach((card, index) => {
            const el = this.createCardElement(card);

            el.onclick = (e) => {
                const colorMap = {
                    red: '#ef4444',
                    blue: '#3b82f6',
                    green: '#22c55e',
                    yellow: '#eab308',
                    special: '#a855f7',
                    wild: '#00d4ff'
                };
                this.spawnParticles(e.clientX, e.clientY, colorMap[card.color] || '#00d4ff');
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
                { opacity: 0, transform: 'translateY(80px) scale(0.6)' },
                { opacity: 1, transform: 'translateY(0) scale(1)' }
            ], {
                duration: 500,
                delay: index * 35,
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
        el.style.cursor = 'default';
        discard.appendChild(el);

        // Entrance animation for discard
        el.animate([
            { transform: 'scale(0.5) rotate(-15deg)', opacity: 0 },
            { transform: 'scale(1) rotate(0deg)', opacity: 1 }
        ], { duration: 400, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });

        const swatch = document.getElementById('color-swatch');
        const colorMap = {
            red: '#ef4444',
            blue: '#3b82f6',
            green: '#22c55e',
            yellow: '#eab308',
            special: '#a855f7',
            wild: '#00d4ff'
        };
        const activeColor = colorMap[currentColor] || '#00d4ff';
        swatch.style.background = activeColor;
        swatch.style.boxShadow = `0 0 20px ${activeColor}`;

        const currentTurnName = players[turnIndex]?.username;
        document.getElementById('current-turn').textContent = (currentTurnName || '-').toUpperCase();

        this.renderOpponents(players, turnIndex);

        // Board shake on special cards
        if (topCard.color === 'special') {
            document.getElementById('game-container').animate([
                { transform: 'translate(2px, 1px)' },
                { transform: 'translate(-3px, -2px)' },
                { transform: 'translate(3px, 2px)' },
                { transform: 'translate(-1px, -1px)' },
                { transform: 'translate(0, 0)' }
            ], { duration: 250 });
        }
    },

    renderOpponents(players, turnIndex) {
        const container = document.getElementById('opponents');
        container.innerHTML = '';
        players.forEach((p, idx) => {
            const el = document.createElement('div');
            el.className = `opponent-box ${idx === turnIndex ? 'active' : ''}`;
            el.innerHTML = `
                <p class="opponent-name">${p.username.toUpperCase()}</p>
                <p class="opponent-cards">${p.handCount} CARDS</p>
            `;
            container.appendChild(el);
        });
    },

    showPowerupCinematic(user, name, desc) {
        const overlay = document.getElementById('powerup-overlay');
        const puUser = document.getElementById('pu-user');
        const puName = document.getElementById('pu-name');
        const puDesc = document.getElementById('pu-desc');

        puUser.textContent = `${user.toUpperCase()} ACTIVATED`;
        puName.textContent = name;
        puDesc.textContent = desc;

        overlay.classList.remove('hidden');
        overlay.style.opacity = '1';

        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 600);
        }, 3000);
    },

    showTargetPicker(players) {
        const picker = document.getElementById('target-picker');
        const list = document.getElementById('target-list');
        list.innerHTML = '';
        players.forEach(p => {
            const btn = document.createElement('button');
            btn.className = 'btn-premium btn-primary';
            btn.style.gridColumn = 'span 1';
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
