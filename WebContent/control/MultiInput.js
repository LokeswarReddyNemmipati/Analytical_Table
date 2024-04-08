sap.ui.define([
	"jquery.sap.global",
	"sap/ui/core/Control",
	"sap/m/MultiComboBox"
	], function(jQuery, Control, MultiComboBox) {
	"use strict";
	var C = Control.extend("zvui.work.control.MultiInput", {
		metadata: {
			properties: {
				value: {
					type: "string",
					defaultValue: null
				},
				itemsValue: {
					type: "string",
					defaultValue: null
				},
				editable: {
					type: "boolean",
					defaultValue: false
				},
				editingStatus: {
					type: "string",
					defaultValue: null
				},
				contextEditable: {
					type: "boolean",
					defaultValue: false
				}
			}
		},
		renderer: function(ioRm, ioControl) {					
//			sap.ui.core.Control.render(ioRm, ioControl);
			var oControl;			
			var value = ioControl.getValue();
			var itemsValue = ioControl.getItemsValue();
			if(value.indexOf('"items"') !== -1){
				itemsValue = value;
			}
			
//			if(ioControl.getEditable() && ioControl.getContextEditable() && ioControl.getEditingStatus() == "1"  && itemsValue.indexOf('"items"') !== -1){
//				oControl = new MultiComboBox({
//					selectionChange: ioControl.onSelectionChange.bind(ioControl),	
//					items: JSON.parse(itemsValue).items,
//					selectedKeys: JSON.parse(itemsValue).selected
//					
//				});
//			}else{	
				if(value){
					var prepareTokens = false;
					if(itemsValue.indexOf('"items"') !== -1){
						var items = JSON.parse(itemsValue).items;
						value = JSON.parse(itemsValue).selected;
						for(var i=0; i<value.length;i++){
							var item = items.find(function(item){ return item.key == value[i]});
							if(item){
								value[i] = item.text;
							}
						}
						prepareTokens = true;
					}else if(value.indexOf('"selected"') == -1){
						value = value.split(",");
						prepareTokens = true;
					}					
				}
				if(value.length <= 1){
					if(value.length == 1){
						oControl = new sap.m.Text({ text: value[0], wrapping: false,tooltip: value[0]});
					}else{
						oControl = new sap.m.Text({ text: "", wrapping: false});
					}
				}else{
					if(value != ioControl.data("value") && !ioControl.data("rendered")){
						oControl = new sap.m.MultiInput({
							showValueHelp: false,
							editable: false
						});						
						if(prepareTokens){
							for(var i=0; i<value.length; i++){
								oControl.addToken(new sap.m.Token({
									text: value[i],
									key: value[i],
									editable: false
								}));
							}			
						}
						ioControl.data("rendered",true);
						ioControl.data("value",value);
						ioControl.data("control",oControl);
						oControl.getAggregation("tokenizer").onclick = function(oEvent){
						    var bFireIndicatorHandler;

								if (!this.getEnabled()) {
									return;
								}

								bFireIndicatorHandler = !this.hasStyleClass("sapMTokenizerIndicatorDisabled") &&
									(oEvent.target === this.getFocusDomRef()
										|| oEvent.target.classList.contains("sapMTokenizerIndicator"));

								if (bFireIndicatorHandler) {
									this._handleNMoreIndicatorPress();
									oEvent.stopPropagation();
								}
						}
						setTimeout(function(){
							oControl.rerender();
						});
					}else{
						oControl =  ioControl.data("control");
						setTimeout(function(){
							oControl.rerender();
						});
					}
					
				}
//			}
			ioRm.write("<div ");
			ioRm.writeControlData(ioControl);
			ioRm.write('>');
			ioRm.renderControl(oControl);
			ioRm.write('</div>');
		}
	});
	
	C.prototype.onSelectionChange = function(oEvent){
//		var sel = oEvent.oSource.getSelectedKeys();
//		var string = '"selected":';
//		var value = this.getValue().split(string)[0] + string + JSON.stringify(sel) + '}"';
		var value = oEvent.getParameter("changedItem").getKey();
		if(oEvent.getParameter("selected")){
			value = value + "_add";
		}else{
			value = value + "_remove";
		}
		
		this.setProperty("value", value, true);
	}
	
	return C;
});