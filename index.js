// Wolfgame module!
var util = require('util');
var Chance = require('chance');
var _ = require('underscore');
var chance = new Chance();
var fs = require('fs');
var coffee = require('coffee-script');
var EventEmitter = require('events').EventEmitter;
var Wolfgame = function(options) {
    if (!options) {
	options = {irc: false};
    }
    this.players = {};
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
    this.checkEnd = function() {
	var wolves = 0;
	var vills = 0;
	_.keys(process.game.players).forEach(function(player) {
	    if (process.game.players[player].team == 'wolf'){
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
    this.kill = function(player, reason, hooks) {
	if (typeof hooks == 'undefined') {
	    hooks = false;
	}
	this.emit('death', {player: player, reason: reason, role: this.players[player]});
	this.dead[player] = this.players[player];
        delete this.players[player];
        if (this.phase !== 'start') {
	    var end = this.checkEnd();
	    if (!end) {
		if (this.dead[player].onDeath) {
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
		    if (p.onOtherDeath) {
			p.onOtherDeath(process.game, player.name);
		    }
		});
		if (hooks) {
		    hooks.after(this, player);
		}
	    }
	    return end;
        }
        
    };
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
    this.pm = function(to, message) {
	this.emit('pm', {to: to, message: message});
    };
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
    this.lynch = function(player, lynchee) {
	if (process.game.autocomplete(player) && process.game.autocomplete(lynchee)) {
	    lynchee = process.game.autocomplete(lynchee);
	    player = process.game.autocomplete(player);
	    process.game.lynches[lynchee] = player;
	    process.game.emit('lynch', {from: lynchee, to: player});
	    process.game.checkLynches();
	}
    };
    this.randomPlayer = function() {
        return _.keys(this.players)[chance.integer({min: 0, max: _.keys(this.players).length - 1})];
    };
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
                    console.log('Error reading role: ' + role, err);
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
		    console.log('Error reading role: ' + role, err);
		    return;
		}
		role = new role(process.game);
		if (role.toString() == 'villager') {
		    return;
		}
		if (!role.minPlayers) {
		    role.minPlayers = 0;
		}
                console.log('Loaded role: ' + role.toString() + ' (requires ' + role.minPlayers + ' players)');
		if (_.keys(process.game.players).length >= role.minPlayers) {
		    var torole = process.game.randomUPlayer();
		    console.log('Allocating role: ' + role.toString() + ' to player ' + torole);
		    process.game.players[torole] = role;
		    process.game.players[torole].name = torole;
		    console.log(process.game.players[torole].toString());
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
    this.on('join', function(data) {
	if (this.phase != 'start') {
	    return this.emit('error', new Error('You can\'t join or quit now!'));
	}
	if (_.keys(this.players).indexOf(data.player) !== -1) {
            this.emit('notice', {to: data.player, message: 'You are already playing.'});
	}
	else {
	    this.players[data.player] = 'unallocated';
	    this.emit('joined', {player: data.player});
	}
    });
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
    this.on('start', function() {
	if (this.phase != 'start') {
	    return this.emit('error', new Error('You can\'t start the game now!'));
	}
	this.emit('starting');
	this.phase = 'night';
	this.allocate();
    });
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
	    if (p.canAct) {
		p.acted = false;
	    }
	    if (p.onDay) {
		p.onDay();
	    }
	});
    });
    this.on('gameover', function() {
        this.timeouts.forEach(function(t) {
            clearTimeout(t);
        });
    });
};
util.inherits(Wolfgame, EventEmitter);
module.exports = Wolfgame;


