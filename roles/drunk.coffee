Villager = require('./villager.js')
util = require('util')
Drunk = (Wolfgame) ->
        this.toString = () -> return 'drunkard'
        this.description = 'You have been drinking too much!'
        this.see = () -> return 'drunkard'
        this.onNight = () -> Wolfgame.pm(this.name, 'You have been drinking too much! You are the drunkard!')
        this.minPlayers = 8;
        return this
util.inherits(Drunk, Villager)
module.exports = Drunk