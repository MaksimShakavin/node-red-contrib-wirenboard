const WirenboardHelper = require('../lib/WirenboardHelper.js');
var mqtt = require('mqtt');

module.exports = function(RED) {
    class WirenboardNodeMotor {
        constructor(config) {
            RED.nodes.createNode(this, config);

            var node = this;
            node.config = config;
            node.cleanTimer = null;
            node.runningTimer = null;
            node.is_subscribed = false;

            //get server node
            node.server = RED.nodes.getNode(node.config.server);

            if (node.server) {

                node.on('input', function (message_in) {
                    clearTimeout(node.cleanTimer);
                    clearTimeout(node.runningTimer);

                    if ("stop" === message_in.payload) {
                        node.stop();
                    } else if ("toggle" === message_in.payload) {
                        node.toggle();
                    } else {
                        //choose direction
                        var dir = parseInt(message_in.payload) > 0;
                        dir = node.config.inverse ? !dir : dir;
                        dir = dir ? "1" : "0";

                        node.start(dir);
                    }
                });

            } else {
                node.status({
                    fill: "red",
                    shape: "dot",
                    text: "node-red-contrib-wirenboard/motor:status.no_server"
                });
            }

        }

        start(dir) {
            var node = this;

            node.server.mqtt.publish(node.config.channel_dir + '/on', dir.toString());
            node.log('Published to mqtt topic: ' + node.config.channel_dir + '/on : ' + dir.toString());

            //enable
            node.server.mqtt.publish(node.config.channel + '/on', "1");
            node.log('Published to mqtt topic: ' + node.config.channel + '/on : 1');
            node.send({
                payload: {
                    on: true,
                    dir: dir,
                    inverse: node.config.inverse,
                    selector:WirenboardHelper.generateSelector(node.config.channel)
                },
                topic: node.config.channel
            });

            //disable
            node.runningTimer = setTimeout(function () {
                node.stop();
            }, node.config.max_running_time);
        }

        stop() {
            var node = this;

            node.server.mqtt.publish(node.config.channel + '/on', "0");
            node.log('Published to mqtt topic: ' + node.config.channel + '/on : 0');
            node.send({
                payload: {
                    on: false,
                    dir: null,
                    inverse: node.config.inverse,
                    selector:WirenboardHelper.generateSelector(node.config.channel)
                },
                topic: node.config.channel
            });

            node.nodeStatus("node-red-contrib-wirenboard/motor:status.stopped");
        }

        toggle() {
            var node = this;

            if (typeof (node.config.channel_dir) == 'string' && (node.config.channel_dir).length) {
                if (node.config.channel_dir in node.server.devices_values) {
                    var lastDir = node.server.devices_values[node.config.channel_dir];
                    var newDir = lastDir.toString()==="1"?"0":"1";
                    node.start(newDir);
                    node.nodeStatus("node-red-contrib-wirenboard/motor:status.toggle");
                }
            }
        }

        nodeStatus(text) {
            var node = this;
            node.status({fill: "green",shape: "dot",text: text});
            node.cleanTimer = setTimeout(function () {
                node.status({});
            }, 3000);
        }


    }
    RED.nodes.registerType('wirenboard-motor', WirenboardNodeMotor);
};







