sap.ui.define([
	"zvui/work/controller/BaseController",
	"sap/ui/core/XMLTemplateProcessor",
	"sap/ui/core/util/XMLPreprocessor",
	"sap/m/MessageBox",
	"sap/ui/core/Component",
	"sap/ui/comp/smartmicrochart/SmartColumnMicroChart",
	"sap/ui/comp/smartmicrochart/SmartLineMicroChart",
	"sap/ui/comp/smartmicrochart/SmartComparisonMicroChart"
	], function(Controller, XMLTemplateProcessor, XMLPreprocessor, MessageBox, Component,SmartColumnMicroChart,SmartLineMicroChart,SmartComparisonMicroChart) {
	"use strict";

	return Controller.extend("zvui.work.controller.Worklist", {
		onInit : function() {
			var oController = this;
			window.onbeforeunload = function(e){
				var msg;
//				msg = "Changes will be lost";
				msg = false;
				return msg;
			}
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.getRoute("Worklist").attachPatternMatched(this._onObjectMatched, this);
		},
		
		onExit: function() {
			wrkspglobal.session.counterPause = true;
		},

		_onObjectMatched: function (oEvent) {
			var oController = this;
			if(window.detailPagePath){
				oController.getOwnerComponent().getRouter().navTo("Detail",{path:window.detailPagePath},false);
			}else{		
				sap.ui.core.BusyIndicator.show(0);
				var uiModel = oController.getOwnerComponent().getModel("ui");
				uiModel.setProperty("/editable",false);
				var oModel = oController.getOwnerComponent().getModel("workspaceModel");
				var viewModel = oController.getView().getModel("viewModel");
				viewModel.setProperty("/saveOnDetailPerformed",false);
				viewModel.setProperty("/saveOnDetailDetailPerformed",false);
	
				oController.getView().setModel(oModel);
				oController.getView().bindElement("/WorkspaceType(row_id='',wstyp='" + window.workspaceType + "')");
				viewModel.setProperty("/WSTYP",window.workspaceType);
				sap.ui.core.BusyIndicator.hide();
			}
		},
		
//		onModelContextChange: function(oEvent){
//			var oController = this;
//			var oSource = oEvent.getSource();
//
//			var oVBox = oSource.getContent()[0];
//			var oTile = oVBox.getItems()[0];
//			var oCarousel = oTile.getTileContent()[0].getContent().getItems()[0];
//			oCarousel.removeAllPages();
//			var oModel = oController.getOwnerComponent().getModel("workspaceModel");	
//			var oMetaModel = oModel.getMetaModel();
//
//			var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet("WorkspaceView").entityType);
//
//			var aFacets = oEntityType["com.sap.vocabularies.UI.v1.Facets"];
//
//			var object = oSource.getBindingContext().getObject();
//			var lytid = object.lytid;
//			var contextPath = oSource.getBindingContext().getPath().substring(1);
//			var aVBox = [];
//			_.each(aFacets,function(oFacet){
//				if(oFacet.RecordType == "com.sap.vocabularies.UI.v1.ReferenceFacet"){
//					var oControl = oController.createCardControl(oFacet,oEntityType,lytid);
//					if(oControl){
//						var oFlexBox = new sap.m.FlexBox();
//						oFlexBox.addItem(oControl);
//						aVBox.push(oFlexBox);
//					}
//				}else if(oFacet.RecordType == "com.sap.vocabularies.UI.v1.CollectionFacet"){
//					var aControls = [];
//					_.each(oFacet.Facets,function(oSecondLevelFacet) {
//						var oControl = oController.createCardControl(oSecondLevelFacet,oEntityType,lytid);
//						if(oControl){
//							aControls.push(oControl);
//						}
//					});
//					if(aControls.length > 0) {
//						var oFlexBox = new sap.m.FlexBox();
//						_.each(aControls,function(oControl){
//							oFlexBox.addItem(oControl);
//						})
//						aVBox.push(oFlexBox);
//					}
//				}
//			});
//			
//			_.each(aVBox,function(oFlexBox){
//				oCarousel.addPage(oFlexBox);
//			});
//		},
		
		onModelContextChange: function(oEvent){
			var oController = this;
			var oSource = oEvent.getSource();
			var oToolBar = oSource.getContent()[0];
			var oVBox = oSource.getContent()[1];
			var contentBox = oVBox.getItems()[0];
			contentBox.removeAllItems();
			var oModel = oController.getOwnerComponent().getModel("workspaceModel");	
			var oMetaModel = oModel.getMetaModel();

			var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet("WorkspaceView").entityType);

			var aFacets = oEntityType["com.sap.vocabularies.UI.v1.Facets"];

			var object = oSource.getBindingContext().getObject();
			var lytid = object.lytid;
			
			var contextPath = oSource.getBindingContext().getPath().substring(1);
			var aVBox = [];
			var row_id = oModel.getProperty(oEvent.getSource().getBindingContextPath()).row_id;
						
			if(oEntityType[lytid]){
				var cardPages = oEntityType[lytid];
				for(var i=0; i<cardPages.length;i++){
					if(cardPages[i].CardEntity.length > 1){

						var newToolBarButton = new sap.m.Button({
							text: cardPages[i].Description.String,
							press: [oController.onWorkspaceCardChange,oController],
							layoutData: new sap.m.OverflowToolbarLayoutData({priority:"AlwaysOverflow"})
						});
						newToolBarButton.data("cardPages",cardPages[i]);
						newToolBarButton.data("oEntityType",oEntityType);
						newToolBarButton.data("lytid",lytid);
						newToolBarButton.data("contextPath",contextPath);
						newToolBarButton.data("index",i);

						if(i == 0){
							newToolBarButton.setEnabled(false);
							var oVBox = new sap.m.VBox({
								alignItems: "Center",
								justifyContent: "Center",
								width: "100%"
							});
							for(var j=0; j<cardPages[i].CardEntity.length; j++){
								var oFacet = aFacets.find(function(aFacet){ 
								    var target = aFacet.TabControl.String.toUpperCase();
								    return target.indexOf(cardPages[i].CardEntity[j].String) !== -1}
								);

								if(oFacet){
									var cardView = oController.getCardView(oFacet, lytid, oEntityType, contextPath);
								}
								if(cardView){
									oVBox.addItem(cardView);
								}
							}
							if(oVBox.getItems().length > 0){
								contentBox.addItem(oVBox);
							}
						}else{

						}
						if(!oToolBar.data("buttonsAdded")){
							oToolBar.addContent(newToolBarButton);
						}
					}else if(cardPages[i].CardEntity.length == 1){
						var newToolBarButton = new sap.m.Button({
							text: cardPages[i].Description.String,
							press: [oController.onWorkspaceCardChange,oController],
							layoutData: new sap.m.OverflowToolbarLayoutData({priority:"AlwaysOverflow"})
						});
						newToolBarButton.data("cardPages",cardPages[i]);
						newToolBarButton.data("oEntityType",oEntityType);
						newToolBarButton.data("lytid",lytid);
						newToolBarButton.data("contextPath",contextPath);
						newToolBarButton.data("index",i);

						if(i == 0){
							newToolBarButton.setEnabled(false);
							var oFacet = aFacets.find(function(aFacet){ 
							    var target = aFacet.TabControl.String.toUpperCase();
							    return target.indexOf(cardPages[i].CardEntity[0].String) !== -1}
							);
							if(oFacet){
								var cardView = oController.getCardView(oFacet, lytid, oEntityType, contextPath);
							}
							if(cardView){
								contentBox.addItem(cardView);
							}
						}else{

						}
						if(!oToolBar.data("buttonsAdded")){
							oToolBar.addContent(newToolBarButton);
						}
					}
				}
			}
			if(!oToolBar.data("buttonsAdded")){
				oToolBar.addContent( new sap.m.ToolbarSeparator({
					layoutData: new sap.m.OverflowToolbarLayoutData({priority:"AlwaysOverflow"})
				}));
				oToolBar.addContent( new sap.m.Button({
					icon:"sap-icon://edit", type:"Transparent", press:[oController.onWorkspaceEdit,oController],
					tooltip:"{i18n>EDIT}", text:"{i18n>EDIT}",
					layoutData: new sap.m.OverflowToolbarLayoutData({priority:"AlwaysOverflow"})
				}));
				oToolBar.addContent( new sap.m.Button({
					icon:"sap-icon://delete", type:"Transparent", press:[oController.onWorkspaceDelete,oController],
						tooltip:"{i18n>DELETE}", text:"{i18n>DELETE}",
					layoutData: new sap.m.OverflowToolbarLayoutData({priority:"AlwaysOverflow"})
				}));
			}
//			else{
//				for(var i=0; i<aVBox.length;i++){
//					contentBox.addItem(aVBox[i]);
//				}
//				var chartType, facetType = oFlexBox.data("facetType");
//				if(facetType == "@com.sap.vocabularies.UI.v1.Chart"){
//					chartType = "CHART";
//				}else if(facetType == "@com.sap.vocabularies.UI.v1.KPIType"){
//					chartType = "KPI";
//				}else{
//					chartType = "COLLECTION";
//				}
//				oFlexBox.data("ChartType",chartType);
//				if(i == 0){
//					var presentItem = _.find(oToolBar.getContent(),function(item){
//						return item.data().ChartType == chartType});
//					if(presentItem){
//						presentItem.setVisible(false);
//					}
//				}else{
//					var hiddenItem = _.find(oToolBar.getContent(),function(item){
//						return item.data().ChartType == chartType});
//					if(hiddenItem){
//						hiddenItem.setVisible(true);
//					}
//					oFlexBox.setVisible(false);
//					
//				}
//			}
			oToolBar.data("buttonsAdded",true);
		},
		
		getCardView: function(oFacet, lytid, oEntityType, contextPath){
			var oController = this;
			var oModel = oController.getOwnerComponent().getModel("workspaceModel");	
			var oMetaModel = oModel.getMetaModel();
			if(oFacet.RecordType == "com.sap.vocabularies.UI.v1.ReferenceFacet"){
				var annotationPath = oFacet.Target.AnnotationPath;
				var aArray = annotationPath.split('/');
				var navigationProperty = aArray[0],facetType,oTargetEntityType,sTargetEntitySet;
				if(navigationProperty.startsWith("to_" + lytid)){
					facetType = aArray[1];
					oTargetEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataAssociationEnd(oEntityType, navigationProperty).type);
					sTargetEntitySet = oMetaModel.getODataAssociationSetEnd(oEntityType, navigationProperty).entitySet;
				}
				var oControl, oFlexBox = new sap.m.FlexBox({direction:"Column", justifyContent: "Center", alignItems: "Center"});
				if(oTargetEntityType){
					oControl = oController.createCardControl(facetType,oTargetEntityType,sTargetEntitySet,navigationProperty,contextPath);
					if(oControl){
						oFlexBox.addItem(oControl);
						if(oTargetEntityType["vui.bodc.ChartDescription"] && oTargetEntityType["vui.bodc.ChartDescription"]["Description"]){
						oFlexBox.addItem(new sap.m.Label({
							text:oTargetEntityType["vui.bodc.ChartDescription"]["Description"]["String"],
							tooltip:oTargetEntityType["vui.bodc.ChartDescription"]["Description"]["String"],
							textAlign:"Center",
							width:"100%",
							wrapping:true,
							vAlign:"Middle"}));//.addStyleClass("sapUiSmallMarginTop")
						}
						oFlexBox.data("targetID",navigationProperty);
						oFlexBox.data("facetType",facetType);
					}else{
						oControl = null;
					}
				}
				return oFlexBox
			}else if(oFacet.RecordType == "com.sap.vocabularies.UI.v1.CollectionFacet"){
				var aControls = [];
				_.each(oFacet.Facets,function(oSecondLevelFacet) {
					var annotationPath = oSecondLevelFacet.Target.AnnotationPath;
					var aArray = annotationPath.split('/');
					var navigationProperty = aArray[0],facetType,oTargetEntityType,sTargetEntitySet;
					if(navigationProperty.startsWith("to_" + lytid)){
						facetType = aArray[1];
						oTargetEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataAssociationEnd(oEntityType, navigationProperty).type);
						sTargetEntitySet = oMetaModel.getODataAssociationSetEnd(oEntityType, navigationProperty).entitySet;
					}
					var oControl;
					if(oTargetEntityType){
						oControl= oController.createCardControl(facetType,oTargetEntityType,sTargetEntitySet,navigationProperty,contextPath);
						if(oControl){
							aControls.push(oControl);
							if(oTargetEntityType["vui.bodc.ChartDescription"] && oTargetEntityType["vui.bodc.ChartDescription"]["Description"]){
								aControls.push(new sap.m.Label({
									text:oTargetEntityType["vui.bodc.ChartDescription"]["Description"]["String"],
									tooltip:oTargetEntityType["vui.bodc.ChartDescription"]["Description"]["String"],
									textAlign:"Center",
									width:"85%",
									wrapping:true,
									vAlign:"Middle"}));//.addStyleClass("sapUiSmallMarginTop")
							}
						}
					}else{
						oControl = null;
					}
				});
				var oFlexBox = new sap.m.FlexBox({justifyContent: "Center", width: "100%"});
				if(aControls.length > 0) {
					_.each(aControls,function(oControl){
						oFlexBox.addItem(oControl);
					});
					oFlexBox.data("targetID",oFacet.ID.String);
					oFlexBox.data("facetType","COLLECTION");
				}
				return oFlexBox;
			}
		},
		
		createCardControl : function(facetType,oTargetEntityType,sTargetEntitySet,navigationProperty,contextPath) {
			var oController = this;
			var oModel = oController.getOwnerComponent().getModel("workspaceModel");	
			var oMetaModel = oModel.getMetaModel();
			
			if(oTargetEntityType){
				if(facetType == "@com.sap.vocabularies.UI.v1.Chart"){
					var chart = oTargetEntityType["com.sap.vocabularies.UI.v1.Chart"];
					if(chart){
						var chartType = chart.ChartType.EnumMember;
						switch(chartType){
						case "com.sap.vocabularies.UI.v1.ChartType/Line":
							var oSmartChart = new SmartLineMicroChart({
								entitySet: sTargetEntitySet,
								chartBindingPath : navigationProperty
							});
							break;
						case "com.sap.vocabularies.UI.v1.ChartType/Donut":
							break;
						case "com.sap.vocabularies.UI.v1.ChartType/Column":
							var oSmartChart = new SmartColumnMicroChart({
								entitySet: sTargetEntitySet,
								chartBindingPath : navigationProperty
							});
							break;
						case "com.sap.vocabularies.UI.v1.ChartType/Comparison":
							var oSmartChart = new SmartComparisonMicroChart({
								entitySet: sTargetEntitySet,
								chartBindingPath : navigationProperty
							});
							break;
						}
						return oSmartChart;
					}
				}else if(facetType == "@com.sap.vocabularies.UI.v1.KPIType"){
					var kpiBox = new sap.m.VBox({
						alignItems: "Center",
						justifyContent: "Center",
						width: "auto",
						renderType: "Bare"
					});//.addStyleClass("KPIPadding")
					var KPIType = oTargetEntityType["com.sap.vocabularies.UI.v1.KPIType"];
					if(KPIType){
						var oDataPointPath = KPIType.DataPoint.AnnotationPath;
						oDataPointPath = oDataPointPath.substring(1);
						var annotation = oTargetEntityType[oDataPointPath];

						if(annotation.Description){
							kpiBox.addItem(new sap.m.Title({
								text : "{" + annotation.Description.Path  + "}"
							}).addStyleClass("KPIFont"));
						}
						var field = annotation.Value.Path;
						var property = _.find(oTargetEntityType.property,{name: field});
						var propertyScale =  _.find(oTargetEntityType.property,{name: "scale"});
						if(propertyScale) {
							var objectNumber = new sap.m.NumericContent({
								scale: "{scale}",
								value: "{" + property.name + "}",
								indicator: {path:'indicator',formatter:function(indicator){
									if(indicator == '1'){
										return "Up";
									}else if(indicator == '2'){
										return "Down";
									}else{
										return "None";
									}
								}},
								withMargin: false
							});//.addStyleClass("KPIFont KPIObjPosition");

						}else if(property["sap:unit"]) {
							var objectNumber = new sap.m.ObjectNumber({
								textAlign: "Center",
								number: "{" + property.name + "}",
								numberUnit : "{" + property["sap:unit"] + "}",
							});//.addStyleClass("KPIFont KPIObjPosition");						
						}else {
							var objectNumber = new sap.m.ObjectNumber({
								textAlign: "Center",
								number: "{" + property.name + "}",
							});//.addStyleClass("KPIFont KPIObjPosition");	
						}
						if(annotation.Criticality && !propertyScale){
							objectNumber.bindProperty("state",annotation.Criticality.Path,function(sValue) {
								switch(sValue){
								case "0":
									return sap.ui.core.ValueState.None;
								case "1":
									return sap.ui.core.ValueState.Error;
								case "2":
									return sap.ui.core.ValueState.Warning;
								case "3":
									return sap.ui.core.ValueState.Success;
								}
								return sap.ui.core.ValueState.Information;
							});
						}else if(annotation.Criticality){
							objectNumber.bindProperty("valueColor",annotation.Criticality.Path,function(sValue) {
								switch(sValue){
								case "0":
									return sap.m.ValueColor.Neutral;
								case "1":
									return sap.m.ValueColor.Error;
								case "2":
									return sap.m.ValueColor.Critical;
								case "3":
									return sap.m.ValueColor.Good;
								}
								return sap.m.ValueColor.Good;
							});
						}
						kpiBox.addItem(objectNumber);
						if(propertyScale) {
							kpiBox.addItem(new sap.m.Text({
								text: "{" + property["sap:unit"] + "}"
							}));	
						}
						kpiBox.bindElement("/" + contextPath + "/" + navigationProperty);
					}
					return kpiBox;
				}else if(facetType == "@com.sap.vocabularies.UI.v1.Identification"){

					var formBox = new sap.m.VBox({
						renderType: "Bare",
						alignItems: "Center",
						justifyContent: "Center",
						width: "100%",
					}).addStyleClass("vistexCardFormControl");
					
					
					_.each(oTargetEntityType["com.sap.vocabularies.UI.v1.Identification"],function(object){
						var hbox = new sap.m.HBox({
							renderType: "Bare",
							alignItems: "Center",
							width: "100%",
							justifyContent: "SpaceBetween"
						});//.addStyleClass("sapUiTinyMarginBottom");
						var key = object.Value.Path;
						
						var property = _.find(oTargetEntityType.property,{name: key});
						var label = property["com.sap.vocabularies.Common.v1.Label"] ? property["com.sap.vocabularies.Common.v1.Label"].String : property["sap:label"];
						hbox.addItem(new sap.m.Label({
							text : label + ":",
						}));//.addStyleClass("sapUiTinyMarginEnd setCardLabelFontSize")
						var objectNumber;
						if(property["sap:unit"]){
							objectNumber = new sap.m.ObjectNumber({
								emphasized: true,
								textAlign: "Center",
								number: "{" + property.name + "}",
								numberUnit : "{" + property["sap:unit"] + "}",
							});//.addStyleClass("setCardValueFontSize setCardObjectNumberRightMargin")
						}else{
							objectNumber = new sap.m.ObjectNumber({
								emphasized: true,
								textAlign: "Center",
								number: "{" + property.name + "}",
							});//.addStyleClass("setCardValueFontSize setCardObjectNumberRightMargin")
						}
						if(object.Criticality){
							objectNumber.bindProperty("state",object.Criticality.Path,function(sValue) {
								if(sValue){
									sValue = sValue.toString();
								}
								switch(sValue){
								case "0":
									return sap.ui.core.ValueState.None;
								case "1":
									return sap.ui.core.ValueState.Error;
								case "2":
									return sap.ui.core.ValueState.Warning;
								case "3":
									return sap.ui.core.ValueState.Success;
								case "4":
									return sap.ui.core.ValueState.Information;
								}
								return sap.ui.core.ValueState.None;
							});
						}
						hbox.addItem(objectNumber);
						
						formBox.addItem(hbox);
					});
					formBox.bindElement("/" + contextPath + "/" + navigationProperty);
				
					return formBox;
				}
				return null;
			}
			return null;
		},
		
		onWorkspaceCardChange: function(oEvent){
			var oController = this;
			var oModel = oController.getView().getModel("workspaceModel");
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var source = oEvent.getSource();
			var chartData = source.data();
			var oToolbar = source.getParent();
			var oToolbarContent = oToolbar.getContent();
			var cardContentBox = oToolbar.getParent().getContent()[1].getItems()[0];
			cardContentBox.removeAllItems();
			var cardPages = chartData.cardPages;
			var aFacets = chartData.oEntityType["com.sap.vocabularies.UI.v1.Facets"];
			if(cardPages){
				_.each(oToolbarContent,function(content){
					if(content.setEnabled){
						content.setEnabled(true);
					}
				});
				if(cardPages.CardEntity.length > 1){
					var oVBox = new sap.m.VBox({
						alignItems: "Center",
						justifyContent: "Center",
						width: "100%"
					});
					for(var j=0; j<cardPages.CardEntity.length; j++){
						var oFacet = aFacets.find(function(aFacet){ 
						    var target = aFacet.TabControl.String.toUpperCase();
						    return target.indexOf(cardPages.CardEntity[j].String) !== -1}
						);

						if(oFacet){
							var cardView = oController.getCardView(oFacet, chartData.lytid, chartData.oEntityType, chartData.contextPath);
						}
						if(cardView){
							oVBox.addItem(cardView);
						}
					}
					if(oVBox.getItems().length > 0){
						cardContentBox.addItem(oVBox);
					}
				}else if(cardPages.CardEntity.length == 1){
					var oFacet = aFacets.find(function(aFacet){ 
					    var target = aFacet.TabControl.String.toUpperCase();
					    return target.indexOf(cardPages.CardEntity[0].String) !== -1}
					);
					if(oFacet){
						var cardView = oController.getCardView(oFacet, chartData.lytid, chartData.oEntityType, chartData.contextPath);
					}
					if(cardView){
						cardContentBox.addItem(cardView);
					}
				}
				source.setEnabled(false);
			}
			
		},

		onItemPress: function(oEvent){
			var oController = this;
			oController.removeTransientMessages();
			var oModel = oController.getView().getModel("workspaceModel");

			var oSelectedpath = oEvent.getSource().getBindingContext().getPath();
			var viewModel = oController.getView().getModel("viewModel");
			var context = oModel.getProperty(oSelectedpath);
			var oData = context.odata;
			var sPath = oSelectedpath.substr(1,oSelectedpath.length);
		    window.workspaceView = context.wspvw;
		    window.layoutId = context.lytid;
			viewModel.setProperty("/modelChanged",false);
			viewModel.setProperty("/drilldown",false);
//			oController.getOwnerComponent().setModel(null);
			viewModel.setProperty("/fromCardNavigation",true);
			
			viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete",true);
			oController.getOwnerComponent().getRouter().navTo("Detail",{path:sPath},false);
			oController.getOwnerComponent().getModel("ui").setProperty("/showExpand",false);
		},

		checkResponseForErrors: function(oData,oRespone) {
			var errorflag = false;
			if(oData.__batchResponses) {
				_.each(oData.__batchResponses,function(batchResponse){
					if(batchResponse.__changeResponses){
						_.each(batchResponse.__changeResponses,function(changeResponse){
							if(changeResponse.headers && changeResponse.headers['sap-message']){
								var message = changeResponse.headers['sap-message'];
								if(message != ""){
									var jsonObject = JSON.parse(message);
									if(jsonObject.severity && jsonObject.severity == "error"){
										errorflag = true;
										return;
									}
								}
							}
						});
						if(errorflag)
							return;
					}else if(batchResponse.response && batchResponse.response.body){
						var jsonObject = JSON.parse(batchResponse.response.body);
						if(jsonObject.error) {
							errorflag = true;
							return;
						}									
					}
				});
			}
			return errorflag;
		},

		onWorkspaceEdit: function(oEvent){
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getOwnerComponent().getModel("workspaceModel");
			var uiModel = oController.getView().getModel("ui");
			var oEventSource = oEvent.getSource();
			var oMetaModel = oModel.getMetaModel();

			var oObject = oController.getView().getBindingContext().getObject();

			var oList = oEvent.getSource();
			while(!(oList instanceof sap.f.GridList)){
				oList = oList.getParent();
			}
			var bundle=oController.getView().getModel("i18n").getResourceBundle();
			var selectedPath = oEvent.getSource().getParent().getBindingContext().getPath();
			var selectedItem = oModel.getProperty(selectedPath);

			var DialogTitle = bundle.getText('MODIFY') + " " + oObject.descr + " " + bundle.getText('WORKSPACE');
			uiModel.setProperty("/editable",true);

			if(selectedItem){
				viewModel.setProperty("/filterValue",selectedItem.filtr);
				sap.ui.core.BusyIndicator.show(0);
				var keys = oController.getSelectionsDateFieldsFromEntity("WorkspaceView");
				_.each(keys,function(key){
					key["module"] = "sap.ui.comp.config.condition.DateRangeType";
				});
				viewModel.setProperty("/workspaceSelectionsDateField",keys);
				var DialogContent = sap.ui.xmlfragment("zvui.work.templates.workspacePopup", oController); 
				var DetailDialog = new sap.m.Dialog({
					content : DialogContent,
					title: DialogTitle,
					beginButton: new sap.m.Button({
						text:"{i18n>SAVE}",
						type:"Emphasized",
						visible: "{ui>/editable}",
						press: function(oEvent){
							sap.ui.core.BusyIndicator.show(0);
							var uiModel = oController.getView().getModel("ui");
							var oDialog = oEvent.getSource().getParent();
							var filterData = oDialog.getContent()[1].getFilterDataAsString();
							
							var filterBar = oDialog.getContent()[1];
							filterData = oController.formatDateValues(filterBar.getId());
							
							oModel.setProperty(selectedPath+"/filtr",filterData);

							oModel.submitChanges({
								success: function(oData,response){
									var errorExist = oController.checkResponseForErrors(oData,response);
									if(!errorExist) {
										oModel.callFunction("/Save", {
											method: "POST",
											success : function(oData,response) {
												oDialog.destroyContent();
												oDialog.close();
//												oDialog.getParent().getContent()[0].getContent()[0].getContent()[0].getBindingInfo("items").binding.refresh();
												uiModel.setProperty("/editable",false);
												oModel.refresh();
											}
										});
//										oList.getBindingInfo("items").binding.refresh();
//										oList.rebindList();
									}
									sap.ui.core.BusyIndicator.hide();
								},
								error: function(oData,response){
									sap.ui.core.BusyIndicator.hide();
								},
							});
						}
					}),
					endButton : new sap.m.Button({
						text:"{i18n>CLOSE}",
						press:function(oEvent){
							var oDialog = oEvent.getSource().getParent();
							oModel.resetChanges();

							var urlParameters = {};
							var functionImport = oMetaModel.getODataFunctionImport('Cancel');

							oModel.callFunction("/Cancel", {
								method: "POST",
								urlParameters: urlParameters,
								success : function(oData,response) {
									oDialog.destroyContent();
									oDialog.close();
									var uiModel = oController.getView().getModel("ui");
									uiModel.setProperty("/editable",false);
									oList.getBindingInfo("items").binding.refresh();
//									sap.ui.core.BusyIndicator.hide();
								}
							});
						}
					})
				});
				DetailDialog.bindElement(selectedPath);
				jQuery.sap.syncStyleClass(oController.getOwnerComponent().getContentDensityClass(), oController.getView(), DetailDialog);
				oController.getView().addDependent(DetailDialog);
				DetailDialog.open();
				sap.ui.core.BusyIndicator.hide();
			}
		},
		onWorkspaceDelete: function(oEvent){
			var oController = this;
			oController.removeTransientMessages();

			var oModel = oController.getView().getModel("workspaceModel");
			var oEventSource = oEvent.getSource();
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var bundle=oController.getView().getModel("i18n").getResourceBundle();
			var oList = oEvent.getSource();
			while(!(oList instanceof sap.f.GridList)){
				oList = oList.getParent();
			}
			var selectedRow = oEvent.getSource().getParent();
			var path = oEvent.getSource().getParent().getBindingContext().getPath();
			MessageBox.confirm(bundle.getText('CONFIRMDELETE'), {
				title: bundle.getText('CONFIRM'),                                  
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction == 'YES'){
						oModel.remove(path, {
							success: function(data,response){
								oList.getBindingInfo("items").binding.refresh();
							},
							error: function(data,response){
								if(data.responseText){
									var messageDetails = JSON.parse(oData.responseText);
									if(messageDetails.error.innererror.errordetails.length > 0){
										oController.prepareMessageDialog(messageDetails.error.innererror.errordetails,oController);
									}
								}
							}
						});
						oModel.submitChanges({
							batchGroupId: "changes"
						});
					}
				}
			});
		},
		
		onAdd : function(oEvent) {
			var oController = this;
			oController.removeTransientMessages();
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getOwnerComponent().getModel("workspaceModel");
			var uiModel = oController.getView().getModel("ui");
			var oEventSource = oEvent.getSource();
			var oMetaModel = oModel.getMetaModel();

			var bundle=oController.getView().getModel("i18n").getResourceBundle();
			var oComponent = oController.getOwnerComponent();
			
			var oObject = oController.getView().getBindingContext().getObject();
			var oView = oController.getView();
			var oViewContext = oView.getBindingContext();
			
			var DetailDialog = sap.ui.xmlfragment("zvui.work.fragment.WorkspaceView", oController); 
			var gridList = DetailDialog.getContent()[0].getPages()[0].getContent()[0];
			var emptyListItem = new sap.m.CustomListItem({
				type: "Active",
				press: [oController.onNewTilePress,oController],
				content: new sap.m.VBox({
					alignItems: "Center",
					items:[
						new sap.ui.core.Icon({
							size: "3rem",
							color: "dodgerblue",
							src: "sap-icon://document",
							press: [oController.onNewTilePress,oController],
						}).addStyleClass("sapUiSmallMarginTop"),
						new sap.m.Text({
							textAlign: "Center",
							text: "{i18n>NEWBLNKWRKSPC}"
						}).addStyleClass("sapUiSmallMarginTopBottom sapUiTinyMarginBeginEnd")
					]
				})
//				content: new sap.m.GenericTile({
//					backgroundImage: "sap-icon://batch-payments", 
//					frameType: "OneByOne",
//					sizeBehavior: "Small", 
//					press: [oController.onNewTilePress,oController],
//					headerImage: "sap-icon://document",
//					tileContent: new sap.m.TileContent({
//						footer: "{i18n>NEWBLNKWRKSPC}"
//					})
//				})
			});
			gridList.addItem(emptyListItem);
			var WorkspaceGridListItems = oController.byId("ItemsST").getItems();
			_.each(WorkspaceGridListItems,function(item){
				var footerText;
				footerText = oModel.getProperty(item.getBindingContextPath()).descr;
//				if(item.getContent()[0].getItems()[1] instanceof sap.m.Link){
//					footerText = item.getContent()[0].getItems()[1].getText();
//				}else{
//					footerText = "";
//				}
				gridList.addItem(
						new sap.m.CustomListItem({
							type: "Active",
							press: [oController.onTilePress,oController],
							content: new sap.m.VBox({
								alignItems: "Center",
								items:[
									new sap.ui.core.Icon({
										size: "3rem",
										color: "dodgerblue",
										src: "sap-icon://document-text",
										press: [oController.onTilePress,oController]
									}).addStyleClass("sapUiSmallMarginTop"),
									new sap.m.Text({
										textAlign: "Center",
										text: footerText
									}).addStyleClass("sapUiSmallMarginTopBottom sapUiTinyMarginBeginEnd")
								],
								customData:[new sap.ui.core.CustomData({
											key: "ContextPath",
											value: item.getBindingContextPath()
								})]
							})
//							content: new sap.m.GenericTile({
//								backgroundImage: "sap-icon://batch-payments", 
//								frameType: "OneByOne",
//								sizeBehavior: "Small", 
//								press: [oController.onTilePress,oController],
//								tileContent: new sap.m.TileContent({
//									footer: footerText,
//									content: new sap.m.ImageContent({
//										src: "sap-icon://batch-payments"
//									})
//								})
//							})
						}));
			});
			DetailDialog.bindElement(oViewContext.getPath());
			jQuery.sap.syncStyleClass(oController.getOwnerComponent().getContentDensityClass(), oController.getView(), DetailDialog);
			oController.getView().addDependent(DetailDialog);
			DetailDialog.open();
			sap.ui.core.BusyIndicator.hide();		
		},
		
		onNewTilePress: function(oEvent){
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var uiModel = oController.getView().getModel("ui");
			var oModel = oController.getOwnerComponent().getModel("workspaceModel");
			var oMetaModel = oModel.getMetaModel();
			var navContainer, oList;
			if(oEvent.getSource().getParent().getParent().getParent().getPage){
				navContainer = oEvent.getSource().getParent().getParent().getParent();
				oList = oEvent.getSource().getParent();
			}else{
				navContainer = oEvent.getSource().getParent().getParent().getParent().getParent().getParent();
				oList = oEvent.getSource().getParent().getParent().getParent();
			}

			oController.removeTransientMessages();

			var uiModel = oController.getView().getModel("ui");
			var oEventSource = oEvent.getSource();

			var oObject = oController.getView().getBindingContext().getObject();

			var bundle=oController.getView().getModel("i18n").getResourceBundle();

			var oView = oController.getView();
			var oViewContext = oView.getBindingContext();
			var sBindingPath = oViewContext.getPath() + "/to_WorkspaceView";
			var oMetaModel;
			
			return new Promise(function(resolve, reject) {

				var fnSuccess = function(oData, oResponse) {
					uiModel.setProperty("/editable",true);

					var DialogTitle = bundle.getText('CREATE') + " " + oObject.descr + " " + bundle.getText('WORKSPACE');

					var path = oData.__metadata.uri.split('/');
					var sPath = "/" + path[path.length - 1];

					viewModel.setProperty("/filterValue","{}");
					sap.ui.core.BusyIndicator.show(0);
					navContainer.getPages()[1].destroyContent();
					var DialogContent = sap.ui.xmlfragment("zvui.work.templates.workspacePopup", oController); 
					
					navContainer.getPages()[1].addContent(DialogContent[0]);
					navContainer.getPages()[1].addContent(DialogContent[1]);
					navContainer.getPages()[1].bindElement(sPath);
					navContainer.to("detail");
					sap.ui.core.BusyIndicator.hide();		
				};

				var createdContext;
				var fnError = function(oError){
					oModel.deleteCreatedEntry(createdContext);
					reject(oError);
				};

				createdContext = oModel.createEntry(sBindingPath, {
					batchGroupId: "changes",
					success: fnSuccess,
					error: fnError
//					changeSetId: mParameters.changeSetId
				});

				oModel.submitChanges({
					batchGroupId: "changes"
				});
			});			
		
		},
		
		onTilePress: function(oEvent){
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var uiModel = oController.getView().getModel("ui");
			var oModel = oController.getOwnerComponent().getModel("workspaceModel");
			var oMetaModel = oModel.getMetaModel();
			var navContainer, oList, sOldPath;
			if(oEvent.getSource().getParent().getParent().getParent().getPage){
				navContainer = oEvent.getSource().getParent().getParent().getParent();
				oList = oEvent.getSource().getParent();
				sOldPath = oEvent.getSource().getContent()[0].getCustomData()[0].getValue();
			}else{
				navContainer = oEvent.getSource().getParent().getParent().getParent().getParent().getParent();
				oList = oEvent.getSource().getParent().getParent().getParent();
				sOldPath = oEvent.getSource().getParent().getCustomData()[0].getValue();
			}
			oController.removeTransientMessages();

			var oEventSource = oEvent.getSource();

			var oObject = oController.getView().getBindingContext().getObject();

			var bundle=oController.getView().getModel("i18n").getResourceBundle();

			var oView = oController.getView();
			var oViewContext = oView.getBindingContext();
			var sBindingPath = oViewContext.getPath() + "/to_WorkspaceView";
			
			return new Promise(function(resolve, reject) {

				var fnSuccess = function(oData, oResponse) {
					uiModel.setProperty("/editable",true);

					var DialogTitle = bundle.getText('CREATE') + " " + oObject.descr + " " + bundle.getText('WORKSPACE');

					var path = oData.__metadata.uri.split('/');
					var sPath = "/" + path[path.length - 1];

					viewModel.setProperty("/filterValue","{}");
					var previousData = oModel.getProperty(sOldPath);
//					oModel.setProperty(sPath, previousData);
					oModel.setProperty(sPath+"/wspvw", oModel.getProperty(sOldPath+"/wspvw"));
					oModel.setProperty(sPath+"/descr", oModel.getProperty(sOldPath+"/descr"));
					oModel.setProperty(sPath+"/lytid", oModel.getProperty(sOldPath+"/lytid"));
					oModel.setProperty(sPath+"/shrng", oModel.getProperty(sOldPath+"/shrng"));
					oModel.setProperty(sPath+"/filtr", oModel.getProperty(sOldPath+"/filtr"));
					oModel.setProperty(sPath+"/odata", oModel.getProperty(sOldPath+"/odata"));
					sap.ui.core.BusyIndicator.show(0);
					navContainer.getPages()[1].destroyContent();
					var DialogContent = sap.ui.xmlfragment("zvui.work.templates.workspacePopup", oController); 
					
					navContainer.getPages()[1].addContent(DialogContent[0]);
					navContainer.getPages()[1].addContent(DialogContent[1]);
					navContainer.getPages()[1].bindElement(sPath);
					navContainer.to("detail");
					sap.ui.core.BusyIndicator.hide();		
				};

				var createdContext;
				var fnError = function(oError){
					oModel.deleteCreatedEntry(createdContext);
					reject(oError);
				};

				createdContext = oModel.createEntry(sBindingPath, {
					batchGroupId: "changes",
					success: fnSuccess,
					error: fnError
//					changeSetId: mParameters.changeSetId
				});

				oModel.submitChanges({
					batchGroupId: "changes"
				});
			});		
			var DialogContent = sap.ui.xmlfragment("zvui.work.templates.workspacePopup", oController);
			navContainer.getPages()[1].addContent(DialogContent[0]);
			navContainer.getPages()[1].addContent(DialogContent[1]);
			navContainer.getPages()[1].bindElement(sPath);
			navContainer.to("detail");
		},
		
		onNavBack: function(oEvent){
			var oController = this;
			var uiModel = oController.getView().getModel("ui");
			uiModel.setProperty("/editable",false);
			oEvent.getSource().getParent().back();
		},
		
		onWorkspaceAddDialogClose: function(oEvent){
			var oController = this;
			var oModel = oController.getOwnerComponent().getModel("workspaceModel");
			var oMetaModel = oModel.getMetaModel();
			var urlParameters = {};
			var functionImport = oMetaModel.getODataFunctionImport('Cancel');
			sap.ui.core.BusyIndicator.show(0);
			oModel.callFunction("/Cancel", {
				method: "POST",
				urlParameters: urlParameters,
				success : function(oData,response) {
					sap.ui.core.BusyIndicator.hide();
				}
			});
			oEvent.getSource().getParent().close();
		},
		
		onDialogAfterClose: function(oEvent){
			var oController = this;
			var uiModel = oController.getView().getModel("ui");
			
			uiModel.setProperty("/editable",false);
			oEvent.getSource().destroyContent();
		},
		
		onCreateWorkspace: function(oEvent){
			var oController = this;
			var uiModel = oController.getView().getModel("ui");
			var oModel = oController.getOwnerComponent().getModel("workspaceModel");
			var oMetaModel = oModel.getMetaModel();
			var oList = oController.getView().getContent()[0].getContent()[0].getContent()[0];
			var filterData = oEvent.getSource().getParent().getContent()[0].getPage('detail').getContent()[1].getFilterDataAsString();
			var sPath = oEvent.getSource().getParent().getContent()[0].getPage('detail').getContent()[1].getBindingContext().getPath();
			var createDialog = oEvent.getSource().getParent();
			var filterBar = createDialog.getContent()[0].getPage('detail').getContent()[1];
			filterData = oController.formatDateValues(filterBar.getId());
			oModel.setProperty(sPath+"/filtr",filterData);
			oModel.submitChanges({
				success: function(oData,response){
					var errorExist = oController.checkResponseForErrors(oData,response);
					if(!errorExist) {
						oModel.callFunction("/Save", {
							method: "POST",
							success : function(oData,response) {
								createDialog.close();
		//						uiModel.setProperty("/editable",false);
								oList.getBindingInfo("items").binding.refresh();
							}
						});
					}
					sap.ui.core.BusyIndicator.hide();	
				},
				error: function(oData,response){
					sap.ui.core.BusyIndicator.hide();
				},
			});
			
	
		},
		
		onDialogAfterRendering: function(oEvent){
			var oController = this;
		},

