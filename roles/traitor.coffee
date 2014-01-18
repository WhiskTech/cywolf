Villager = require('./villager.js')
Wolf = require('./wolf.js')
util = require('util')
Traitor = (Wolfgame) ->
        this.toString = () -> return 'villager'
        this.description = 'You are a villager, who becomes a wolf after all the wolves are dead.'
        this.see = () -> return 'villager'
        this.onOtherDeath = () ->
                wolves = 0;
                Object.keys(Wolfgame.players).forEach (player) -> wolves++ if player.team == 'wolf'
                if wolves == 0
                        Wolfgame.emit('traitor')
                        thisp = Wolfgame.players[this.name]
                        thisname = this.name
                        thisp = new Wolf(Wolfgame)
                        thisp.name = thisname
        this.minPlayers = 8;
        return this
util.inherits(Traitor, Villager)
module.exports = Traitor