var Cywolf = require('./index.js');
var game = new Cywolf();

it('joins', function(done) {    
    game.once('joined', function(data) {
        if (data.player == 'test1') {
            done();
        }
    });
    game.emit('join', {player: 'test1'});
});
it('quits', function(done) {
    game.once('quitted', function(data) {
	if (data.player == 'test1') {
	    done();
	}
    });
    game.emit('quit', {player: 'test1'});
});
it('starts', function(done) {
    game.emit('join', {player: 'test1'});
    game.emit('join', {player: 'test2'});
    game.emit('join', {player: 'test3'});
    game.emit('join', {player: 'test4'});
    setTimeout(function() {
	game.once('start', done);
	game.emit('start');
    }, 100);
});
it('kills', function(done) {
    game.once('death', function(data) {
	if (data.player == 'test4') {
	    done();
	}
    });
    game.kill('test4');
});