//		onWorkspaceAdd : function(oEvent) {
//			var oController = this;
//			oController.removeTransientMessages();
//
//			var viewModel = oController.getView().getModel("viewModel");
//			var oModel = oController.getOwnerComponent().getModel("workspaceModel");
//			var uiModel = oController.getView().getModel("ui");
//			var oEventSource = oEvent.getSource();
//			var oMetaModel = oModel.getMetaModel();
//
//			var oObject = oController.getView().getBindingContext().getObject();
//
//			var oList = oEvent.getSource().getParent().getParent();
//			var bundle=oController.getView().getModel("i18n").getResourceBundle();
//
//			var oView = oController.getView();
//			var oViewContext = oView.getBindingContext();
//			var sBindingPath = oViewContext.getPath() + "/to_WorkspaceView";
//			var oMetaModel;
//			
//			var keys = oController.getSelectionsDateFieldsFromEntity("WorkspaceView");
//			viewModel.setProperty("/workspaceSelectionsDateField",keys);
//			
//			return new Promise(function(resolve, reject) {
//
//				var fnSuccess = function(oData, oResponse) {
//					uiModel.setProperty("/editable",true);
//
//					var DialogTitle = bundle.getText('CREATE') + " " + oObject.descr + " " + bundle.getText('WORKSPACE');
//
//					var path = oData.__metadata.uri.split('/');
//					var sPath = "/" + path[path.length - 1];
//
//					viewModel.setProperty("/filterValue","{}");
//					sap.ui.core.BusyIndicator.show(0);
//					var DialogContent = sap.ui.xmlfragment("zvui.work.templates.workspacePopup", oController); 
//
//					var DetailDialog = new sap.m.Dialog({
//						content : DialogContent,
//						title: DialogTitle,
//						beginButton: new sap.m.Button({
//							text:"{i18n>SAVE}",
//							type:"Emphasized",
//							visible: "{ui>/editable}",
//							press: function(oEvent){
//								sap.ui.core.BusyIndicator.show(0);
//								var uiModel = oController.getView().getModel("ui");
//								var oDialog = oEvent.getSource().getParent();
//								var filterData = oDialog.getContent()[1].getFilterDataAsString();
//
//								oModel.setProperty(sPath+"/filtr",filterData);
//
//								oModel.submitChanges({
//									success: function(oData,response){
//										var errorExist = oController.checkResponseForErrors(oData,response);
//										if(!errorExist) {
//											oDialog.destroyContent();
//											oDialog.close();
//											uiModel.setProperty("/editable",false);
//											oList.getBindingInfo("items").binding.refresh();
//										}
//										sap.ui.core.BusyIndicator.hide();	
//									},
//									error: function(oData,response){
//										sap.ui.core.BusyIndicator.hide();
//									},
//								});
//							}
//						}),
//						endButton : new sap.m.Button({
//							text:"{i18n>CLOSE}",
//							press:function(oEvent){
//								var uiModel = oController.getView().getModel("ui");
//								uiModel.setProperty("/editable",false);
//								var oDialog = oEvent.getSource().getParent();
//								oModel.resetChanges();
//
//								var urlParameters = {};
//								var functionImport = oMetaModel.getODataFunctionImport('Cancel');
//
//								oModel.callFunction("/Cancel", {
//									method: "POST",
//									urlParameters: urlParameters,
//									success : function(oData,response) {
//										oDialog.destroyContent();
//										oDialog.close();
//										var uiModel = oController.getView().getModel("ui");
//										uiModel.setProperty("/editable",false);
//										oList.getBindingInfo("items").binding.refresh();
//										sap.ui.core.BusyIndicator.hide();
//									}
//								});
//							}
//						})
//					});
//					DetailDialog.bindElement(sPath);
//					jQuery.sap.syncStyleClass(oController.getOwnerComponent().getContentDensityClass(), oController.getView(), DetailDialog);
//					oController.getView().addDependent(DetailDialog);
//					DetailDialog.open();
//					sap.ui.core.BusyIndicator.hide();		
//				};
//
//				var createdContext;
//				var fnError = function(oError){
//					oModel.deleteCreatedEntry(createdContext);
//					reject(oError);
//				};
//
//				createdContext = oModel.createEntry(sBindingPath, {
//					batchGroupId: "changes",
//					success: fnSuccess,
//					error: fnError
////					changeSetId: mParameters.changeSetId
//				});
//
//				oModel.submitChanges({
//					batchGroupId: "changes"
//				});
//			});			
//		},

		onInitialise: function(oEvent){
			var oController = this;
			var oSmartFilter = oEvent.getSource();
			var viewModel = oController.getView().getModel("viewModel");
			var filterValue = viewModel.getProperty("/filterValue");
			
            
			if(filterValue != undefined && filterValue != ""){
				filterValue = filterValue.replace(/\\"/g,'"');
				oSmartFilter.setFilterDataAsString(filterValue,true);
			}
		},
		onWorkspacePopupVariantChange: function(oEvent){	
			var oController = this;
			var oModel = oController.getOwnerComponent().getModel("workspaceModel");
			if(oEvent.getParameter("value") == ""){
				oEvent.getSource().getParent().getParent().getParent().getParent().getParent().getContent()[1].setBlocked(false)
			}
			if(!oEvent.getParameter("selectionChange")){
				return;
			}
			var path = oEvent.getSource().getBindingInfo("value").binding.getContext().sPath;
			var fieldPath = oEvent.getSource().getBindingInfo("value").binding.getContext().sPath + "/" + oEvent.getSource().getBindingInfo("value").binding.sPath;
			
//			oModel.update(fieldPath, oEvent.getParameter("value"), {
//				method: "PUT",
//				success: function(data) {
//					oModel.read(path,{
//						_refresh: true
//					});
//				},
//				error: function(e) {
////					alert("error");
//				}
//			});
			oModel.submitChanges({
				batchGroupId: "changes",
				success: function(data) {
					oModel.read(path,{
						_refresh: true
					});
				}
			});
		},
		formatDateValues: function(filterID){
			var oController = this;
			var filterBar = oController.getView().byId(filterID);
			if(!filterBar){
				var filterBar = sap.ui.getCore().getElementById(filterID);
			}
			var visibleFilterItemsNames = filterBar._getVisibleFieldNames();
			var filterData = filterBar.getFilterDataAsString();
			_.each(visibleFilterItemsNames,function(filterName){
				var filterItemMetadata = filterBar._getFilterMetadata(filterName);
				if(filterItemMetadata.type == "Edm.DateTime"){
					var dateFormat = sap.ui.core.format.DateFormat.getInstance({
						format: "yyyyMMdd",
						interval: false
					});
					var parsedData = JSON.parse(filterData);
					if(parsedData[filterName]){
						for(var i = 0; i < parsedData[filterName].ranges.length; i++){
							if(parsedData[filterName].ranges[i].value1){
								var dateValue = new Date(parsedData[filterName].ranges[i].value1);
								var formattedDate = dateFormat.format(dateValue);
								parsedData[filterName].ranges[i].value1 = formattedDate;
							}
							if(parsedData[filterName].ranges[i].value2){
								var dateValue = new Date(parsedData[filterName].ranges[i].value2);
								var formattedDate = dateFormat.format(dateValue);
								parsedData[filterName].ranges[i].value2 = formattedDate;
							}
							if(parsedData[filterName].conditionTypeInfo && 
									parsedData[filterName].conditionTypeInfo.data){
								var operation = parsedData[filterName].conditionTypeInfo.data.operation;
								if(operation == "DATERANGE" || operation == "FROM" || operation == "DATE"){
									if(parsedData[filterName].conditionTypeInfo.data.value1){
										var dateValue = new Date(parsedData[filterName].conditionTypeInfo.data.value1);
										var formattedDate = dateFormat.format(dateValue);
										parsedData[filterName].conditionTypeInfo.data.value1 = formattedDate;
									}
									if(parsedData[filterName].conditionTypeInfo.data.value2){
										var dateValue = new Date(parsedData[filterName].conditionTypeInfo.data.value2);
										var formattedDate = dateFormat.format(dateValue);
										parsedData[filterName].conditionTypeInfo.data.value2 = formattedDate;
									}
								}
							}
						}
						filterData = JSON.stringify(parsedData);
					}
				}
			});
			return filterData;
		},
		
		onWorkspaceSearch: function(oEvent){
			var oController = this;
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var oModel = oController.getOwnerComponent().getModel("workspaceModel");
			var oMetaModel = oModel.getMetaModel();
			var source= oEvent.getSource();
			var aFilters = [];
			var sQuery = oEvent.getSource().getValue();
			if (sQuery && sQuery.length > 0) {
				var filter = new sap.ui.model.Filter("descr", sap.ui.model.FilterOperator.Contains, sQuery);
				aFilters.push(filter);
			}
			var oList  = source.getParent().getParent();
			var oBindings = oList.getBinding("items");
			oBindings.filter(aFilters,"Application");
		}
	});
});