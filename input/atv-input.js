module.exports = function(RED) {
  function atvInputNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    //import the config node
    var atvSettings = RED.nodes.getNode(config.atvSettings);

    // Show state in GUI
    node.status({
      fill: "yellow",
      shape: "ring",
      text: `Connecting to ${atvSettings.name}...`
    });

    atvSettings.registerOnAppleTVConnected(tv => {
      node.tv = tv;
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
      if (!node.tv) {
        console.error("appleTV is disconnected!");
        return;
      }

      command = msg.payload
        .split(/\s+/)
        .map(w => w[0].toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
      node.tv.sendKeyCommand(atv.AppleTV.Key[command]).catch(error => {
        console.log(error);
      });
      node.send(msg);
    });
  }
  RED.nodes.registerType("atv-input", atvInputNode);
};
