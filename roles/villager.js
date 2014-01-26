// Roles API Docs
// --------------
// Note: Most roles will probably want to inherit from Villager.
//
//      var Villager = require('./villager.js');
//      require('util').inherits(Role, Villager);
//
// Roles must be exported like this:
//
//      module.exports = Role;
var Villager = function () {
    // `Role.team`
    //
    // Can be either `wolf` or `villager`. Used to describe which side this role is on.
    this.team = 'villager';
    // `Role.toString()`
    //
    // Should return the role's name, no exceptions.
    this.toString = function () {
        return 'villager';
    };
    // `Role.onNight()`
    //
    // Optional function to call every nighttime.
    this.onNight = false;
    // `Role.acted`
    //
    // Internal. Used to determine if role has acted yet.
    this.acted = true;
    // `Role.minPlayers`
    //
    // The minimum amount of players for this role.
    this.minPlayers = 0;
    // `Role.canAct`
    //
    // Can this role do something at night?
    this.canAct = false;
    // `Role.name`
    //
    // Internal. Use to grab the name of the person this role is assigned to.
    this.name = 'bob';
    // `Role.actName`
    //
    // Used to describe what this role can do (eg: `see [player]`)
    this.actName = 'derp';
    // `Role.see()`
    //
    // Should return a string. Called when the seer observes this role.
    this.see = function () {
        return this.toString();
    };
    // `Role.commands`
    //
    // Any custom commands this role can execute. A JS object, like {'!shoot': function(arguments)}
    this.commands = {};
    // `Role.onDeath()`
    //
    // Function. Called on death.
    this.onDeath = false;
    // `Role.onOtherDeath()`
    //
    // Function. Called when another player dies.
    this.onOtherDeath = false;
    // `Role.description`
    //
    // A short description of this role and its abilities.
    this.description = 'Just an ordinary villager.';
};
module.exports = Villager;
