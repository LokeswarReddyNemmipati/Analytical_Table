sap.ui.define([
	"zvui/work/controller/BaseController",
	"sap/ui/core/XMLTemplateProcessor",
	"sap/ui/core/util/XMLPreprocessor",
	"sap/ui/core/Fragment",
	"sap/ui/core/mvc/View",
	"sap/ui/core/Component",
	"sap/ui/model/json/JSONModel"
	], function(Controller, XMLTemplateProcessor, XMLPreprocessor, Fragment, View, Component,JSONModel) {
	"use strict";

	return Controller.extend("zvui.work.controller.DetailDetail", {
		onInit: function() {
			var oController = this;
			var iOriginalBusyDelay,
			oViewModel = this.getOwnerComponent().getModel("viewModel");
			this.getOwnerComponent().getRouter().getRoute("DetailDetail").attachPatternMatched(this._onObjectMatched, this);
			oController.workspaceView = "";

		},
		onAfterRendering: function() {
		},

		onBeforeRendering: function() {

		},

		onClickAssign:function(oEvent){
//			oEvent.getSource().getDependents()[0].openBy(oEvent.getSource());
		},
		onNavBack : function() {
			this.navBack();
		},

		navBack : function(){
			var sPreviousHash = History.getInstance().getPreviousHash();
			if (sPreviousHash !== undefined) {
				history.go(-1);
			} else {
				this.getOwnerComponent().getRouter().navTo("List", {}, true);
			}
		},


		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched : function (oEvent) {

			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			if(viewModel.getProperty("/skipPageRefresh")){
// 				viewModel.setProperty("/skipPageRefresh",false);				
				sap.ui.core.BusyIndicator.hide();
				return;
			}
			viewModel.setProperty("/drilldown",true);
			viewModel.setProperty("/detaildetailRoute",true);
			var newPath = oEvent.getParameter("arguments").path1;
			if(newPath.indexOf("#!") != -1)
				newPath = newPath.substr(0,newPath.lastIndexOf("#!"));

			oController.previousLevel = oController.level;
			oController.level = parseInt(oEvent.getParameter("arguments").level);
			viewModel.setProperty("/currentDetailPageLevel",oController.level);
			viewModel.setProperty("/detailDetailHeaderPath", newPath);
			oController.sPath = newPath;
			var oModel;
			if(oController.level == 0){
				oModel = oController.getOwnerComponent().getModel();	
			}else{
				oModel = oController.getView().getModel();
			}
			
			var oMetaModel = oModel.getMetaModel();

			var sPath = "/" + oController.sPath;
//			sap.ui.core.BusyIndicator.show(0);

			var entitySet = oController.sPath.substr(0, oController.sPath.indexOf('('));
			var oRootEntitySet = oMetaModel.getODataEntitySet(entitySet);
			var oRootEntityType = oMetaModel.getODataEntityType(oRootEntitySet.entityType);
			
			var selectedPaths = viewModel.getProperty("/selectedPaths");
			if(selectedPaths){
				var sTitle = oRootEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].TypeName.String;
				if(!sTitle){
					sTitle = oRootEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].TypeNamePlural.String;
				}
				if(oController.level == 0){
					selectedPaths.titleValue = sTitle
					selectedPaths.route = "Detail";
					selectedPaths.level = oController.level;
					selectedPaths.node = undefined;
				}else if(oController.level == 1) {
					selectedPaths.node = oController.prepareCurrentNode(sPath, sTitle);
				}else if(oController.level == 2) {
					selectedPaths.node.node = oController.prepareCurrentNode(sPath, sTitle);
				}else if(oController.level == 3) {
					selectedPaths.node.node.node = oController.prepareCurrentNode(sPath, sTitle);
				}else if(oController.level == 4) {
					selectedPaths.node.node.node.node = oController.prepareCurrentNode(sPath, sTitle);
				}else if(oController.level == 5) {
					selectedPaths.node.node.node.node.node = oController.prepareCurrentNode(sPath, sTitle);
				}else if(oController.level == 6) {
					selectedPaths.node.node.node.node.node.node = oController.prepareCurrentNode(sPath, sTitle);
				}else if(oController.level == 7) {
					selectedPaths.node.node.node.node.node.node.node = oController.prepareCurrentNode(sPath, sTitle);
				}else if(oController.level == 8) {
					selectedPaths.node.node.node.node.node.node.node.node = oController.prepareCurrentNode(sPath, sTitle);
				}else if(oController.level == 9) {
					selectedPaths.node.node.node.node.node.node.node.node.node = oController.prepareCurrentNode(sPath, sTitle);
				}else if(oController.level == 10) {
					selectedPaths.node.node.node.node.node.node.node.node.node.node = oController.prepareCurrentNode(sPath, sTitle);
				}
				
			}
			
			viewModel.setProperty("/selectedPaths",selectedPaths);
			
			oController.readPath(entitySet,sPath);
			var modelChanged = viewModel.getProperty("/modelChanged");
			var fromDetailDrilldown;
			if(viewModel.getProperty("/fromDetailDrilldown")){
//				if(modelChanged){	
//					viewModel.setProperty("/preventHashChange",true);
//					oController.noBackPlease();
//					viewModel.setProperty("/fromDetailDrilldown",false);
//				}	
				viewModel.setProperty("/fromDetailDrilldown",false);
				oController.previousLevel = 0;
//				oController.getView().getContent()[0].removeAllContent();
				fromDetailDrilldown = true;
			}
						
			var previousEntitySet = viewModel.getProperty("/DetailDetailEntitySet");
			if(oController.level == 0 && (oController.previousLevel == undefined || oController.previousLevel == 0)){
//				oController.workspaceView = window.workspaceView;
//				viewModel.setProperty("/DetailDetailEntitySet",entitySet);
//				viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete",true);
//				oController.createView();
				if(window.workspaceView == oController.workspaceView){			
					if(entitySet != previousEntitySet) {
						viewModel.setProperty("/DetailDetailEntitySet",entitySet);
						viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete",true);
						oController.createView();
					}else{
						viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete",false);
						oController.getView().getContent()[0].getContent()[oController.level].removeStyleClass("vistex-display-none");
						for(var i = oController.getView().getContent()[0].getContent().length; i>oController.level; i--){
							oController.getView().getContent()[0].removeContent(i);
						}
						if(viewModel.getProperty("/selectedParentItemId")){
							$("#" + viewModel.getProperty("/selectedParentItemId")).addClass("vistexSelectedItemColor");
							$("#" + viewModel.getProperty("/selectedParentItemId") + "-sub").addClass("vistexSelectedItemColor");
							$("[data-sap-ui-related="+viewModel.getProperty("/selectedParentItemId")+"]").addClass("vistexSelectedItemColor");
						}
	//					oController.readPath(entitySet,sPath);
						var oControl = oController.getView().getContent()[0].getContent()[0];
						if(oControl){
	//						viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete",false);
							oControl.bindElement(sPath);
							if(fromDetailDrilldown && oController.getView().getContent()[0].getContent()[0].getContent()[0].getHeaderContent()[0] && 
									oController.getView().getContent()[0].getContent()[0].getContent()[0].getHeaderContent()[0].getItems && oController.getView().getContent()[0].getContent()[0].getContent()[0].getHeaderContent()[0].getItems()[0].getContent &&
									oController.getView().getContent()[0].getContent()[0].getContent()[0].getHeaderContent()[0].getItems()[0].getContent[0].getItems &&
									oController.getView().getContent()[0].getContent()[0].getContent()[0].getHeaderContent()[0].getItems()[0].getContent()[0].getItems()[0].fireSearch){
								oController.getView().getContent()[0].getContent()[0].getContent()[0].getHeaderContent()[0].getItems()[0].getContent()[0].getItems()[0].fireSearch();							
							}else{
								viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete",false);
							}
							oController.setNavigationTypeForTable(oControl);
							oController.clearTableSelections(oControl, false);
							oController.refreshTableEntitiesData();
						}
	//					sap.ui.core.BusyIndicator.hide();
					}			
				}else{
					oController.workspaceView = window.workspaceView;
					viewModel.setProperty("/DetailDetailEntitySet",entitySet);
					viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete",false);
					oController.createView();
				}
			}else if(oController.level > oController.previousLevel){
				oController.getView().getContent()[0].getContent()[oController.previousLevel].addStyleClass("vistex-display-none");
				viewModel.setProperty("/DetailDetailEntitySet",entitySet);
				viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete",true);
				oController.createView();
			}else{
				oController.getView().getContent()[0].getContent()[oController.level].removeStyleClass("vistex-display-none");
				for(var i = oController.getView().getContent()[0].getContent().length; i>oController.level; i--){
					oController.getView().getContent()[0].removeContent(i);
				}
				var oControl = oController.getView().getContent()[0].getContent()[oController.level];
				if(oControl){
					oControl.bindElement(sPath);
					oController.setNavigationTypeForTable(oControl);
					oController.clearTableSelections(oControl, true);
				}
				sap.ui.core.BusyIndicator.hide();
			}
		},

		createView : function() {

			var oController = this;
			var filterEntityNotExist = false;
			var position = oController.sPath.indexOf('(');
			var treeKey = oController.sPath.substr(0,position);
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			viewModel.setProperty("/treekey", treeKey);

			if (oController.getView().getContent()[0].getContent().length > 0 && oController.level == 0) {
				oController.getView().getContent()[0].removeAllContent();
			}
			
			var sPath = "/" + oController.sPath;

			var entitySet = oController.sPath.substr(0, oController.sPath.indexOf('('));
			var entityType = entitySet + "Type";

			var oModel = oController.getOwnerComponent().getModel();
			
			if(viewModel.getProperty("/fromSummaryGroup")){
				var metadataUrlParams = {};				
				if(oController.odataFetched && oController.odataFetched[entitySet]){
					oController.odataFetched[entitySet]["count"]++;
				}else{
					if(!oController.odataFetched){
						oController.odataFetched = {};
					}
					oController.odataFetched[entitySet] = {};
					oController.odataFetched[entitySet]["count"] = 0;
				}
				
				 var serviceURL = oModel.sServiceUrl;
				if(viewModel.getProperty("/wspvw")){
					metadataUrlParams["WSPVW"] = viewModel.getProperty("/wspvw");
				}
				metadataUrlParams["ENTITY"] = entitySet;
				metadataUrlParams["COUNT"] =  oController.odataFetched[entitySet]["count"];
				oModel = new sap.ui.model.odata.v2.ODataModel({serviceUrl: serviceURL, 
					metadataUrlParams: metadataUrlParams,
					loadAnnotationsJoined: true});

				oModel.attachRequestSent(function(oEvent){
					var url = oEvent.getParameter("url");
					var entity = url.split("?$")[0];
					var searchEvent = viewModel.getProperty("/searchEvent");
					var searchEntity = viewModel.getProperty("/searchedEntity");
					if(searchEvent){						
						if(entity.indexOf(searchEntity) != -1){
							viewModel.setProperty("/requestSent",true);
						}
					}
					var skipBusyIndicator = viewModel.getProperty("/skipBusyIndicator");
					if(!skipBusyIndicator && !viewModel.getProperty("/fromSummaryGroup")){
						var entityName;
						if(entity.split("/")[1] && entity.split("/")[1].split("to_")[1]){
							entityName = entity.split("/")[1].split("to_")[1];
						}else{
							entityName = entity.split("(")[0];
						}
						var facetParentTable = oController.getFacetParentTable(entityName, true);
						if(!facetParentTable){
							if(url.startsWith("F4") && url.indexOf("$orderby") == -1){

							}else{
							    sap.ui.core.BusyIndicator.show(0);
							}
						}
					}
					if(viewModel.getProperty("/fromSummaryGroup")){
						sap.ui.core.BusyIndicator.show(0);
					}
				});
				oModel.attachRequestCompleted(function(oEvent){					
					var viewModel = oController.getView().getModel("viewModel");
					if(!viewModel){
						return;
					}
					
					if(!viewModel.getProperty("/skipHideBusyIndicatorOnBatchComplete")){
						sap.ui.core.BusyIndicator.hide();
					}
					
					var oModel = oController.getView().getModel();
					var oMetaModel = oModel.getMetaModel();
					var searchEvent = viewModel.getProperty("/searchEvent");
					var requestSent = viewModel.getProperty("/requestSent");
					var searchEntity = viewModel.getProperty("/searchedEntity");
					var url = oEvent.getParameter("url");
					if(url) {
						var entity = url.split("?$")[0];
						if(entity.indexOf(searchEntity) != -1){
							if(searchEvent && requestSent){
								viewModel.setProperty("/searchEvent",false);
								viewModel.setProperty("/requestSent",false);

								oController.refreshTableEntitiesData();
								
								if(viewModel.getProperty("/visualFilterInitialized") == "0"){
									viewModel.setProperty("/visualFilterInitialized","1");
									if(viewModel.getProperty("/filterBarInitialized")){
//										Changes for Page generation from backend
										var oFilterBar = oController.getView().getContent()[0].getContent()[0].getContent()[0].getContent()[0].getHeaderContent()[0].getContent()[0].getItems()[0];
										oController.initializeVisualFilter(oFilterBar);
									}
								}else if(viewModel.getProperty("/visualFilterInitialized") == "1"){
									viewModel.setProperty("/visualFilterInitialized","2");
								}
								
//								oModel.refresh(true);
							}
						}
						
						if(entity.indexOf(oController.rootEntity) != -1 && window.prepareNavigationMessageStrip){
							if(oEvent.getParameter("response").responseText && oController.getView){
								var view = oController.getView();
								var oResponseData = JSON.parse(oEvent.getParameter("response").responseText);
								if(oResponseData.d.uittl){
									view.getContent()[0].getContent()[0].getContent()[0].getSections()[0].
									getSubSections()[0].getBlocks()[0].insertContent(new sap.m.MessageStrip({
										text: oResponseData.d.uittl, type:sap.ui.core.MessageType.Information, showIcon:true}));
									window.prepareNavigationMessageStrip = false;
								}
								if(oResponseData.d.ui_selct){
									var oFilterData = JSON.parse(oResponseData.d.ui_selct);
									viewModel.setProperty("/navigationFilterData",oFilterData);
									var oFilterBar = view.getContent()[0].getContent()[0].getContent()[0].getContent()[0].getHeaderContent()[0].getContent()[0].getItems()[0];
//									setTimeout(function(){
//										oController.setFilterBarInitialData(oFilterBar);
//									},1000);
								}
								if(oResponseData.d.show_actn){
									viewModel.setProperty("/navigationButtonsVisible",oResponseData.d.show_actn);
								}
								if(oResponseData.d.disp_only){
									viewModel.setProperty("/disp_only",oResponseData.d.disp_only);
								}
							}
						}
					}
					wrkspglobal.session.ccounter = 7200;
					wrkspglobal.session.scounter = 7200;
//					initializeVariables();
				});

				oModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
				oModel.setDefaultCountMode(sap.ui.model.odata.CountMode.Inline);
				oModel.setRefreshAfterChange(false);

				oController.getView().setModel(oModel);
//				oController.getOwnerComponent().setModel(oModel);
				oModel.attachPropertyChange(oController.fnPropertyChanged,oController);
				oModel.attachBatchRequestFailed(oController.onBatchRequestFailed,oController);
				oModel.attachBatchRequestCompleted(function(oEvent){
					if(!viewModel.getProperty("/skipHideBusyIndicatorOnBatchComplete")){
						sap.ui.core.BusyIndicator.hide();
					}
				});							
				
				oModel.attachMessageChange(function(oEvent){
					var aNewMessages = oEvent.getParameter("newMessages");
					var sTarget,aKeys,aKeyValue,value, additionalText = "";
					var oModel = oEvent.getSource();
					var oMetaModel = oModel.getMetaModel();
					for(var i = 0; i < aNewMessages.length; i++){
						additionalText = "";
						sTarget = aNewMessages[i].getTarget();
						if(sTarget != ""){
							var entitySet = sTarget.substring(sTarget.indexOf('/') + 1 ,sTarget.indexOf('('));

							var oEntitySet = oMetaModel.getODataEntitySet(entitySet);
							var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);

							sTarget = sTarget.substring(sTarget.indexOf('(') + 1 ,sTarget.indexOf(')'));
							aKeys = sTarget.split(',');

							for(var j = 0; j < aKeys.length; j++){
								aKeyValue = aKeys[j].split('=');
								if(aKeyValue[0] != 'row_id'){
									value = aKeyValue[1];
									value = value.substring(value.indexOf("'") + 1 ,value.lastIndexOf("'"));
									var oField = _.findWhere(oEntityType.property,{ name : aKeyValue[0]});
									if(oField['sap:display-format'] == "NonNegative"){
										value = value.replace(/^0+/, '');
									}
									if(value != "") {
										if(additionalText != "")
											additionalText = additionalText + "/";
										additionalText = additionalText + value;
									}
								}
							}
							aNewMessages[i].setAdditionalText(additionalText);
						}
					}					
				});

			}
			
			var oMetaModel = oModel.getMetaModel();

			var NavigationTreeData = viewModel.getProperty("/NavigationTreeData");
			var entty = entitySet.replace(/x/g,"/");
			var hierarchyModel = new JSONModel();

			var hierarchy = []; 
			hierarchyModel.setProperty("/nodes",hierarchy);

			oMetaModel.loaded().then(function() {
				if(entitySet.indexOf("_PRX") !== -1){
					var actualRootEntity = viewModel.getProperty("/actualRootEntity/" + entitySet);
					hierarchyModel.setProperty("/actualRootEntity",actualRootEntity);
					var oActualRootEntitySetContext = oMetaModel.createBindingContext(oMetaModel.getODataEntitySet(actualRootEntity, true));
				}else{
					var oActualRootEntitySetContext = oMetaModel.createBindingContext(oMetaModel.getODataEntitySet(entitySet, true));
				}
				var oEntitySetContext = oMetaModel.createBindingContext(oMetaModel.getODataEntitySet(entitySet, true));
				var oEntityTypeContext = oMetaModel.createBindingContext(oMetaModel.getODataEntityType(entityType, true));
				var oWorkspaceEntitySetContext = oMetaModel.createBindingContext(oMetaModel.getODataEntitySet("WorkspaceView", true));				
				var oFilterEntitySetContext, oFilterEntityType;
				
				var oRootEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(entitySet).entityType);
				var aFacets = oRootEntityType["com.sap.vocabularies.UI.v1.Facets"];
				
				var oEntitySet = oMetaModel.getProperty(oEntitySetContext.getPath());
				var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
				var navigationProperties = oEntityType["navigationProperty"];
				var filterEntitySet;
				_.each(navigationProperties, function(property){
					var sEntity = oMetaModel.getODataAssociationEnd(oEntityType,property.name);
					var sEntityType = oMetaModel.getODataEntityType(sEntity.type);
					if(sEntityType["vui.bodc.workspace.SearchEntity"] 
						&& sEntityType["vui.bodc.workspace.SearchEntity"].Bool
						&& sEntityType["vui.bodc.workspace.SearchEntity"].Bool == "true"){
						var sEntitySet = oMetaModel.getODataAssociationSetEnd(oEntityType,property.name);
						hierarchyModel.setProperty("/showFilter",true);
						hierarchyModel.setProperty("/tableBindingPath",property.name);
						hierarchyModel.setProperty("/smartFilterId","smartFilterBar1");
						hierarchyModel.setProperty("/varientID","__SVM02");
						hierarchyModel.setProperty("/filterEntity",sEntitySet.entitySet);
						
						filterEntitySet = oMetaModel.getODataEntitySet(sEntitySet.entitySet);
						var oFilterEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet.entitySet).entityType);
						
						var filterBarGroups = [];
						_.each(oFilterEntityType.navigationProperty, function(oNavProperty){
							if(oNavProperty.name != "to_" + oFilterEntityType.name.split("_SRType")[0]) {
								var oNavEntity = oMetaModel.getODataEntityType(oMetaModel.getODataAssociationEnd(oFilterEntityType,oNavProperty.name).type);
								var description = "";
								if(oNavEntity['com.sap.vocabularies.UI.v1.HeaderInfo'] && 
										oNavEntity['com.sap.vocabularies.UI.v1.HeaderInfo'].TypeNamePlural &&
										oNavEntity['com.sap.vocabularies.UI.v1.HeaderInfo'].TypeNamePlural.String){
									description = oNavEntity['com.sap.vocabularies.UI.v1.HeaderInfo'].TypeNamePlural.String;
								}
								filterBarGroups.push({
									key : oNavProperty.name,
									descr : description });
							}
						});						
						hierarchyModel.setProperty("/filterBarGroups",filterBarGroups);
					}
				});
				var filterEntity = hierarchyModel.getProperty("/filterEntity");
				if(filterEntity){
					var VFModel = new JSONModel();
					var VFData = [];
					VFModel.setProperty("/VFData",[]);
					oController.getView().setModel(VFModel,"VFModel");
					filterEntitySet = oMetaModel.getODataEntitySet(filterEntity);
					var filterEntityType = oMetaModel.getODataEntityType(filterEntitySet.entityType);					
					if(filterEntityType["vui.bodc.SummaryFieldCharacteristic"]){
//							_.each(filterEntityType["vui.bodc.SummaryFieldCharacteristic"],function(characteristic){
//								var VFDataEntry = {};
//								var data = characteristic.PropertyPath.split("/");
//								var characteristicEntity = oMetaModel.getODataAssociationEnd(filterEntityType,data[0]);
//								var characteristicEntityType = oMetaModel.getODataEntityType(characteristicEntity.type);
//								var properties = characteristicEntityType.property;
//								var cardTitle = _.find(properties,{name: data[1]})["sap:label"];
//								VFDataEntry["visible"] = true;
//								VFDataEntry["fetched"] = false;
//								VFDataEntry["toolbarTitle"] = cardTitle;
//								VFDataEntry["defaultChart"] = "BAR";
//								VFDataEntry["count"] = "";
//								VFDataEntry["characteristic"] = characteristic.PropertyPath.replace("/",".");
//								VFDataEntry["chartContent"] = {
//										"chartType": "None",
//										"text": "Refign filter to set Value",
//										"child": []
//								}
//								VFDataEntry["measureBy"] = {
//										"selected": "",
//										"data": []
//								};
//								_.each(filterEntityType["vui.bodc.SummaryFieldKeyfigure"],function(keyFigure){
//									var keyFieldData = keyFigure.PropertyPath.split("/");
//									var keyFieldEntity = oMetaModel.getODataAssociationEnd(filterEntityType,keyFieldData[0]);
//									var keyFieldEntityType = oMetaModel.getODataEntityType(keyFieldEntity.type);
//									var keyFieldProperties = keyFieldEntityType.property;
//									var listLabel = _.find(keyFieldProperties,{name: keyFieldData[1]})["sap:label"];
//									VFDataEntry["measureBy"]["data"].push({
//										"text": listLabel,
//										"key" : keyFigure["PropertyPath"]
//									});
//								});
//								VFData.push(VFDataEntry);
//							});
//							VFModel.setProperty("/VFData",VFData);
//							oController.getView().setModel(VFModel,"VFModel");
							hierarchyModel.setProperty("/showVisualFilter",true);
						}else{
							hierarchyModel.setProperty("/showVisualFilter",false);
						}
						oFilterEntitySetContext = oMetaModel.createBindingContext(oMetaModel.getODataEntitySet(filterEntity,true));
						oFilterEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(filterEntity).entityType);	
				}else{
					filterEntityNotExist = true;
				}
				if(filterEntitySet){
					if(oRootEntityType["com.sap.vocabularies.UI.v1.HeaderFacets"]  &&
							oRootEntityType["com.sap.vocabularies.UI.v1.HeaderFacets"].length > 0){
						hierarchyModel.setProperty("/showSnappingHeader",true);
//						viewModel.setProperty("/" + filterEntitySet.name + "filterMode","snaphdr");
					}else{
						hierarchyModel.setProperty("/showSnappingHeader",false);
//						viewModel.setProperty("/" + filterEntitySet.name + "filterMode","compact");
						/*if(hierarchyModel.getProperty("/showVisualFilter")){
							viewModel.setProperty("/" + filterEntitySet.name + "filterMode","visual");
						}else{
							viewModel.setProperty("/" + filterEntitySet.name + "filterMode","snaphdr");
						}*/
					}
					viewModel.setProperty("/" + filterEntitySet.name + "filterMode","compact");
				}
				if(oEntityType["vui.bodc.workspace.SummaryProxy"] || oEntityType["vui.bodc.workspace.SummaryProxy"]
					|| oEntityType["vui.bodc.workspace.SummaryProxy"]){
					
					viewModel.setProperty("/hideDetailFooter",true);
				}else{
					viewModel.setProperty("/hideDetailFooter",false);
				}

				var oEntities = viewModel.getProperty("/entities");
				if(oEntities == null || oEntities == undefined) {
					oEntities = {};
				}
				for(var i=0; i<aFacets.length; i++){
					if(aFacets[i].Target && aFacets[i].Target.AnnotationPath
							&& aFacets[i].Target.AnnotationPath.indexOf("com.sap.vocabularies.UI.v1.LineItem") >= 0){
						var sNavigationPath = aFacets[i].Target.AnnotationPath.split("/")[0];
						var oEntity = oMetaModel.getODataEntityType(oMetaModel.getODataAssociationEnd(oRootEntityType, sNavigationPath).type);
						if(oEntities[oEntity.name] == undefined 
								|| oEntities[oEntity.name] == null
								|| oEntities[oEntity.name] == "") {
							if(aFacets[i].TableType && aFacets[i].TableType.String == "Responsive"){
								oEntities[oEntity.name] = "ResponsiveTable";
							}else{
								oEntities[oEntity.name] = "NonResponsiveTable";
							}
//							viewModel.setProperty("/navigateAction_" + oEntity.name, "details");
						}
					}
				}
				viewModel.setProperty("/entities",oEntities);
				hierarchyModel.setProperty("/entities",oEntities);
				hierarchyModel.setProperty("/ShowDetailDetail",true);

				var urlParameters = {};
				var pageid = entitySet.split("_PRX")[0];	
				oModel.read("/Page(page_id='" + pageid + "')",{
					urlParameters: urlParameters,	
					success: function(oData){
						if(!oData.vw_json) return;
//						
						var viewstringData = oData.vw_json;
//						var viewstringData = wrkspglobal.detailpagexml;
//						
						viewstringData = viewstringData.replace(new RegExp('#', 'g'), "$");
						viewstringData = viewstringData.replace(new RegExp("&","g"), "&amp;");
						viewstringData = viewstringData.replace(new RegExp("&amp;amp;","g"), "&amp;");			
				Component.getOwnerComponentFor(oController.getView()).runAsOwner(function(){
					sap.ui.core.mvc.View.create({
						definition: viewstringData,
						type: sap.ui.core.mvc.ViewType.XML,
						height: "100%"
					}).then(function (oDetailView) {

						oController.getView().setModel(oModel);
//						oController.readPath(entitySet,sPath);
						oDetailView.bindElement(sPath);
						oController.getView().getContent()[0].addContent(oDetailView);
						oController.setNavigationTypeForTable(oDetailView);
						viewModel.setProperty("/fromSummaryGroup",false);
						//for collapsing the header of first column
						var flexColumnLayout = oController.getView();
						while(!(flexColumnLayout instanceof sap.f.FlexibleColumnLayout)){
							flexColumnLayout = flexColumnLayout.getParent();
						}
						var objpageLayout = flexColumnLayout.getCurrentBeginColumnPage().getContent()[0].getContent()[0].getContent()[0].getContent()[0];
						if(objpageLayout._bHeaderExpanded){
							objpageLayout._handleDynamicTitlePress();
						}
						if(filterEntityNotExist){
							oController.refreshTableEntitiesData();
						}
						setTimeout(function(){
							var sControlId = oController.getView().getContent()[0].getContent()[0].getContent()[0].getContent()[0].getId();
							$("#" + sControlId + "-spacer").css({"display": "none"});
							$("#" + sControlId).find(".sapUiLoSplitterBar").addClass("vistex-display-none");
							if(viewModel.getProperty("/selectedParentItemId")){
								$("#" + viewModel.getProperty("/selectedParentItemId")).addClass("vistexSelectedItemColor");
								$("#" + viewModel.getProperty("/selectedParentItemId") + "-sub").addClass("vistexSelectedItemColor");
								$("[data-sap-ui-related="+viewModel.getProperty("/selectedParentItemId")+"]").addClass("vistexSelectedItemColor");
							}
						},500);
//						if(sPath.indexOf("_PRX") !== -1){
//							oModel.read("/" + hierarchyModel.getProperty("/actualRootEntity") + "(" + sPath.split("(")[1],{
//								_refresh: true
//							});
//						}	
//						setTimeout(function(){
//							oController.getView().getContent()[0].getContent()[0].getContent()[0]._expandHeader(true);
//						},200);
						
//						sap.ui.core.BusyIndicator.hide();
					});
				});
				}
				});
			});

		},
		prepareCurrentNode: function(sPath, sTitle){
			var oController = this;
			var selectedPaths = {};
			if(sPath.startsWith("/")) {
				selectedPaths.entity = sPath.substring(1,sPath.indexOf("("));	
			}else{
				selectedPaths.entity = sPath.split("(")[0];								
			}
			selectedPaths.key = sPath.split("(")[1].substr(0,sPath.split("(")[1].length-1);
			selectedPaths.path = sPath;
//			selectedPaths.route = viewModel.getProperty("/NextRoute");
			
			// Changes for BreadCrumb when keys are different
			selectedPaths.titleValue = sTitle;
			
			selectedPaths.route = "DetailDetail";
			selectedPaths.node = undefined;
			selectedPaths.level = oController.level;
			return selectedPaths;
		}
	});

});