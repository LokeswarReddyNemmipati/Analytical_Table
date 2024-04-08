sap.ui.define([
	"jquery.sap.global",
	"sap/ui/core/Control",
	"sap/ui/comp/smartfield/SmartField"
	
	], function(jQuery, Control, SmartField) {
	"use strict";
	var SmartDecimalField = SmartField.extend("zvui.work.control.SmartDecimalField", {
		metadata: {
			properties: {
				noOfDecimals: {
					type: "string",
					defaultValue: null
				}
			}
		},
		renderer: function(oRm, oControl) {
			var actualContent = oControl.getContent();
			var oContent;
			if(oControl.getValue() && oControl.getEditable() == false){
				var rawText = oControl.getInnerControls()[0].getText();
				rawText = rawText.replace(",","");
				var newText = Number(rawText).toFixed(oControl.getNoOfDecimals());
				newText = newText.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
//				oControl.getInnerControls()[0].setText(newText + " ");
//				oControl.getInnerControls()[0].addStyleClass("customSmartFieldPaddingRight");
				if(actualContent instanceof sap.m.HBox){
					oContent = new sap.m.HBox();
					oContent.addItem(new sap.m.Text({
						text: newText
					}).addStyleClass("customSmartFieldPaddingRight"));
					for(var i=1; i<actualContent.getItems().length;i++){
						oContent.addItem(actualContent.getItems()[i]);
					}
				}
			}else{
				oContent = oControl.getContent();
			}
			oRm.write("<div ");
			oRm.writeControlData(oControl);
			oRm.addClass("sapUiCompSmartField");
			oRm.writeClasses();
			oRm.write(">");
			oRm.renderControl(oContent);
			if (oControl.getAggregation("_ariaLabelInvisibleText")) {
				oControl.getAggregation("_ariaLabelInvisibleText").forEach(function(oInvisibleText) {
					oRm.renderControl(oInvisibleText);
				});
			}
			oRm.write("</div>");
		}
	});
	return SmartDecimalField;
});