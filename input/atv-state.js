module.exports = function(RED) {
  function atvStateNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    //import the config node
    var atvSettings = RED.nodes.getNode(config.atvSettings);
    const postCurrentState = () => {
      if (!node.tv) {
        console.error("appletv is disconnected!");
        return;
      }
      node.tv
        .requestPlaybackQueue({
          location: 0,
          length: 1,
          includeMetadata: true,
          includeLyrics: true,
          includeLanguageOptions: true
        })
        .then(info => {
          node.send({
            topic: node.tv.name,
            payload: info
          });
        });
    };

    // Show state in GUI, and register to notification
    node.status({
      fill: "yellow",
      shape: "ring",
      text: `Connecting to ${atvSettings.name}...`
    });

    atvSettings.registerOnAppleTVConnected(tv => {
      node.tv = tv;
      node.tv.on("nowPlaying", info => {
        node.send({
          topic: node.tv.name,
          payload: info
        });
      });
      postCurrentState();
      node.status({
        fill: "green",
        shape: "dot",
        text: `${atvSettings.name} connected.`
      });
    });

    atvSettings.registerOnAppleTVDisconnected(() => {
      node.tv = null;
      node.status({
        fill: "red",
        shape: "dot",
        text: `${atvSettings.name} disconnected.`
      });
    });

    node.on("input", function(msg) {
      postCurrentState();
    });
  }
  RED.nodes.registerType("atv-state", atvStateNode);
};
