var Cywolf = require('./index.js');
var should = require('should');
var game = new Cywolf();

it('joins', function (done) {
    game.once('joined', function (data) {
        if (data.player == 'test1') {
            done();
        }
    });
    game.emit('join', {
        player: 'test1'
    });
});
it('quits', function (done) {
    game.once('quitted', function (data) {
        if (data.player == 'test1') {
            done();
        }
    });
    game.emit('quit', {
        player: 'test1'
    });
});
it('starts', function (done) {
    game.emit('join', {
        player: 'first'
    });
    game.emit('join', {
        player: 'Second'
    });
    game.emit('join', {
        player: 'third'
    });
    game.emit('join', {
        player: 'test4'
    });
    setTimeout(function () {
        game.once('start', done);
        game.emit('start');
    }, 7);
});
it('kills', function (done) {
    game.once('death', function (data) {
        if (data.player == 'test4') {
            done();
        }
    });
    game.kill('test4');
});
it('lynches', function (done) {
    game.once('lynch', function (data) {
        if (data.to == 'Second' && data.from == 'third') {
            done();
        }
    });
    game.lynch('Second', 'third')
})
it('autocompletes', function () {
    game.autocomplete('f').should.equal('first');
    game.autocomplete('s').should.equal('Second');
    game.autocomplete('F').should.not.equal('first');
});
it('checks for ending', function (done) {
    game.once('gameover', function () {
        done();
    });
    game.kill('Second');
});
