cbus.broadcast = {};

cbus.broadcast.listeners = [];

cbus.broadcast.send = function(name, data) {
    console.log(`[broadcast] ${name}`, data);

    for (let i = 0, l = cbus.broadcast.listeners.length; i < l; i++) {
        if (cbus.broadcast.listeners[i].name === name) {
            cbus.broadcast.listeners[i].callback({
                name: name,
                data: data || {}
            });
        }
    }
};

cbus.broadcast.listen = function(name, callback, runOnAttach) {
    cbus.broadcast.listeners.push({
        name: name,
        callback: callback
    });

    if (runOnAttach === true) {
        callback();
    }
};
