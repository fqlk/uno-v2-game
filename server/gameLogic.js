const COLORS = ['red', 'green', 'blue', 'yellow'];
const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
const WILD_VALUES = ['wild', 'wildDraw4'];
const POWER_UPS = {
    bomb: { name: 'GRAVITY BOMB', desc: 'ALL OTHER OPERATORS DRAW 2!' },
    swapHands: { name: 'DATA SWAP', desc: 'EXCHANGE YOUR ENTIRE HAND WITH A TARGET!' },
    colorBomb: { name: 'SPECTRUM PULSE', desc: 'EVERYONE DRAWS 1 + YOU CHOOSE THE COLOR!' },
    stealCard: { name: 'NEURAL STEAL', desc: 'RANDOMLY STEAL 1 CARD FROM A TARGET OPERATOR!' },
    freezeTurn: { name: 'SYSTEM FREEZE', desc: 'SKIP THE NEXT 2 OPERATORS IN TURN ORDER!' }
};

const CHAOS_EVENTS = [
    { name: 'GRAVITY SHIFT', desc: 'THE TURN ROTATION HAS BEEN REVERSED!', action: (state) => { state.direction *= -1; } },
    {
        name: 'SOLAR FLARE', desc: 'EVERYONE DRAWS 1 DATA UNIT!', action: (state) => {
            state.players.forEach(p => {
                if (state.deck.length === 0) GameLogic.reshuffle(state);
                p.hand.push(state.deck.pop());
            });
        }
    },
    {
        name: 'DATA LEAK', desc: 'THE HOST JUST DREW AN EXTRA CARD!', action: (state) => {
            const host = state.players.find(p => p.id === state.hostId);
            if (host) {
                if (state.deck.length === 0) GameLogic.reshuffle(state);
                host.hand.push(state.deck.pop());
            }
        }
    }
];

class GameLogic {
    static generateDeck() {
        let deck = [];
        // Standard cards
        for (const color of COLORS) {
            // One 0 per color
            deck.push({ color, value: '0', id: Math.random().toString(36).substr(2, 9) });
            // Two of each 1-9, skip, reverse, draw2
            for (let i = 0; i < 2; i++) {
                for (const value of VALUES.slice(1)) {
                    deck.push({ color, value, id: Math.random().toString(36).substr(2, 9) });
                }
            }
        }
        // Wild cards
        for (let i = 0; i < 4; i++) {
            deck.push({ color: 'wild', value: 'wild', id: Math.random().toString(36).substr(2, 9) });
            deck.push({ color: 'wild', value: 'wildDraw4', id: Math.random().toString(36).substr(2, 9) });
        }
        // Custom Power-ups
        const powerUpCount = Math.floor(Math.random() * 5) + 4;
        const powerUpKeys = Object.keys(POWER_UPS);
        for (let i = 0; i < powerUpCount; i++) {
            const val = powerUpKeys[Math.floor(Math.random() * powerUpKeys.length)];
            deck.push({ color: 'special', value: val, id: Math.random().toString(36).substr(2, 9) });
        }

        return this.shuffle(deck);
    }

    static shuffle(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    static isValidMove(card, topCard, currentColor, playerHand) {
        // Special logic for wild cards
        if (card.color === 'wild') return true;

        // Custom power-ups (can be played anytime or based on specific logic)
        // For now, let's allow playing power-ups anytime your turn is active
        if (card.color === 'special') return true;

        if (card.color === currentColor) return true;
        if (card.value === topCard.value) return true;

        return false;
    }

    static handleAction(card, state) {
        // state: { direction, turnIndex, players, drawPile, discardPile, currentColor }
        const { value } = card;

        switch (value) {
            case 'skip':
                state.turnIndex = this.nextIndex(state.turnIndex, state.direction, state.players.length);
                break;
            case 'reverse':
                if (state.players.length === 2) {
                    state.turnIndex = this.nextIndex(state.turnIndex, state.direction, state.players.length);
                } else {
                    state.direction *= -1;
                }
                break;
            case 'draw2':
                state.pendingDraw = (state.pendingDraw || 0) + 2;
                break;
            case 'wildDraw4':
                state.pendingDraw = (state.pendingDraw || 0) + 4;
                state.waitingForColor = state.turnIndex;
                break;
            case 'wild':
                state.waitingForColor = state.turnIndex;
                break;
            case 'bomb':
                state.players.forEach((p, idx) => {
                    if (idx !== state.turnIndex) {
                        for (let i = 0; i < 2; i++) {
                            if (state.deck.length === 0) this.reshuffle(state);
                            p.hand.push(state.deck.pop());
                        }
                    }
                });
                break;
            case 'colorBomb':
                state.players.forEach(p => {
                    if (state.deck.length === 0) this.reshuffle(state);
                    p.hand.push(state.deck.pop());
                });
                state.waitingForColor = state.turnIndex;
                break;
            case 'freezeTurn':
                state.turnIndex = this.nextIndex(state.turnIndex, state.direction, state.players.length);
                state.turnIndex = this.nextIndex(state.turnIndex, state.direction, state.players.length);
                break;
            case 'swapHands':
                state.waitingForSwap = state.turnIndex;
                break;
            case 'stealCard':
                state.waitingForSteal = state.turnIndex;
                break;
        }
    }

    static checkBetResult(state, playedCard) {
        const results = [];
        state.players.forEach(p => {
            if (p.lockedBet && (playedCard.value === p.lockedBet.value || playedCard.color === p.lockedBet.color)) {
                // Bet won!
                const betIdx = p.hand.findIndex(c => c.id === p.lockedBet.id);
                if (betIdx !== -1) {
                    p.hand.splice(betIdx, 1);
                    results.push({ username: p.username, card: p.lockedBet });
                }
            }
            p.lockedBet = null; // Reset bet after one check
        });
        return results;
    }

    static triggerChaosEvent(state) {
        const event = CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)];
        event.action(state);
        return event;
    }

    static getPowerupInfo(val) {
        return POWER_UPS[val] || { name: val.toUpperCase(), desc: 'UNKNOWN SPECIAL PROTOCOL' };
    }

    static nextIndex(current, direction, total) {
        let next = current + direction;
        if (next >= total) return 0;
        if (next < 0) return total - 1;
        return next;
    }

    static reshuffle(state) {
        const top = state.discardPile.pop();
        state.drawPile = this.shuffle(state.discardPile);
        state.discardPile = [top];
    }
}

module.exports = GameLogic;
