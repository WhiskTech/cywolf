Villager = require('./villager.js')
util = require('util')
Seer = (Wolfgame) ->
        this.toString = () -> return 'harlot'
        this.acted = false
        this.canAct = true
        this.visited = false;
        this.actName = 'visit'
        this.description = 'You can visit one person every night. Visiting a wolf will kill you.'
        this.onDay = () ->
                if this.visited && Wolfgame.players[this.visited]
                        if Wolfgame.players[this.visited].toString() == 'wolf'
                                Wolfgame.kill(this.name, ' made the unfortunate mistake of visiting a wolf\'s house last night and is now dead.');
        this.act = (player) ->
                if Wolfgame.autocomplete(player, this.name) && player != this.name
                        player = Wolfgame.autocomplete(player)
                        role = Wolfgame.players[player].see();
                        Wolfgame.pm(this.name, 'You are spending the night with ' + player + '. Have a good time!');
                        Wolfgame.pm(player, 'You are spending the night with ' + this.name + '. Have a good time!');
                        this.acted = true    
        this.minPlayers = 8;
        return this
util.inherits(Seer, Villager)
module.exports = Seer