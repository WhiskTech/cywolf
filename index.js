//     Cywolf: evented, modular wolfgame for node
//     Created by whiskers75 - http://whiskers75.com
//     This module is licensed under the ISC License.
var util = require('util');
var Chance = require('chance');
var _ = require('underscore');
var chance = new Chance();
var fs = require('fs');
var coffee = require('coffee-script');
var EventEmitter = require('events').EventEmitter;
var Wolfgame = function(options) {
    // Options:
    //  - irc (if you're using IRC)
    if (!options) {
	options = {irc: false};
    }
    this.players = {};
    // Valid phases: start, day, night
    this.phase = 'start';
    this.lynches = {};
    this.dead = {};
    this.over = false;
    this.timeouts = [];
    if (options.irc) {
	this.bold = require('irc-colors').bold;
    }
    else {
	this.bold = function(x) {
	    return x;
	};
    }
    this.Villager = require('./roles/villager.js');
    // Internal functions
    // ------------------
    // `Wolfgame.checkEnd()`
    //
    // Checks if the game is over yet. Return value: true/false
    this.checkEnd = function() {
	var wolves = 0;
	var vills = 0;
	_.keys(process.game.players).forEach(function(player) {
            if (typeof process.game.players[player] == 'undefined') {
		return;
	    }
	    if (process.game.players[player].role.team == 'wolf'){
		wolves++;
	    }
	    else {
		vills++;
	    }
	});
	if (wolves >= vills || vills == 0) {
	    process.game.emit('gameover', {win: 'wolves'});
	    process.game.over = true;
	    return true;
	}
	if (wolves == 0) {
	    process.game.emit('gameover', {win: 'villagers'});
	    process.game.over = true;
	    return true;
	}
	return false;
    };
    // `Wolfgame.autocomplete(player, from)`
    //
    // Autocompletes `player`'s username, with optional `from` to determine the recipient of error messages.
    this.autocomplete = function(player, from) {
        var count = 0;
        _.keys(this.players).forEach(function(p) {
            if (p.indexOf(player) == 0 || p.toLowerCase().indexOf(player) == 0) {
                player = p;
                count++;
            }
        });
        if (_.keys(this.players).indexOf(player) == -1) {
            if (from) {
                this.emit('notice', {to: from, message: 'That player does not exist.'});
            }
            return false;
        }
        if (count > 1) {
            if (from) {
                this.emit('notice', {to: from, message: 'Ambiguous autocompletion. Please refine!'});
            }
            return false;
        }
        return player;
    };
    
    
    // `Wolfgame.checkLynches()`
    //
    // Checks if the current lynches in `Wolfgame.lynches` are enough to kill someone, and if so, kills that person.
    this.checkLynches = function() {
        var votes = {};
        if (this.phase !== 'day') {
            return;
        }
        _.keys(this.lynches).forEach(function(lynch) {
            lynch = process.game.lynches[lynch];
            if (!votes[lynch]) {
                votes[lynch] = 0;
            }
            votes[lynch]++;
        });
        Object.keys(votes).forEach(function(vote) {
            var voted = votes[vote];
            if (voted >= (_.keys(process.game.players).length - (_.keys(process.game.players).length > 4 ? 2 : 1))) {
                if (!process.game.kill(vote, ' was lynched by the angry mob of villagers.')) {
                    process.game.emit('night');
                }
                return;
            }
        });
    };
    
    
    // `Wolfgame.randomUPlayer()`
    //
    // Returns a random unallocated player. Only really useful for allocation.
    this.randomUPlayer = function() {
        var roled = [];
        _.keys(this.players).forEach(function(player) {
            player = process.game.players[player];
            if (player != 'unallocated') {
                roled.push(player);
                delete process.game.players[player.name];
            }
        });
        var chosen = _.keys(this.players)[chance.integer({min: 0, max: _.keys(this.players).length - 1})];
        roled.forEach(function(p) {
            process.game.players[p.name] = p;
        });
        return chosen;
    };
    // External functions
    // ------------------
    // `Wolfgame.randomPlayer()`
    //
    // Returns a random player.
    this.randomPlayer = function() {
        return _.keys(this.players)[chance.integer({min: 0, max: _.keys(this.players).length - 1})];
    };
    // `Wolfgame.lynch(player, lynchee)`
    //
    // Makes `lynchee` vote for `player`.
    this.lynch = function(player, lynchee) {
        if (process.game.autocomplete(player) && process.game.autocomplete(lynchee)) {
            lynchee = process.game.autocomplete(lynchee);
            player = process.game.autocomplete(player);
            process.game.lynches[lynchee] = player;
            process.game.emit('lynch', {from: lynchee, to: player});
            process.game.checkLynches();
        }
    };
    // `Wolfgame.pm(to, message)`
    //
    // Message `to` with `message`. 
    this.pm = function(to, message) {
        this.emit('pm', {to: to, message: message});
    };
    // `Wolfgame.kill()`
    //
    // Kills a player, with optional `reason`, and `hooks`.
    // Hooks format: `hooks = {after: function() {}};`
    this.kill = function(player, reason, hooks) {
	if (typeof hooks == 'undefined') {
	    hooks = false;
	}
	this.emit('death', {player: player, reason: reason, role: this.players[player].role});
	this.dead[player] = this.players[player];
        delete this.players[player];
        if (this.phase !== 'start') {
	    var end = this.checkEnd();
	    if (!end) {
		if (this.dead[player].role.onDeath) {
		    player.onDeath(this, player.name);
		}
		_.keys(this.players).forEach(function(p) {
		    if (typeof p == 'undefined') {
			return;
		    }
		    p = process.game.players[p];
                    if (typeof p == 'undefined') {
                        return;
                    }
		    if (p.role.onOtherDeath) {
			p.role.onOtherDeath(process.game, player.name);
		    }
		});
		if (hooks) {
		    hooks.after(this, player);
		}
	    }
	    return end;
        }
    };
    
    // `Wolfgame.listRoles(callback);`
    //
    // Lists roles, calling `callback` with a string of roles.
    
    this.listRoles = function(cb) {
        fs.readdir(__dirname + '/roles', function(err, roles) {
            if (err) { // We're screwed
                throw err;
            }
            var ret = [];
            roles.forEach(function(role) {
                try {
                    role = require(__dirname + '/roles/' + role);
                }
                catch(e) {
                    return;
                }
                role = new role(process.game);
                if (!role.minPlayers) {
                    role.minPlayers = 4;
                }
		ret.push(role.toString() + ' [' + role.minPlayers + ']');
            });
	    cb(ret.join(', '));
	});
    };
    // `Wolfgame.allocate()`
    //
    // Allocates roles.
    this.allocate = function() {
	process.game = this;
	fs.readdir(__dirname + '/roles', function(err, roles) {
	    if (err) { // We're screwed
		throw err;
	    }
	    var roled = [];
	    roles.forEach(function(role) {
		try {
		    role = require(__dirname + '/roles/' + role);
		}
		catch(e) {
		    return;
		}
		role = new role(process.game);
		if (role.toString() == 'villager') {
		    return;
		}
		if (!role.minPlayers) {
		    role.minPlayers = 0;
		}
		if (_.keys(process.game.players).length >= role.minPlayers) {
		    var torole = process.game.randomUPlayer();
		    process.game.players[torole].role = role;
		    process.game.players[torole].name = torole;
		}
	    });
            var defvil = new process.game.Villager(this);
            _.keys(process.game.players).forEach(function(player) {
                if (process.game.players[player] == 'unallocated') {
                    process.game.players[player] = defvil;
                    process.game.players[player].name = player;
                }
            });
            return process.game.emit('night');
	});
    };
    // Events
    // ------

    
    // `'join' {player: 'player'}`
    //
    // Emit to join a player.
    //
    // `'quitted', {player: 'player'}`
    //
    // Emitted when a player joins.
    this.on('join', function(data) {
	if (this.phase != 'start') {
	    // `'error' instanceof Error`
	    //
	    // Emitted when an error is thrown. **Have some code handling errors, or one error event will crash the game!**
	    return this.emit('error', new Error('You can\'t join or quit now!'));
	}
	if (_.keys(this.players).indexOf(data.player) !== -1) {
	    // `'notice', {to: 'player', message: 'blah'}`
	    //
	    // Emitted when Cywolf wants to send a notice to a player.
            this.emit('notice', {to: data.player, message: 'You are already playing.'});
	}
	else {
	    this.players[data.player] = 'unallocated';
	    this.emit('joined', {player: data.player});
	}
    });
    // `'quit' {player: 'player'}`
    //
    // Emit to quit a player.
    //
    // `'quitted' {player: 'player'}`
    //
    // Emitted when a player quits.
    this.on('quit', function(data) {
        if (this.phase != 'start') {
            return this.emit('error', new Error('You can\'t join or quit now!'));
        }
	if (this.phase == 'start') {
	    if (_.keys(this.players).indexOf(data.player) == -1) {
		return this.emit('notice', {to: data.player, message: 'You are not playing.'});
	    }
	    delete this.players[data.player];
	    this.emit('quitted', {player: data.player});
	}
    });
    // `'start'`
    //
    // Emit to start the game.
    //
    // `'starting'`
    //
    // Emitted when the game is starting.
    this.on('start', function() {
	if (this.phase != 'start') {
	    return this.emit('error', new Error('You can\'t start the game now!'));
	}
	this.emit('starting');
	this.phase = 'night';
	this.allocate();
    });
    // `'night'`
    //
    // Emitted when night starts. Note that the frontend is expected to handle roles!
    this.on('night', function() {
	this.phase = 'night';
	this.killing = '';
	this.timeouts.forEach(function(t) {
	    clearTimeout(t);
	});
	setTimeout(function() {
	    process.game.timeouts.push(setTimeout(function() {
		if (process.game.phase == 'night') {
		    process.game.emit('day');
		}
	    }, 120000));
	}, 1000);
    });
    // `day`
    //
    // Emitted when day starts.
    this.on('day', function() {
	this.phase = 'day';
	this.lynches = {};
        this.timeouts.forEach(function(t) {
            clearTimeout(t);
        });
	_.keys(this.players).forEach(function(p) {
	    if (typeof p == 'undefined') {
		return;
	    }
	    p = process.game.players[p];
            if (typeof p == 'undefined') {
                return;
            }
	    if (p.role.canAct) {
		p.acted = false;
	    }
	    if (p.role.onDay) {
		p.onDay();
	    }
	});
    });
    // `gameover`
    //
    // Emitted when the game ends.
    this.on('gameover', function() {
        this.timeouts.forEach(function(t) {
            clearTimeout(t);
        });
    });
};
util.inherits(Wolfgame, EventEmitter);
module.exports = Wolfgame;


