import draw2d from "draw2d";
import {DummyCommand} from "./customCommands";
import {PORT_LABEL_BACKGROUND_COLOR} from "../types";

const router = new draw2d.layout.connection.InteractiveManhattanConnectionRouter();

router.abortRoutingOnFirstVertexNode = false;

const CONNECTION_COLOR = "#00A8F0";
const CONNECTION_STROKE = 2;
const HIGHLIGHT_STROKE_INCREASE = 3;

type Net = {
    ports: any[];
    connections: any[];
};

export const CustomConnection = draw2d.Connection.extend({
    NAME: "customDefinitions.CustomConnection",
    init: function (attr: any) {
        this.connectionColor = CONNECTION_COLOR;
        this.connectionStroke = CONNECTION_STROKE;
        this.highlightedNet = null;

        this._super({
            ...attr,
            router,
            outlineStroke: 1,
            radius: 2,
            connectionColor: this.connectionColor,
            connectionStroke: this.connectionStroke
        });

        this.on("select", this.onSelect.bind(this));
        this.on("unselect", this.onUnselect.bind(this));

        /* Delete is handled by draw2d's DefaultKeyboardPolicy (through the command stack, so
         * it is undoable and saved). Don't add a document listener per connection: nothing
         * removes it, so it would keep every connection - and through its ports, the whole
         * circuit - alive after a canvas rebuild.
         */
    },

    /* An electrical net is the transitive closure over ports that share a connection:
     * every edge touching a port belongs to the same net, and so does every port those
     * edges reach in turn. It deliberately does NOT hop between two ports of the same
     * node - the pins of a component are not electrically the same point.
     */
    collectNet: function (): Net {
        const ports: any[] = [];
        const connections: any[] = [this];
        const visitedPorts = new Set<any>();
        const visitedConnections = new Set<any>([this]);
        const pending: any[] = [];

        const visitPort = (port: any) => {
            if (!port || visitedPorts.has(port)) return;

            visitedPorts.add(port);
            ports.push(port);
            pending.push(port);
        };

        visitPort(this.getSource());
        visitPort(this.getTarget());

        while (pending.length) {
            const port = pending.shift();

            if (!port.getConnections) continue;

            port.getConnections().each((_i: number, connection: any) => {
                if (visitedConnections.has(connection)) return;

                visitedConnections.add(connection);
                connections.push(connection);

                visitPort(connection.getSource());
                visitPort(connection.getTarget());
            });
        }

        return {ports, connections};
    },

    setPortHighlight: function (port: any, highlighted: boolean) {
        port.getChildren().each((_i: number, child: any) => {
            child.setBackgroundColor(highlighted ? this.connectionColor : PORT_LABEL_BACKGROUND_COLOR);
            child.repaint();
        });
    },

    setConnectionHighlight: function (connection: any, highlighted: boolean) {
        const stroke = connection.connectionStroke ?? CONNECTION_STROKE;

        connection.setStroke(highlighted ? stroke + HIGHLIGHT_STROKE_INCREASE : stroke);
    },

    setNetHighlight: function (net: Net, highlighted: boolean) {
        net.ports.forEach((port: any) => this.setPortHighlight(port, highlighted));
        net.connections.forEach((connection: any) => this.setConnectionHighlight(connection, highlighted));
    },

    /* The net highlight thickens the line, and draw2d persists "stroke". Saving while a
     * net is lit would bake the highlight into the circuit, so always serialize the
     * resting width no matter what is on screen right now.
     */
    getPersistentAttributes: function () {
        const memento = this._super();

        memento.stroke = this.connectionStroke ?? CONNECTION_STROKE;

        return memento;
    },

    onSelect: function () {
        /* remember exactly what was lit up: the net can change while the edge stays
         * selected (an edge deleted, a port rewired) and the revert has to match */
        this.highlightedNet = this.collectNet();

        this.setNetHighlight(this.highlightedNet, true);
    },

    onUnselect: function () {
        const net = this.highlightedNet ?? this.collectNet();

        this.setNetHighlight(net, false);

        this.highlightedNet = null;

        // the png export unselects only for the picture and reselects right away (see toPng)
        if (this.canvas && !this.canvas.exportingImage) {
            this.canvas.getCommandStack().execute(new DummyCommand());
        }
    }
});

window.customDefinitions = Object.assign(window.customDefinitions || {}, {
    CustomConnection: CustomConnection
});
