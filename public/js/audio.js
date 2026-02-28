const AudioEngine = {
    ctx: null,
    sounds: {},

    async init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        // High-quality procedural sounds
        this.sounds.place = this.createSound({ freq: 440, type: 'triangle', duration: 0.1, volume: 0.1, decay: 0.05 });
        this.sounds.draw = this.createSound({ freq: 220, type: 'sine', duration: 0.2, volume: 0.2, decay: 0.1 });
        this.sounds.uno = this.createSound({ freq: 880, type: 'square', duration: 0.3, volume: 0.05, decay: 0.2 });
        this.sounds.special = this.createPowerUpSound();
        this.sounds.victory = this.createVictoryChime();
    },

    createSound({ freq, type, duration, volume, decay }) {
        return () => {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (decay || duration));

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        };
    },

    createPowerUpSound() {
        return () => {
            if (!this.ctx) return;
            // Laser sweep effect
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.5);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.5);
        };
    },

    createVictoryChime() {
        return () => {
            if (!this.ctx) return;
            const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
            notes.forEach((freq, i) => {
                setTimeout(() => {
                    this.createSound({ freq, type: 'triangle', duration: 0.8, volume: 0.1, decay: 0.6 })();
                }, i * 120);
            });
        };
    },

    play(name) {
        if (!this.ctx) this.init(); // Auto-init on first play
        if (this.sounds[name]) this.sounds[name]();
    }
};
