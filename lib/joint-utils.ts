import { dia, shapes, g, linkAnchors, linkTools } from "jointjs";

// Функция для вычисления якоря на вершине
const vertexAnchor = function (view, magnet, ref, opt) {
    const vertices = view.model.vertices();
    console.log('!!!', view, magnet, ref, opt);
    const { index = 0 } = opt;
    if (vertices.length > index) {
        return new g.Point(vertices[index]);
    }
    return view.sourcePoint;
};

// Создание инструментов для работы с линками
export const getLinkToolsView = () => {
    const verticesTool = new linkTools.Vertices({
        redundancyRemoval: false,
        snapRadius: 10,
        vertexAdding: false,
    });

    const sourceArrowheadTool = new linkTools.SourceArrowhead();
    const targetArrowheadTool = new linkTools.TargetArrowhead();
    const sourceAnchorTool = new linkTools.SourceAnchor();
    const targetAnchorTool = new linkTools.TargetAnchor();
    const removeButton = new linkTools.Remove();

    return new dia.ToolsView({
        tools: [
            verticesTool,
            sourceArrowheadTool,
            targetArrowheadTool,
            sourceAnchorTool,
            targetAnchorTool,
            removeButton,
        ],
    });
};

// Создание Paper для отображения графа
export const createPaper = (graph: dia.Graph): dia.Paper => {
    const paper = new dia.Paper({
        cellViewNamespace: {
            devs: shapes.devs,
            standard: shapes.standard,
            shapes: shapes,
        },

        width: "100%",
        height: "100%",

        model: graph,
        async: true,

        gridSize: 5,
        sorting: dia.Paper.sorting.APPROX,

        background: { color: "transparent" },

        // Функция стратегии соединения, которая учитывает существующие вершины
        connectionStrategy: function (end, view, magnet, coords) {
            if (view.model.isElement()) return end;
            const vertices = view.model.vertices();
            if (vertices.length === 0) return end;
            const vertex = coords.chooseClosest(vertices);
            const index = vertices.findIndex((v) => vertex.equals(v));
            end.anchor = {
                name: "vertexAnchor",
                args: { index },
            };
            return end;
        },

        linkAnchorNamespace: {
            ...linkAnchors,
            vertexAnchor,
        },

        validateConnection: (srcView, _, tgtView) => {
            // Добавляем проверку на существование srcView и tgtView
            if (!srcView || !tgtView) {
                return false;
            }

            const src = srcView.model;
            const tgt = tgtView.model;
            if (src === tgt) {
                return false;
            }
            return true;
        },

        // Настройка внешнего вида соединений (линков)
        defaultLink: new shapes.devs.Link({
            attrs: {
                ".connection": {
                    "stroke-width": 2,
                },
                ".marker-target": {
                    display: "none",
                },
                ".marker-source": {
                    display: "none",
                },
                ".marker-arrowheads": {
                    display: "none",
                },
                ".link-tools": {
                    display: "none",
                },
                ".marker-vertices": {
                    display: "none",
                },
                '.target-arrowhead': {
                    display: 'none',
                },
            },
        }),
    });

    return paper;
};

// Создание графа
export const createGraph = (): dia.Graph => {
    return new dia.Graph(
        {},
        {
            cellNamespace: {
                devs: shapes.devs,
                standard: shapes.standard,
                shapes: shapes,
            },
        }
    );
};

// Функция для создания элемента порта
export const createPortElement = (x: number, y: number, paper: dia.Paper) => {
    const cell = new shapes.devs.Model({
        type: "devs.Model",
        position: { x, y },
        attrs: {
            ".label": {
                text: "Объект",
                "font-size": 14,
                "font-weight": "bold",
                fill: "#333333",
            },
            ".body": {
                display: "none",
            },
        },
        size: { width: 50, height: 20 }, // Увеличен размер элемента для лучшей видимости
        portMarkup: '<g class="port"><circle class="port-body" r="10" fill="#000000" /></g>', // Цвет портов
        inPorts: [""],
    });

    paper.model.addCell(cell);
};
