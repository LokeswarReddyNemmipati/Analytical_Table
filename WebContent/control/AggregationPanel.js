sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/Control",
    "sap/m/P13nPanel"
], function (jQuery, Control, P13nPanel) {
    "use strict";
    var C = P13nPanel.extend("zvui.work.control.AggregationPanel", {
        metadata: {
            properties: {
                panelItems: {
                    type: 'object'
                },
                gridControl: {
                    type: 'sap.ui.core.Control'
                }
            },
            aggregations: {
                content: {
                    type: 'sap.m.Table',
                    multiple: false
                }
            },
            events: {
                onSelectionChange: {}
            }

        },
        renderer: function (ioRm, ioControl) {
            ioRm.write('<div');
            ioRm.writeControlData(ioControl);
            ioRm.write('>');
            ioRm.renderControl(ioControl.getContent());
            ioRm.write('</div>');
        }
    });

    C.prototype.getItems = function () {
        return this.getModel('aggregationPanelModel') ?
            this.getModel('aggregationPanelModel').getProperty('/DATA') : [];
    };
    C.prototype.getPanelContent = function () {
        var oControl = this, data = {};
        oControl.setType('aggregation');
        oControl.setTitle('Aggregation');
        var model;
        if (!oControl.getModel('aggregationPanelModel')) {
            model = new sap.ui.model.json.JSONModel(true);
            data = oControl.prepareModelData();
            model.setData(data);
            oControl.setModel(model, 'aggregationPanelModel');
        } else {
            model = oControl.getModel('aggregationPanelModel');
            oControl.setModel(model, 'aggregationPanelModel');
            data = model.getData();
        }

        var oTable = new sap.m.Table();

        oTable.bindAggregation('columns', {
            path: 'aggregationPanelModel>/FIELDS/',
            factory: function (sId, oContext) {
                var contextObject = oContext.getObject();

                var oText = new sap.m.Text({
                    text: contextObject['LABEL']
                });

                return new sap.m.Column({
                    header: oText,
                    width: 'auto',
                    hAlign: sap.ui.core.TextAlign.Center
                });
            }
        });

        oTable.bindAggregation('items', {
            path: 'aggregationPanelModel>/DATA/',
            factory: function (sid, oContext) {
                var contextObject = oContext.getObject();
                var bindingMode = sap.ui.model.BindingMode.TwoWay;
                var cells = [], selection;
                data['FIELDS'].forEach(function (field) {
                    if (field['FLDNAME'] === 'COLUMNKEY') {
                        var label = contextObject['COLUMNKEY'];

                        selection = new sap.m.Text({
                            text: label,
                            textAlign: sap.ui.core.TextAlign.Center
                        });
                    } else {
                        selection = new sap.m.ComboBox({
                            editable: true
                        });

                        var oTemplate = new sap.ui.core.Item({
                            key: '{aggregationPanelModel>NAME}',
                            text: '{aggregationPanelModel>VALUE}'
                        });

                        selection.bindItems('aggregationPanelModel>/AGRTYP/', oTemplate);

                        selection.bindProperty('selectedKey', `aggregationPanelModel>${field['FLDNAME']}`,
                            null, bindingMode);
                    }
                    cells.push(selection);
                });

                return new sap.m.ColumnListItem({
                    vAlign: sap.ui.core.VerticalAlign.Middle,
                    cells: cells
                });
            }
        });
        oTable.setModel(model, 'aggregationPanelModel');
        oControl.setContent(oTable);
    };
    C.prototype.prepareModelData = function () {
        var oControl = this, panelData, columns = [], columnObject;
        var items = [];
        items.push({
            COLUMNKEY: "Account Number",
            SBAGT: "",
            AGGAT: "",
            index: 1
        });
        items.push({
            COLUMNKEY: "Units",
            SBAGT: "",
            AGGAT: "",
            index: 2
        });
        items.push({
            COLUMNKEY: "Unit Price",
            SBAGT: "",
            AGGAT: "",
            index: 3
        });
        items.push({
            COLUMNKEY: "Amount",
            SBAGT: "",
            AGGAT: "",
            index: 4
        });
        panelData = oControl.getItems();
        if (panelData.length === 0) {
            for (var i = 0; i < items.length; i++) {
                panelData.push({
                    'COLUMNKEY': items[i]['COLUMNKEY'],
                    'AGGAT': items[i]['SBAGT'] ? items[i]['SBAGT'] : '',
                    'SBAGT': items[i]['AGGAT'] ? items[i]['AGGAT'] : '',
                    'INDEX': items[i]['index'],
                    'TYPE': items[i]['type']
                });
            }
        }
        columnObject = {};
        columnObject['FLDNAME'] = 'COLUMNKEY';
        columnObject['LABEL'] = 'Column';
        columns.push(columnObject);

        columnObject = {};
        columnObject['FLDNAME'] = 'SBAGT';
        columnObject['LABEL'] = 'Sub Aggregation';
        columns.push(columnObject);

        columnObject = {};
        columnObject['FLDNAME'] = 'AGGAT';
        columnObject['LABEL'] = 'Aggregation';
        columns.push(columnObject);

        var agrtyp = [
            {
                'NAME': 'Sum',
                'VALUE': 'Sum'
            },
            {
                'NAME': 'Min',
                'VALUE': 'Minimum'
            },
            {
                'NAME': 'Max',
                'VALUE': 'Maximum'
            },
            {
                'NAME': 'Avg',
                'VALUE': 'Average'
            }
        ];

        return {
            'FIELDS': columns,
            'DATA': panelData,
            'AGRTYP': agrtyp
        };

    };

    return C;
});