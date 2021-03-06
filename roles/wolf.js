var Villager = require('./villager.js');
var util = require('util');
var Wolf = function(Wolfgame) {
    this.acted = false;
    this.canAct = true;
    this.team = 'wolf';
    this.actName = 'kill';
    this.toKill = false;
    this.toString = function() {
	return 'wolf';
    };
    this.description = 'You can choose one person to kill every night.';
    this.act = function(target) {
	if (Wolfgame.autocomplete(target, this.name) && target != this.name) {
            target = Wolfgame.autocomplete(target);
	    this.toKill = target;
	    Wolfgame.pm(this.name, 'You have selected ' + Wolfgame.bold(target) + ' to be killed.');
	    this.acted = true;
	}
    };
    this.onDay = function() {
	if (this.toKill) {
	    Wolfgame.kill(this.toKill, ' was mauled by werewolves and died.', {after: function() {Wolfgame.emit('tolynch');}});
	    this.toKill = false;
	}
    };
    this.see = function() {
        return 'wolf';
    };
    this.minPlayers = 4;
};
util.inherits(Wolf, Villager);
module.exports = Wolf;

