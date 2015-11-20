cbus.broadcast = {};

cbus.broadcast.listeners = [];

cbus.broadcast.send = function(name, data) {
    for (listener of cbus.broadcast.listeners) {
        if (listener.name === name) {
            listener.callback({
                name: name,
                data: data
            });
        }
    }
};

cbus.broadcast.listen = function(name, callback) {
    cbus.broadcast.listeners.push({
        name: name,
        callback: callback
    });
};
