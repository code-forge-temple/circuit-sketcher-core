import draw2d from "draw2d";
import {DummyCommand} from "./customCommands";

const router = new draw2d.layout.connection.InteractiveManhattanConnectionRouter();

router.abortRoutingOnFirstVertexNode = false;

export const CustomConnection = draw2d.Connection.extend({
    NAME: "customDefinitions.CustomConnection",
    init: function (attr: any) {
        this.connectionColor = "#00A8F0";
        this.connectionStroke = 2;

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

        document.addEventListener("keydown", this.onKeyDown.bind(this));
    },
    highlightLabel: function (port: any) {
        port.getChildren().each((_i: number, child: any) => {
            child.setBackgroundColor(this.connectionColor);
            child.repaint();
        });

        this.setStroke(this.connectionStroke + 3);
    },

    revertLabel: function (port: any) {
        port.getChildren().each((_i: number, child: any) => {
            child.setBackgroundColor("#FFFFFF");
            child.repaint();
        });

        this.setStroke(this.connectionStroke);
    },

    onSelect: function () {
        const sourcePort = this.getSource();
        const targetPort = this.getTarget();

        if (sourcePort) this.highlightLabel(sourcePort);
        if (targetPort) this.highlightLabel(targetPort);
    },

    onUnselect: function () {
        const sourcePort = this.getSource();
        const targetPort = this.getTarget();

        if (sourcePort) this.revertLabel(sourcePort);
        if (targetPort) this.revertLabel(targetPort);
    },

    onKeyDown: function (event: KeyboardEvent) {
        if (event.key === "Delete") {
            if (this.isSelected()) {
                this.getCanvas().remove(this);
            }
        }
    }
});

window.customDefinitions = Object.assign(window.customDefinitions || {}, {
    CustomConnection: CustomConnection
});