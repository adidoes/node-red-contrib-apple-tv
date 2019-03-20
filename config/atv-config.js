module.exports = function(RED) {
  const atv = require("node-appletv");

  var pin = null;

  function atvSettings(atvSettings) {
    const node = this;
    RED.nodes.createNode(this, atvSettings);
    node.appleTVkey = atvSettings.appleTVkey;
    node.pin = atvSettings.pin;
    node.disconnectedHandlers = [];
    node.connectedHandlers = [];
    node.on("close", function() {
      pin = null;
    });
    // disconnect/connect notification handlers
    node.onDisconnected = err =>
      node.disconnectedHandlers.forEach(handler => handler(err));

    node.onConnected = err =>
      node.connectedHandlers.forEach(handler => handler(err));

    node.registerOnAppleTVConnected = handler =>
      node.connectedHandlers.push(handler);
    node.registerOnAppleTVDisconnected = handler =>
      node.disconnectedHandlers.push(handler);

    //Connecting to appleTV
    const credentials = atv.parseCredentials(node.appleTVkey);
    atv
      .scan(atvSettings.uniqueIdentifier)
      .then(devices => {
        if (devices.length <= 0) {
          console.error(`${atvSettings.name} not found.`);
        } else {
          return devices[0].openConnection(credentials);
        }
      })
      .then(TV => node.onConnected(TV))
      .catch(err => {
        console.log(err);
        node.onDisconnected();
      });
  }

  RED.nodes.registerType("atv-config", atvSettings);
  // DISCOVER ATVs ON LOCAL NETWORK
  RED.httpAdmin.get(
    "/atv/discover",
    RED.auth.needsPermission("atv-config.read"),
    function(req, res, next) {
      return atv
        .scan()
        .then(devices => {
          var options = devices.map(device => {
            mapped = { name: device.name, uid: device.uid };
            return mapped;
          });
          return options;
        })
        .then(options => {
          res.send(options);
        });
    }
  );
  RED.httpAdmin.get(
    "/atv/pair/:uid",
    RED.auth.needsPermission("atv-config.read"),
    function(req, res, next) {
      return atv
        .scan(req.params.uid)
        .then(devices => {
          // devices is an array of AppleTV objects
          let device = devices[0];
          return device
            .openConnection()
            .then(device => {
              return device.pair();
            })
            .then(callback => {
              return new Promise((resolve, reject) => {
                var poller = setInterval(() => {
                  console.log("polling - " + pin);
                  if (pin != null && pin.length == 4) {
                    clearInterval(poller);
                    resolve([callback, pin]);
                  }
                }, 1500);
              });
            })
            .then(([callback, pin]) => {
              console.log("finished polling - " + pin);
              return callback(pin.toString());
            });
        })
        .then(device => {
          // you're paired!
          let credentials = device.credentials.toString();
          console.log(credentials);
          res.send(credentials);
          return device;
        })
        .then(device => {
          pin = null;
          device.closeConnection();
        })
        .catch(error => {
          console.log(error);
        });
    }
  );
  RED.httpAdmin.post(
    "/atv/postPin",
    RED.auth.needsPermission("atv-config.read"),
    function(req, res, next) {
      console.log(req.body);
      pin = req.body.pin;
      res.sendStatus(200);
    }
  );
};
