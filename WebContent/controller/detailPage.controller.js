sap.ui.define([
	"zvui/work/controller/BaseController",
	"sap/ui/core/routing/History",
	"sap/m/MessageBox",
	"sap/ui/core/Component",
	"sap/ui/core/XMLTemplateProcessor",
	"sap/ui/core/util/XMLPreprocessor",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageStrip"
	], function(Controller, History, MessageBox, Component, XMLTemplateProcessor, XMLPreprocessor,JSONModel, MessageToast,MessageStrip) {
	"use strict";

	return Controller.extend("zvui.work.controller.detailPage", {

		model: new sap.ui.model.json.JSONModel(),
		messageButtonId : 'messageButton',
		columnPosition: 'beginColumn',

		onBeforeRendering: function() {
		},
		onAfterRendering: function() {
			var oController = this;
//			Changes for Page generation from backend			
//				oController.getView().getContent()[0].getContent()[0]._getHeaderContent().fireEvent(sap.uxap.ObjectPageLayout.EVENTS.HEADER_VISUAL_INDICATOR_PRESS);
			if(oController.getView().getContent()[0].getContent()[0]._bHeaderExpanded){
				oController.getView().getContent()[0].getContent()[0]._handleDynamicTitlePress();
			}
			
			oController.getView().getContent()[0].getContent()[0].getFooter().onAfterRendering= function(oEvent){
				if(this.getVisible()){
					this.getParent()._$footerWrapper.removeClass("vistexHideFooterWrapper");
				}	
			}
			if(!oController.getView().getContent()[0].getContent()[0].getFooter().getVisible()){
				oController.getView().getContent()[0].getContent()[0]._$footerWrapper.addClass("vistexHideFooterWrapper");
			}
//			oController.getView().getContent()[0].getSections()[0].getSubSections()[0].getBlocks()[0].insertContent(new sap.m.MessageStrip({text: "Information", type:"Information"}));
		},
		onInit: function() {
			var oController = this;
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var uiModel = oController.getView().getModel("ui");			
			viewModel.setProperty("/enableMultiedit",false);
			viewModel.setProperty("/showingSideContent",false);
			viewModel.setProperty("/showDscApply",false);
			viewModel.setProperty("/tableType","ResponsiveTable");
			viewModel.setProperty("/DetailshowHideDsc",false);
			viewModel.setProperty("/DetailDetailshowHideDsc",false);
			viewModel.setProperty("/CompactMode",true);

//			oController.getOwnerComponent().getModel("ui").setProperty("/msgVisible",false);
//			oController.getOwnerComponent().getModel("ui").setProperty("/editable",true);

			var bundle=oController.getOwnerComponent().getModel("i18n").getResourceBundle();
			if(sap.ui.getCore().byId("backBtn")){
				sap.ui.getCore().byId("backBtn").attachPress(function(){
					if(viewModel.getProperty("/insideWorkspaceApp")){
						window.launchpadBackTriggered = true 
					}
				});
			}
			$('#shell-header-logo').click(function(){
				window.launchpadHomeButtonClicked = true 
		    });
//				sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction = function() {
//					var modelChanged = viewModel.getProperty("/modelChanged");
//					var currentRoute = viewModel.getProperty("/currentRoute");
//					if(currentRoute == "Detail" || currentRoute == "DetailDetail"){
//						if(modelChanged) {
//							history.go(-1);
//							MessageBox.confirm(bundle.getText('BACKTOWORKSPACE'), {
//								title: bundle.getText('CONFIRM'),                                  
//								actions: [MessageBox.Action.YES, MessageBox.Action.NO],
//								onClose: function (oAction) {
//									if (oAction == 'YES'){
//										oController.onDiscard();
//										history.go(-1);
//									}else{
//										viewModel.setProperty("/preventHashChange",true);
//										oController.noBackPlease();
//									}
//								}
//							});
//						}else{
//							oController.onDiscard();
//							history.go(-1);
//						}
//					}else{
//						oController.onDiscard();
//						history.go(-1);
//					}
//				}
//			}
			document.onmouseover = function() {
				//User's mouse is inside the page.
				window.innerDocClick = true;
			}
			document.onmouseleave = function() {
				//User's mouse has left the page.
				window.innerDocClick = false;
			}
			window.onhashchange = function() {
				if(viewModel.getProperty("/insideWorkspaceApp")){
					var currentRoute = viewModel.getProperty("/currentRoute");
					if(!viewModel.getProperty("/preventHashChange")){
						if (window.innerDocClick != false && !window.launchpadBackTriggered) {
							window.innerDocClick = false;
						} else {
							//Browser back button was clicked							
							var modelChanged = viewModel.getProperty("/modelChanged");
							var currentRoute = viewModel.getProperty("/currentRoute");
							if(currentRoute == "Detail" && !viewModel.getProperty("/detaildetailRoute")){
								if(modelChanged) {
	//								if(viewModel.getProperty("/backbuttonPressedView") !== "DetailDetail"){
									MessageBox.confirm(bundle.getText('BACKTOWORKSPACE'), {
										title: bundle.getText('CONFIRM'),                                  
										actions: [MessageBox.Action.YES, MessageBox.Action.NO],
										onClose: function (oAction) {
											if (oAction == 'YES'){
												if(window.launchpadBackTriggered && viewModel.getProperty("/fromWorklist")){										
													var urlParameters = {};
													var oModel = oController.getView().getModel();
													var oMetaModel = oModel.getMetaModel();
													viewModel.setProperty("/cancelNotRequiredonExit",true);	
													console.log("Hash Change Cancel triggered 1");
													oModel.callFunction("/CANCEL", {
														method: "POST",
														urlParameters: urlParameters,
														success : function(oData,response) {
														},
														error : function(oData,response){
														}
													});
											    }else{
											    	oController.onDiscard();
											    }
												history.go(-1);
											}else{
												oController.noBackPlease();
												sap.ui.core.BusyIndicator.hide();
											}
										}
									});
	//								}else{
	//								oController.noBackPlease();
	//								}
								}else{
									if(window.launchpadBackTriggered && viewModel.getProperty("/fromWorklist")){										
										var urlParameters = {};
										var oModel = oController.getView().getModel();
										var oMetaModel = oModel.getMetaModel();
										viewModel.setProperty("/cancelNotRequiredonExit",true);
										urlParameters["infocus_clear"] = true;
										console.log("Hash Change Cancel triggered 2");
										oModel.callFunction("/CANCEL", {
											method: "POST",
											urlParameters: urlParameters,
											success : function(oData,response) {
											},
											error : function(oData,response){
											}
										});
//										if(oModel.sServiceUrl){
//											var url = oModel.sServiceUrl + '?sap-sessioncmd=close';
//											if ("sendBeacon" in navigator) {
//												navigator.sendBeacon(url);
//											}else{
//												$.ajax({
//													url: url,
//													async: false
//												});
//											}
//										}
								    }
								}	
							}else if(currentRoute == "Detail" && viewModel.getProperty("/detaildetailRoute") && modelChanged){
								oController.noBackPlease();
							}else if(currentRoute == "Worklist"){
								viewModel.setProperty("/fromSaveBackActionRequired",true);
								oController.onDiscard();
							}

							if(window.launchpadBackTriggered){
								window.launchpadBackTriggered = false;
							}
						}
					}else{
						viewModel.setProperty("/preventHashChange",false);
					}
					if(viewModel.getProperty("/detaildetailRoute") && currentRoute == "Detail"){
						viewModel.setProperty("/detaildetailRoute",false);
						viewModel.setProperty("/drilldown",false);
						oController.setToolbarButtonVisibility();
					}
				}
			}
			
			window.onbeforeunload = function(){
				if(viewModel.getProperty("/insideWorkspaceApp")){
					oController.onExit();
				}
			}
		},
		onExit: function() {
			var oController = this;
//			if(sap.ui.getCore().byId("backBtn"))
//				sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction = oController.fBackButton;

			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var urlParameters = {};

			if(viewModel.getProperty("/pageDestroyFromCreateView")){
				viewModel.setProperty("/pageDestroyFromCreateView",false);
				return;
			}
			if(!viewModel.getProperty("/cancelNotRequiredonExit")){
				var functionImport = oMetaModel.getODataFunctionImport('CANCEL');
				if(functionImport && functionImport.parameter){
					var length = functionImport.parameter.length;
				}
				if(length > 0){
					var object = oController.getView().getBindingContext().getObject();
					for(var i=0; i < length; i++){
						urlParameters[functionImport.parameter[i].name] = object[functionImport.parameter[i].name];
					}
				}
//			var currentSectionId = oController.getView().getContent()[0].getSelectedSection();
//			var currentSection = oController.getView().byId(currentSectionId);
//			var dynamicSideContent = currentSection.getSubSections()[0].getBlocks()[0].getContent()[0];
//			var sections = oController.getView().getContent()[0].getSections();
				console.log("Detail Page Controller Exit triggered");
				urlParameters["infocus_clear"] = true;
				oModel.callFunction("/CANCEL", {
					method: "POST",
					urlParameters: urlParameters
				});
			}
//			if(oModel.sServiceUrl){
//				var url = oModel.sServiceUrl + '?sap-sessioncmd=close';
//				if ("sendBeacon" in navigator) {
//					navigator.sendBeacon(url);
//				}else{
//					$.ajax({
//						url: url,
//						async: false
//					});
//				}
//			}
		},
		onBackToSearch: function() {
			var sPreviousHash = History.getInstance().getPreviousHash();
			if (sPreviousHash !== undefined) {
				history.go(-1);
			} else {
				this.getOwnerComponent().getRouter().navTo("Worklist", {}, true);
			}
		},

		onCollapse: function() {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var uiModel = oController.getView().getModel("ui");
			viewModel.setProperty("/layout", "MidColumnFullScreen");
			uiModel.setProperty("/showExpand", false);
			this._updateUIElements();
		},
		onExpand: function() {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var uiModel = oController.getView().getModel("ui");
			viewModel.setProperty("/layout", "TwoColumnsMidExpanded");
			uiModel.setProperty("/showExpand", true);
			this._updateUIElements();
		},
		onhandleClose: function(oEvent){
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			history.go(-1);
			this._updateUIElements();
		},

//		onShowDsc: function(oEvent){
//			var oController = this;
//			var viewModel = oController.getView().getModel("viewModel");
//			var oModel = oController.getView().getModel();
//			var oMetaModel = oModel.getMetaModel();
////			var currentSectionId = oEvent.getSource().getParent().getParent().getSelectedSection();
////			var dynamicSideContent = oController.getView().byId(currentSectionId).getSubSections()[0].getBlocks()[0].getContent()[0];
//			var dynamicSideContent = oController.getDynamicSideContent(oEvent.getSource());
//			var mainContentTable = dynamicSideContent.getMainContent()[1].getTable();
//			if(mainContentTable.getItems){
//				_.each(mainContentTable.getItems(),function(item){
//					item.setType("Navigation");
//				});
//			}
//			var sEntitySet = mainContentTable.getParent().getEntitySet();
//			var entity = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet).entityType);
//			var selectedPath;
//			if(mainContentTable.getRows){
//				selectedPath = mainContentTable.getRows()[0].getBindingContext().getPath();
//				mainContentTable.setSelectedIndex(0);
//			}else{
//				selectedPath = mainContentTable.getVisibleItems()[0].getBindingContextPath();
//				mainContentTable.setSelectedItem(mainContentTable.getVisibleItems()[0]);
//			}
//			dynamicSideContent.setShowSideContent(true);
//			oController.prepareSideContentData(entity, selectedPath, dynamicSideContent, sEntitySet, mainContentTable.getParent());
//			viewModel.setProperty("/showingSideContent",true);
//		},

		onTableDrilldownNavigationClick : function(oEvent){
			var oController = this;
			var oSource = oEvent.getSource();
			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");
			var bundle = oController.getOwnerComponent().getModel("i18n").getResourceBundle();
			var oSmartTable = oController.getSmartTableControl(oSource);
			var oTable = oSmartTable.getTable();
			sap.ui.core.BusyIndicator.show(0);
			
			var oSelected;
			viewModel.setProperty("/DetailPageSet",false);
			if(oEvent.getParameter("listItem")){
				oSelected = oEvent.getParameter("listItem");
//				viewModel.setProperty("/DetailDetailTitle",oEvent.getParameter("listItem").getCells()[0].getText());
				oTable.$().find(".vistexSelectedItemColor").removeClass("vistexSelectedItemColor");
				viewModel.setProperty("/selectedParentItemId", oEvent.getParameter("listItem").getId());
			}else if(oEvent.getParameter("row")){
				oSelected = oEvent.getParameter("row");
				oTable.$().find(".vistexSelectedItemColor").removeClass("vistexSelectedItemColor");
				viewModel.setProperty("/selectedParentItemId", oEvent.getParameter("row").getId());
			}else{
				oSelected = oSource.getParent();
//				viewModel.setProperty("/DetailDetailTitle",oEvent.getSource().getText());
			}

			var sEntitySet = oSmartTable.getEntitySet();
			var oContext = oSelected.getBindingContext();
	
			viewModel.setProperty("/" + sEntitySet +"showSideContent",false);
			
			viewModel.setProperty("/DetailPageMainTablePath","/" + sEntitySet +"showSideContent");
			var oMetaModel = oModel.getMetaModel();
			var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet).entityType);
			if(oEntityType["com.sap.vocabularies.UI.v1.Facets"] == undefined )
				return;
			
			oController.removeTransientMessages();
			
			var errorMessages = oController.checkErrorMessageExist(oModel);
			if(errorMessages){
				oController.showMessagePopover(oController.messageButtonId);
				return;
			}else{
//				if(oTable.setSelectedIndex) {
//					oTable.setSelectedIndex(oSelected.getIndex());
//				}else{
//					oTable.removeSelections()
//					oTable.setSelectedItem(oSelected);	
//				}
				if(oEntityType["vui.bodc.workspace.SummaryGroup"]){
					var oObject = oContext.getObject();
					var modelChanged = viewModel.getProperty("/modelChanged");
					if(modelChanged && oController.selectedSumry != oObject.sumry){
						MessageBox.confirm(bundle.getText('BACKTOWORKSPACE'), {
							title: bundle.getText('CONFIRM'),                                  
							actions: [MessageBox.Action.YES, MessageBox.Action.NO],
							onClose: function (oAction) {
								if (oAction == 'YES'){
									var oObject = oContext.getObject();
									oController.selectedSumry = oObject.sumry;
									viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete",true);
									oController.hidingToolbarContentOnDrilldow(oSmartTable);									
									var newPath = oObject.sectn + "_PRX(row_id='" + encodeURI(oObject.row_id) + "')"; 
//									oController.onDrillDown(sEntitySet,oContext,oSmartTable,oSelected,newPath);
									oController.drilldownToSumry = [sEntitySet,oContext,oSmartTable,oSelected,newPath];
									oController.onDiscard();
									var actualRootEntity = viewModel.getProperty("/actualRootEntities");
									if(!actualRootEntity){
										actualRootEntity = {};
										viewModel.setProperty("/actualRootEntity",actualRootEntity);
									}
									actualRootEntity[oObject.sectn + "_PRX"] = sEntitySet;
									viewModel.setProperty("/actualRootEntity",actualRootEntity);
									viewModel.setProperty("/fromSummaryGroup",true);
								}else{
									sap.ui.core.BusyIndicator.hide();
								}
							}
						});
					}else{
						oController.selectedSumry = oObject.sumry;
						oController.hidingToolbarContentOnDrilldow(oSmartTable);
						viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete",true);
						var newPath = oObject.sectn + "_PRX(row_id='" + encodeURI(oObject.row_id) + "')"; 
						oController.onDrillDown(sEntitySet,oContext,oSmartTable,oSelected,newPath);	
						var actualRootEntity = viewModel.getProperty("/actualRootEntities");
						if(!actualRootEntity){
							actualRootEntity = {};
							viewModel.setProperty("/actualRootEntity",actualRootEntity);
						}
						actualRootEntity[oObject.sectn + "_PRX"] = sEntitySet;
						viewModel.setProperty("/actualRootEntity",actualRootEntity);
						viewModel.setProperty("/fromSummaryGroup",true);						
					}
				}else{
					oController.hidingToolbarContentOnDrilldow(oSmartTable);
					viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete",true);
					viewModel.setProperty("/fromSummaryGroup",false);
					var facet = oEntityType["com.sap.vocabularies.UI.v1.Facets"].find(function(facet){
						return facet.TabControl.String.indexOf("_prx") !== -1
					});
					
					if(facet){
						var oObject = oContext.getObject();
						var newPath = facet.Target.AnnotationPath.split("/@")[0].slice(3) + "(row_id='" + encodeURI(oObject.row_id) + "')"; 
						oController.onDrillDown(sEntitySet,oContext,oSmartTable,oSelected,newPath);
						var actualRootEntity = viewModel.getProperty("/actualRootEntities");
						if(!actualRootEntity){
							actualRootEntity = {};
							viewModel.setProperty("/actualRootEntity",actualRootEntity);
						}
						actualRootEntity[facet.Target.AnnotationPath.split("/@")[0].slice(3)] = sEntitySet;
						viewModel.setProperty("/actualRootEntity",actualRootEntity);						
					}else{
						oController.onDrillDown(sEntitySet,oContext,oSmartTable,oSelected);
					}
				}
			}
		},
		
		onDrillDown : function(sEntitySet,oContext,oSmartTable,oSelected, summaryPath){
			var oController = this;

			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var sPath = oContext.getPath();
			var object = oContext.getObject();
			var modelChanged = viewModel.getProperty("/modelChanged");
			oModel.invalidateEntry(sPath);	
			sPath = sPath.substr(1, sPath.length);
			viewModel.setProperty("/sectionPopover",{open: false});
			var navigationPath = "";
			if(summaryPath){
				navigationPath = summaryPath;
			}else{
				navigationPath = sPath;
			}
			
			var oRouter = oController.getOwnerComponent().getRouter();
			var previousHash = oRouter.getHashChanger().getHash();
			if(previousHash){
				var aHash = previousHash.split('/')
				if(aHash.length > 2){
					var sPreviousPath = aHash[2];
					if(sPreviousPath == navigationPath){
						viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete",false);
						sap.ui.core.BusyIndicator.hide();
						return;
					}
				}
			}

			var functionImport = oMetaModel.getODataFunctionImport(sEntitySet + "_EXPAND");
			var urlParameters = {};								
			urlParameters["_row_id"] = object.row_id;
//			var dynamicSideContent = oController.getDynamicSideContent(oSmartTable);
			var dynamicSideContent = oController.getResponsiveSplitter(oSmartTable);
			var bundle=oController.getOwnerComponent().getModel("i18n").getResourceBundle();
			
//			if(viewModel.getProperty("/currentRoute") == "DetailDetail" && modelChanged){
//				MessageBox.confirm(bundle.getText('CHANGESLOSTCONTINUE'), {
//					title: bundle.getText('CONFIRM'),                                  
//					actions: [MessageBox.Action.YES, MessageBox.Action.NO],
//					onClose: function (oAction) {
//						if (oAction == 'YES'){
//							oController.onDiscard();
//							setTimeout(function(){
//							oController.onDrillDownProceed(oSmartTable, dynamicSideContent, navigationPath, functionImport, urlParameters, oContext, oSelected);
//							},10);
//						}else{
//							sap.ui.core.BusyIndicator.hide();
//						}
//					}
//				});
//			}else{
				oController.onDrillDownProceed(oSmartTable, dynamicSideContent, navigationPath, functionImport, urlParameters, oContext, oSelected);
//			}

		},
		
		onDrillDownProceed: function(oSmartTable, dynamicSideContent, navigationPath, functionImport, urlParameters, oContext, oSelected){
			var oController = this;

			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var uiModel = oController.getView().getModel("ui");	
			var oRouter = oController.getOwnerComponent().getRouter();
			var oTable = oSmartTable.getTable();
			
//			if(oTable.setSelectedIndex) {
//				oTable.setSelectedIndex(oSelected.getIndex());
//			}else{
////				oTable.removeSelections()
//				oTable.setSelectedItem(oSelected);	
//			}	

			oModel.callFunction("/" + functionImport.name, {
				method: "POST",
				urlParameters: urlParameters,
				success : function(oData,response) {

					viewModel.setProperty("/nextUiState",1);
					var oModel = oContext.getModel();
					var rowCount = oSmartTable._getRowCount();
					viewModel.setProperty("/DetailPageMaxRows",rowCount);					
					viewModel.setProperty("/disableBulkEdit",true);
					oController.onClosingDscSideContent(dynamicSideContent);
					oController.removenoBackHash();
					setTimeout(function(){
						var level = 0;
						viewModel.setProperty("/fromDetailDrilldown",true);
						viewModel.setProperty("/preventHashChange",true);						
						if(oController.getView().getContent()[0]._bHeaderExpanded){
							oController.getView().getContent()[0]._handleDynamicTitlePress();
						}
						var replaceNavPath = false;
						var currentRoute = viewModel.getProperty("/currentRoute");
						if(currentRoute == "DetailDetail"){
							replaceNavPath = true;
						}
//						if(viewModel.getProperty("/currentDetailPageLevel") !== undefined &&
//								viewModel.getProperty("/currentRoute") !== "Detail"){
//							level = viewModel.getProperty("/currentDetailPageLevel");
//							level++;
//						}else{
//							
							viewModel.setProperty("/fromDetailDrilldown",true);
//						}
						oRouter.navTo("DetailDetail", {
							path: viewModel.getProperty("/navigationPath"),
							path1 : navigationPath,
							level: level
						}, replaceNavPath);
						if(!viewModel.getProperty("/enableFlexColumn")){
							uiModel.setProperty("/showExpand", true);
							viewModel.setProperty("/layout", "MidColumnFullScreen");
							oController._updateUIElements();
						}else{
							uiModel.setProperty("/showExpand", false);
						}
						
					}, 100);
				},
				error : function(oData,response){
					setTimeout(function(){
						oController.showMessagePopover(oController.messageButtonId);
					}, 1000);
				}					
			});		
		},

		onItemPress: function(oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = this.getView().getModel("viewModel");
			var oSource = oEvent.getSource();
			var oSmartTable = oController.getSmartTableControl(oSource);
			var sEntitySet = oSmartTable.getEntitySet();
			var showingSideContent = viewModel.getProperty("/" + sEntitySet + "showingSideContent");
//			var oUpdatable;
//			
//			if(oMetaModel.getODataEntitySet(sEntitySet)["Org.OData.Capabilities.V1.UpdateRestrictions"]){
//				oUpdatable = oMetaModel.getODataEntitySet(sEntitySet)["Org.OData.Capabilities.V1.UpdateRestrictions"].Updatable.Bool;
//			}
//			
//			var navigateAction = viewModel.getProperty("/navigateAction_" + sEntitySet);
//			
//			if(navigateAction !== "child" && (!oUpdatable || oUpdatable == "true")){
//			if(showingSideContent){
//				oController.onShowTableDSC(oEvent);
//			}else{
				oController.onCloseTableDSC(oEvent);
				oController.onTableDrilldownNavigationClick(oEvent);
//			}
//			var oModel = oController.getView().getModel();
//			var oMetaModel = oModel.getMetaModel();
//			var oSelected = oEvent.getParameter("listItem");
//			var oTable = oSelected.getParent();
//			var oSource = oEvent.getSource();
//			var viewModel = oController.getView().getModel("viewModel");
//
//			var oSmartTable = oController.getSmartTableControl(oSource);
//
//			var viewModel = oController.getView().getModel("viewModel");
//			var sEntitySet = oEvent.getSource().getParent().getEntitySet();
//			var showingSideContent = viewModel.getProperty("/" + sEntitySet + "showingSideContent");
//
//			oController.removeTransientMessages();
//			if(showingSideContent){
//				var dynamicSideContent = oController.getDynamicSideContent(oSmartTable);
//				var entity = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet).entityType);
//				var selectedPath = oSelected.getBindingContext().getPath();
//				oSmartTable.getTable().removeSelections();
//				oSmartTable.getTable().setSelectedItem(oSelected);
////				oController.prepareSideContentData(entity, selectedPath, dynamicSideContent, sEntitySet, oSmartTable);
//			}else{
//
//				var errorMessages = oController.checkErrorMessageExist(oModel);
//				if(errorMessages){
//					oController.showMessagePopover(oController.messageButtonId);
//					return;
//				}else{
//					var oContext = oSelected.getBindingContext();
//					oTable.removeSelections()
////					oTable.setSelectedItem(oSelected);			
//					oController.onDrillDown(sEntitySet,oContext,oSmartTable, oSelected);
//				}
//			}
		},

		onListNavigate: function(oEvent){
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = this.getView().getModel("viewModel");
			var oSource = oEvent.getSource();
			var oSmartTable = oController.getSmartTableControl(oSource);
			var sEntitySet = oSmartTable.getEntitySet();
			var showingSideContent = viewModel.getProperty("/" + sEntitySet + "showingSideContent");
//			var oUpdatable;
//			
//			if(oMetaModel.getODataEntitySet(sEntitySet)["Org.OData.Capabilities.V1.UpdateRestrictions"]){
//				oUpdatable = oMetaModel.getODataEntitySet(sEntitySet)["Org.OData.Capabilities.V1.UpdateRestrictions"].Updatable.Bool;
//			}
//			
//			var navigateAction = viewModel.getProperty("/navigateAction_" + sEntitySet);
//			
//			if(navigateAction !== "child" && (!oUpdatable || oUpdatable == "true")){
//			if(showingSideContent){
//				oController.onShowTableDSC(oEvent);
//			}else{
				oController.onCloseTableDSC(oEvent);
				oController.onTableDrilldownNavigationClick(oEvent);
//			}
//			var oModel = oController.getView().getModel();
//			var oSource = oEvent.getSource();
//			var viewModel = oController.getView().getModel("viewModel");
//
//			var oSmartTable = oController.getSmartTableControl(oSource);
//
//			var oSelected = oEvent.getParameter("row");
//			var viewModel = oController.getView().getModel("viewModel");
//			var sEntitySet = oEvent.getSource().getParent().getParent().getParent().getParent().getEntitySet();
//			var showingSideContent = viewModel.getProperty("/" + sEntitySet + "showingSideContent");
//
//			oController.removeTransientMessages();
//
//			var errorMessages = oController.checkErrorMessageExist(oModel);
//			if(showingSideContent){
//				var dynamicSideContent = oController.getDynamicSideContent(oSmartTable);
//				var entity = oModel.getMetaModel().getODataEntityType(oModel.getMetaModel().getODataEntitySet(sEntitySet).entityType);
//				var selectedPath = oSelected.getBindingContext().getPath();
//				oSmartTable.getTable().clearSelection();
//				oSmartTable.getTable().setSelectedIndex(oSelected.getIndex());
//				oController.prepareSideContentData(entity, selectedPath, dynamicSideContent, sEntitySet, oSmartTable);
//			}else{
//				if(errorMessages){
//					oController.showMessagePopover(oController.messageButtonId);
//					return;
//				}else{
//					var oContext = oSelected.getBindingContext();
////					oSelected.getParent().setSelectedIndex(oSelected.getIndex());
//					oController.onDrillDown(sEntitySet,oContext,oSmartTable,oSelected);
//				}
//			}
		},

//		prepareSideContentData: function(entity, selectedPath, dynamicSideContent, sEntitySet, oSmartTable){
//			var oController = this;
//			var oModel = oController.getView().getModel();
//			var oMetaModel = oModel.getMetaModel();
//			var viewModel = oController.getView().getModel("viewModel");
//
//			var urlParameters = {};	
//			urlParameters["_row_id"] = oModel.getProperty(selectedPath).row_id;
//			oModel.callFunction("/" + sEntitySet + "_LOCK", {
//				method: "POST",
//				batchGroupId: "changes",
//				urlParameters: urlParameters,
//				success : function(oData,response){
//					viewModel.setProperty("/drilldown",true);
//				},
//				error : function(oData,response){
//					setTimeout(function(){
//						oController.showMessagePopover(oController.messageButtonId);
//					}, 1000);
//				}
//			});
//			viewModel.setProperty("/showDscApply",false);
//			oModel.submitChanges({
//				batchGroupId: "changes",
//				success : function(oData,response) {
//					var tableData = [];
//					oModel.refresh();
//					_.each(entity["com.sap.vocabularies.UI.v1.LineItem"],function(item){
//						var cellProperties = _.find(entity["property"],{name: item.Value.Path});
//						tableData.push({"row1":cellProperties["com.sap.vocabularies.Common.v1.Label"].String, "field": cellProperties.name});
//					});
//					var sideContentTable = dynamicSideContent.getSideContent()[1].getContent()[0];
//					sideContentTable.bindElement(selectedPath);
//					var columnData =  [{"col":"row1","label":"Field"},{"col":"row2","label": "Value"}];
//					sideContentTable.bindAggregation("columns","viewModel>/columnData",function(sId,oContext){
//						var contextObject = oContext.getObject();
//						return new sap.m.Column({
//							header:new sap.m.Label({
//								text : contextObject["label"]
//							})
//						});
//					});
//					sideContentTable.bindAggregation("items","viewModel>/itemsData",function(sId,oContext){
//						var contextObject = oContext.getObject();
//						var fcat_data = viewModel.getProperty("/columnData");
//						var cells = [];
//						_.each(fcat_data,function(obj){
//							if(obj.col != "row1"){
//								var input = new sap.ui.comp.smartfield.SmartField({value: "{" + contextObject.field + "}"});
//								cells.push(input);
//							}else{
//								var text = new sap.m.Label({design: "Bold"}).bindProperty("text","viewModel" + ">" + obj["col"],null,sap.ui.model.BindingMode.OneWay);
//								cells.push(text);
//							}
//						});
//						return new sap.m.ColumnListItem({
//							cells: cells,
//							type: "Active",
//						}).addStyleClass("noPadding");
//					});
//					viewModel.setProperty("/columnData",columnData);
//					viewModel.setProperty("/itemsData",tableData);
//				},
//				error : function(oData,response){
//					setTimeout(function(){
//						oController.showMessagePopover(oController.messageButtonId);
//					}, 1000);
//					sap.ui.core.BusyIndicator.hide();
//				}					
//			});
//
//		},

		

//		onDscApply: function(oEvent){
//			var oController = this;
//			var oModel = oController.getView().getModel();
//			var oMetaModel = oModel.getMetaModel();
//			var viewModel = oController.getView().getModel("viewModel");
//			var oDynamicSideContent = oEvent.getSource().getParent().getParent();
//			var dscTable = oDynamicSideContent.getSideContent()[1].getContent()[0];
//			if(oDynamicSideContent.getMainContent()[1]){
//				var mainTable = oDynamicSideContent.getMainContent()[1].getTable();
//			}else
//				var mainTable = oDynamicSideContent.getMainContent()[0].getTable();
//			var selectAll, urlParameters = {}, selectedContext = [], rowIDs=[];
//			var entitySet = mainTable.getParent().getEntitySet();
//			var functionImport = oMetaModel.getODataFunctionImport(entitySet+"_BulkEditApply");
//			if(mainTable.getSelectedContexts){
//				selectedContexts = mainTable.getSelectedContexts();
//				if(mainTable.getVisibleItems().length == mainTable.getSelectedItems().length){
//					selectAll = true;
//				}
//			}else{
//				if(mainTable.getParent()._getRowCount() == mainTable.getSelectedIndices().length){
//					selectAll = true;
//				}
//			}
//			if(mainTable.getSelectedIndices){
//				var selectedIndices = mainTable.getSelectedIndices();
//				_.each(selectedIndices,function(index){
//					selectedContext.push(mainTable.getContextByIndex(index));
//				});
//			}else{
//				var selectedItems = mainTable.getSelectedItems();
//				_.each(selectedItems,function(item){
//					selectedContext.push(item.getBindingContext());
//				});
//			}
//			_.each(selectedContext,function(context){
//				var rowId = oModel.getProperty(context.getPath()).row_id;
//				rowIDs.push(rowId);
//			});
//			if(selectAll){
//				urlParameters["_selal"] = 'X';
//			}else{
//				urlParameters["_row_id"] = rowIDs.toString();
//			}
//
//			_.each(dscTable.getItems(),function(item){
//				var cell;
//				if(item.getCells()[1].getValue){
//					cell = item.getCells()[1];
//				}else{
//					cell = item.getCells()[1].getItems()[0];
//				}
//				var cellValue = cell.getValue()
//				var fieldPropertyName = cell.getCustomData()[1].getValue();
//				var dataType = cell.getCustomData()[0].getValue();
//				if(cellValue != "< Keep Existing Values >"){
//					if(cellValue == "< Leave Blank >" || cellValue == null){
//						switch(dataType){
//						case "Edm.String":
//							urlParameters[fieldPropertyName] = "";
//							break;
//						case "Edm.Boolean":
//							urlParameters[fieldPropertyName] = false;
//							break;
//						case "Edm.Byte":
//						case "Edm.Decimal":
//						case "Edm.Double":
//						case "Edm.Single" :
//						case "Edm.Int16":
//						case "Edm.Int32":
//						case "Edm.Int64":
//						case "Edm.SByte": 
//							urlParameters[fieldPropertyName] = 0;
////							var sUomPropertyName = oField.getUnitOfMeasurePropertyName();
////							if (oField.isComposite()) {
////							urlParameters[sUomPropertyName] = "";
////							}
//							break;
//						case "Edm.DateTime" :
//							urlParameters[fieldPropertyName] = new Date(0);
//							break;
//						default:
//							urlParameters[fieldPropertyName] = "";
//						break;
//						}			
//					}else{
//						urlParameters[fieldPropertyName] = cellValue;
//						if(cell.getCustomData()[2]){
//							if(item.getCells()[1].getItems()[1].getValue() == ("< Keep Existing Values >" || "< Leave Blank >" || null)){
//								urlParameters[cell.getCustomData()[2].getValue()] = "";
//							}else
//								urlParameters[cell.getCustomData()[2].getValue()] = item.getCells()[1].getItems()[1].getValue();
//						}
//					}
//				} 
//			});
//
//			oModel.callFunction("/"+entitySet+"_BulkEditApply", {
//				method: "POST",
//				batchGroupId: "changes",
//				urlParameters: urlParameters,
//			});
//			oModel.submitChanges({
//				batchGroupId: "changes",
//				success : function(oData,response) {
//					oModel.refresh(true);
//					oController.onClosingDscSideContent(oDynamicSideContent);
//				},
//				error : function(oData,response){
//					setTimeout(function(){
//						oController.showMessagePopover(oController.messageButtonId);
//					}, 1000);
////					sap.ui.core.BusyIndicator.hide();
//				}
//			});
//		},

		onRowEdit : function(oEvent){
			var oController = this;
			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");

			var oRow = oEvent.getParameter("row");
//			sap.ui.core.BusyIndicator.show(0);

			var oSmartTable = oRow.getParent().getParent(); 
			var sEntitySet = oSmartTable.getEntitySet();
			oController.removeTransientMessages();

			var errorMessages = oController.checkErrorMessageExist(oModel);
			if(errorMessages){
				oController.showMessagePopover(oController.messageButtonId);
				return;
			}else{
				var oContext = oRow.getBindingContext();
				var object = oContext.getObject();

				var oMetaModel = oModel.getMetaModel();

				var functionImport = oMetaModel.getODataFunctionImport(sEntitySet + "_LOCK");

				var urlParameters = {};								
				urlParameters["_row_id"] = object.row_id;

				oModel.callFunction("/" + functionImport.name, {
					method: "POST",
					batchGroupId: "changes",
					urlParameters: urlParameters
				});
				oModel.submitChanges({
					batchGroupId: "changes",
					success : function(oData,response) {
//						sap.ui.core.BusyIndicator.hide();\
						oModel.read(oContext.getPath());
						var messageExists = oController.checkResponseForMessages(oData,response);
						if(messageExists){
							setTimeout(function(){
								oController.showMessagePopover(oController.messageButtonId);
							}, 1000);
						}
					},
					error : function(oData,response){
//						sap.ui.core.BusyIndicator.hide();
						setTimeout(function(){
							oController.showMessagePopover(oController.messageButtonId);
						}, 1000);
					}					
				});				
			}
		},

		onResponsiveAddToFilter: function(oEvent){
			var oController = this;
			var oContext = oEvent.getSource().getParent().getBindingContext();
			var oSmartTable = oController.getSmartTableControl(oEvent.getSource());
			oController.addToFilter(oContext,oSmartTable);
		},

		onAddFilter : function(oEvent) {
			var oController = this;
			var oRow = oEvent.getParameter("row");

			var oSmartTable = oRow.getParent().getParent(); 
			var oContext = oRow.getBindingContext();

			oController.addToFilter(oContext,oSmartTable);
		},

		addToFilter: function(oContext,oSmartTable){
			var oController = this;
			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");

			oController.removeTransientMessages();

			var errorMessages = oController.checkErrorMessageExist(oModel);
			if(errorMessages){
				oController.showMessagePopover(oController.messageButtonId);
				return;
			}else{

				var object = oContext.getObject();

				var oMetaModel = oModel.getMetaModel();

				var sEntitySet = oSmartTable.getEntitySet();

				var functionImport = oMetaModel.getODataFunctionImport(sEntitySet + "_ADD_FILTER");

				var urlParameters = {};								
				urlParameters["_row_id"] = object.row_id;

				oModel.callFunction("/" + functionImport.name, {
					method: "POST",
					batchGroupId: "changes",
					urlParameters: urlParameters
				});
				oModel.submitChanges({
					batchGroupId: "changes",
					success : function(oData,response) {
						oModel.refresh();

						var entst = "";
						if(oData && oData.__batchResponses && oData.__batchResponses.length > 0 ) {
							for( var i = 0; i < oData.__batchResponses.length; i++){
								if(oData.__batchResponses[i].__changeResponses && oData.__batchResponses[i].__changeResponses.length){
									for( var j = 0; j < oData.__batchResponses[i].__changeResponses.length; j++){
										if(oData.__batchResponses[i].__changeResponses[j].data) {
											entst = oData.__batchResponses[i].__changeResponses[j].data.entst;
											break;
										}
									}
								}
								if(entst != "")
									break;
							}
							if(entst != "") {
								var aChildEntities = entst.split(",");
								oController.addMessageStrip(aChildEntities,oSmartTable);
							}
						}
					},
					error : function(oData,response){
//						sap.ui.core.BusyIndicator.hide();
						setTimeout(function(){
							oController.showMessagePopover(oController.messageButtonId);
						}, 1000);
					}					
				});				
			}
		},

		addMessageStrip : function(aChildEntities,oSmartTable) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");

			var aDocumentFilters = viewModel.getProperty("/aDocFilters");
			if(aDocumentFilters == null)
				aDocumentFilters = [];

			var entitySet = oSmartTable.getEntitySet();
			var oDocFilter = _.findWhere(aDocumentFilters, { entitySet : entitySet});

			var sChildEntitiesLabel = "";
			var oBundle = this.getView().getModel("i18n").getResourceBundle();

			if(oDocFilter == null || oDocFilter == undefined) {
				oDocFilter = {};
				oDocFilter.entitySet = entitySet;
				oDocFilter.children = [];

				var oSubSection = oSmartTable.getParent();
				while(true){
					if(oController.isControlOfType(oSubSection,"sap/uxap/ObjectPageSubSection"))
						break;
					else
						oSubSection = oSubSection.getParent();
				}
				var sParentLabel = oSubSection.data("Label");

				var aSections;
				var oObjectPageLayout = oController.getView().getContent()[0];
				while(true){
					if(oObjectPageLayout.getSections){
						aSections = oObjectPageLayout.getSections();
						break;
					}else{
						oObjectPageLayout = oObjectPageLayout.getContent()[0];
					}
				}

				_.each(aSections,function(oSection){
					_.each(oSection.getSubSections(),function(oSubSection){
						var oBlock = oSubSection.getBlocks()[0];
						_.each(oBlock.getContent(),function(oControl){
							if(oController.isControlOfType(oControl, "sap/ui/layout/DynamicSideContent")){
								var aMainContent = oControl.getMainContent();
								for( var y = 0; y < aMainContent.length; y++){
									if(oController.isSmartTable(aMainContent[y])) {
										var index = _.indexOf(aChildEntities , aMainContent[y].getEntitySet());
										if(index != -1){
											var sectionLabel = oSubSection.data("Label");
											var text = oBundle.getText("sectionFilteredByParent", [sectionLabel,sParentLabel]);
											if(sChildEntitiesLabel == "")
												sChildEntitiesLabel = sectionLabel;
											else
												sChildEntitiesLabel = sChildEntitiesLabel + "/" +sectionLabel;

											oDocFilter.children.push({
												entitySet:aMainContent[y].getEntitySet(),
												text : text,
												label : sectionLabel
											});
										}
									}
								}
							}else if(oController.isControlOfType(oControl, "sap/ui/layout/ResponsiveSplitter")){
								var aMainContent = oControl.getRootPaneContainer().getPanes()[0].getContent().getContent()[0].getContent();
								for( var y = 0; y < aMainContent.length; y++){
									if(oController.isSmartTable(aMainContent[y])) {
										var index = _.indexOf(aChildEntities , aMainContent[y].getEntitySet());
										if(index != -1){
											var sectionLabel = oSubSection.data("Label");
											var text = oBundle.getText("sectionFilteredByParent", [sectionLabel,sParentLabel]);
											if(sChildEntitiesLabel == "")
												sChildEntitiesLabel = sectionLabel;
											else
												sChildEntitiesLabel = sChildEntitiesLabel + "/" +sectionLabel;

											oDocFilter.children.push({
												entitySet:aMainContent[y].getEntitySet(),
												text : text,
												label : sectionLabel
											});
										}
									}
								}
							}else if(oController.isSmartTable(oControl)) {
								var index = _.indexOf(aChildEntities , oControl.getEntitySet());
								if(index != -1){
									var sectionLabel = oSubSection.data("Label");
									var text = oBundle.getText("sectionFilteredByParent", [sectionLabel,sParentLabel]);
									if(sChildEntitiesLabel == "")
										sChildEntitiesLabel = sectionLabel;
									else
										sChildEntitiesLabel = sChildEntitiesLabel + "/" +sectionLabel;

									oDocFilter.children.push({
										entitySet:oControl.getEntitySet(),
										text : text,
										label : sectionLabel
									});
								}
							}
						});
					});
				});
				aDocumentFilters.push(oDocFilter);
				viewModel.setProperty("/aDocFilters",aDocumentFilters);
				viewModel.setProperty("/aDocFiltersLength",aDocumentFilters.length);
			}else{
				for(var i = 0; i < oDocFilter.children.length;i++){
					if(sChildEntitiesLabel == "")
						sChildEntitiesLabel = oDocFilter.children[i].label;
					else
						sChildEntitiesLabel = sChildEntitiesLabel + "/" + oDocFilter.children[i].label;
				}
			}
			var message = oBundle.getText("additionalFilterApplied", [sChildEntitiesLabel]);
			MessageToast.show(message);
		},

		onCancel: function(oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var modelChanged = viewModel.getProperty("/modelChanged");

			if(modelChanged) {
				var DiscardButton = new sap.m.Button({
					text: "{i18n>DISCARD}",
					width: "120px",
					press: [oController.onDiscard,oController]
				});
				var DiscardChangesText = new sap.m.Text({
					text:"{i18n>DISCARDCHANGES}"
				});
				var cancelPopover = new sap.m.Popover({
					showHeader: false,
					contentWidth: "150px",
					contentHeight: "60px",
					content: [new sap.m.VBox({
						alignItems: "Center",		
						alignContent: "Center",
						items: [DiscardChangesText,DiscardButton]
					})
					],
					placement: "Top"
				});
				oController.getView().addDependent(cancelPopover);
				cancelPopover.openBy(oEvent.getSource());
			}else{
				oController.onDiscard();
			}
		},
		onDiscard: function(oEvent){
			var oController = this;
			sap.ui.core.BusyIndicator.show(0);
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");

			var urlParameters = {};

			var functionImport = oMetaModel.getODataFunctionImport('CANCEL');
			if(functionImport && functionImport.parameter){
				var length = functionImport.parameter.length;
			}
			if(length > 0){
				var object = oController.getView().getBindingContext().getObject();
				for(var i=0; i < length; i++){
					urlParameters[functionImport.parameter[i].name] = object[functionImport.parameter[i].name];
				}
			}
//			var currentSectionId = oController.getView().getContent()[0].getSelectedSection();
//			var currentSection = oController.getView().byId(currentSectionId);
//			var dynamicSideContent = currentSection.getSubSections()[0].getBlocks()[0].getContent()[0];
			if(viewModel.getProperty("/notesChangedPaths") && viewModel.getProperty("/notesChangedPaths").length > 0){
				_.each(viewModel.getProperty("/notesChangedPaths"),function(path){
					oModel.setProperty(path + "/updkz","");
				})
			}
			viewModel.setProperty("/notesChangedPaths",[]);
			oModel.callFunction("/CANCEL", {
				method: "POST",
				urlParameters: urlParameters,
				success : function(oData,response) {
					var uiModel = oController.getView().getModel("ui");
					var viewModel = oController.getView().getModel("viewModel");
					var sections = oController.getView().getContent()[0].getContent()[0].getSections();
//					uiModel.setProperty("/editable",false);
					viewModel.setProperty("/modelChanged",false);
					if(!oController.getView().getContent()[0].getContent()[0].getFooter().getVisible()){
						oController.getView().getContent()[0].getContent()[0]._$footerWrapper.addClass("vistexHideFooterWrapper");//for hiding footerWrapper
					}
					delete oController.correction_row_id;
					oController.removenoBackHash();
					_.each(sections, function(section){
						if(section.getSubSections()[0] && section.getSubSections()[0].getBlocks()[0] && 
								section.getSubSections()[0].getBlocks()[0]){
//							var dynamicSideContent = section.getSubSections()[0].getBlocks()[0].getContent()[0];
//							if(!dynamicSideContent.getMainContent){
//								dynamicSideContent = section.getSubSections()[0].getBlocks()[0].getContent()[1];
//							}
							var dynamicSideContent;
							if(oController.isControlOfType(section.getSubSections()[0].getBlocks()[0].getContent()[0], "sap/ui/layout/ResponsiveSplitter")){
								dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[0]);
							}else{
								dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[1]);
							}
							
							
							if(dynamicSideContent.getMainContent){
								oController.onClosingDscSideContent(dynamicSideContent);
								if(dynamicSideContent.getMainContent()[1]){
									var mainContentTable = dynamicSideContent.getMainContent()[1].getTable();
								}else{
									var mainContentTable = dynamicSideContent.getMainContent()[0].getTable();
								}
								if(mainContentTable.getRows){
									mainContentTable.clearSelection();
								}else{
									mainContentTable.removeSelections();
								}
								mainContentTable.getParent().invalidate();
								var sEntitySet = mainContentTable.getParent().getEntitySet();
								viewModel.setProperty("/addCorrectionLines" + sEntitySet, false);
								viewModel.setProperty("/" + sEntitySet + "showDscCorrectionLines",false);
//								oController.refreshSmartTable(mainContentTable.getParent());
							}
						}
					});
					if(!viewModel.getProperty("/fromSaveBackActionRequired")){
						oModel.invalidate();
						oModel.refresh();
//						oController.refreshTableEntitiesData();						
					}else{
						viewModel.setProperty("/fromSaveBackActionRequired",false);
					}					
					if(viewModel.getProperty("/fromSaveDNCMessage")){
						viewModel.setProperty("/fromSaveDNCMessage",false);
					}else{
						oController.removeMessages(oController);
					}
					if(oController.drilldownToSumry){
						setTimeout(function(){
							var arr = oController.drilldownToSumry;
							delete oController.drilldownToSumry;
							oController.onDrillDown(arr[0],arr[1],arr[2],arr[3],arr[4]);
						},200);						
					}
						
//					oController.onClosingDscSideContent(dynamicSideContent);
//					history.go(-1);
//					sap.ui.core.BusyIndicator.hide();
				},
				error : function(oData,response){
					sap.ui.core.BusyIndicator.hide();
					setTimeout(function(){
						oController.showMessagePopover(oController.messageButtonId);
					}, 1000);
				}
			});
		},

		onSave: function(oEvent){

			var oController = this;

			oController.removeTransientMessages();

			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var uiModel = oController.getView().getModel("ui");
			var viewModel = oController.getView().getModel("viewModel");
			var bundle=oController.getView().getModel("i18n").getResourceBundle();
			var urlParameters = {};
			var section = oController.getView().getContent()[0].getContent()[0]._oCurrentTabSection;
			var dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[0]);
			var oSmartTable = dynamicSideContent.getMainContent()[0]

			var errorMessages = oController.checkErrorMessageExist(oModel);
			if(errorMessages){
				sap.ui.core.BusyIndicator.hide();
				oController.showMessagePopover(oController.messageButtonId);
				return;
			}else{	
				var functionImportName = oEvent.getSource().data("FImport"); 
				var functionImport = oMetaModel.getODataFunctionImport(functionImportName);
				if(functionImport.parameter){
					var length = functionImport.parameter.length;
				}				
				if(length > 0){
					var object = oController.getView().getBindingContext().getObject();
					for(var i=0; i < length; i++){
						urlParameters[functionImport.parameter[i].name] = object[functionImport.parameter[i].name];
					}
				}
				if(viewModel.getProperty("/notesChangedPaths") && viewModel.getProperty("/notesChangedPaths").length > 0){
					_.each(viewModel.getProperty("/notesChangedPaths"),function(path){
						oModel.setProperty(path + "/updkz","");
					})
				}
				viewModel.setProperty("/notesChangedPaths",[]);
				
				if(functionImport["vui.bodc.workspace.ActionProperties"] && 
						   functionImport["vui.bodc.workspace.ActionProperties"]["ConfirmationPopup"] &&
						   functionImportName != "SAVE" && functionImportName != "SAVE_AS_RUN"  && 
						   functionImportName != "SAVE_N_CLOSE" &&
						   functionImportName != "SAV_RUN_N_REFR"){
					oModel.read("/Message_Data(action='" + functionImport.name + "')",{
						success : function(oData,response) {
							MessageBox.confirm(oData.message, {
								title: bundle.getText('CONFIRM'),                                  
								actions: [MessageBox.Action.YES, MessageBox.Action.NO],
								onClose: function (oAction) {
									if (oAction == 'YES'){
										sap.ui.core.BusyIndicator.show(0);
										oModel.callFunction("/" + functionImportName, {
											method: "POST",
											urlParameters: urlParameters,
											success : function(oData,response) {
												var backAction = false;
												if(functionImport["vui.bodc.workspace.ActionProperties"] && 
												   functionImport["vui.bodc.workspace.ActionProperties"]["ActionType"] &&
												   functionImport["vui.bodc.workspace.ActionProperties"]["ActionType"].String == "Back"){
													backAction = true;
													viewModel.setProperty("/fromSaveBackActionRequired",true);
												}
												viewModel.setProperty("/modelChanged",false);
												if(!oController.getView().getContent()[0].getContent()[0].getFooter().getVisible()){
													oController.getView().getContent()[0].getContent()[0]._$footerWrapper.addClass("vistexHideFooterWrapper");//for hiding footerWrapper
												}
												oController.removenoBackHash();
//												oModel.invalidate();
//												oModel.refresh(true);
//												sap.ui.core.BusyIndicator.hide();
												viewModel.setProperty("/fromSaveDNCMessage",true);
												if(backAction){
													oController.onDiscard();
													setTimeout(function(){
														oController.onBackToSearch();
													}, 3000);													
												}else{
													var messageExists = oController.checkResponseForMessages(oData,response);
													if(messageExists){
														setTimeout(function(){
															oController.showMessagePopover(oController.messageButtonId);
															oController.onDiscard();
														}, 1000);
													}else{
														oController.onDiscard();
													}
												}
											},
											error : function(oData,response){
												sap.ui.core.BusyIndicator.hide();
												setTimeout(function(){
													oController.showMessagePopover(oController.messageButtonId);
												}, 1000);
											}
										});
									}
								}
							});
						}
					});
				}else{				
					sap.ui.core.BusyIndicator.show(0);
					oModel.callFunction("/" + functionImportName, {
						method: "POST",
						urlParameters: urlParameters,
						success : function(oData,response) {
							var backAction = false;
							if(functionImport["vui.bodc.workspace.ActionProperties"] && 
							   functionImport["vui.bodc.workspace.ActionProperties"]["ActionType"] &&
							   functionImport["vui.bodc.workspace.ActionProperties"]["ActionType"].String == "Back" ){
								if(functionImportName != "SAV_RUN_N_REFR"){
									backAction = true;
									viewModel.setProperty("/fromSaveBackActionRequired",true);
								}
							}
							if(functionImportName == "SAVE" || functionImportName == "SAVE_AS_RUN"){
								viewModel.setProperty("/saveOnDetailPerformed",true);
							}
							
							viewModel.setProperty("/modelChanged",false);
							if(!oController.getView().getContent()[0].getContent()[0].getFooter().getVisible()){
								oController.getView().getContent()[0].getContent()[0]._$footerWrapper.addClass("vistexHideFooterWrapper");//for hiding footerWrapper
							}
							oController.removenoBackHash();
							if(functionImportName == "SAVE" || functionImportName == "SAVE_AS_RUN"){
								viewModel.setProperty("/saveOnDetailPerformed",true);
							}
//							oController.refreshSmartTable(oSmartTable);
//							setTimeout(function(){
//								oController.optimizeSmartTable(oSmartTable);
//							}, 1000);
							oController.onClosingDscSideContent(dynamicSideContent);
//							oModel.invalidate();
//							oModel.refresh(true);
//							sap.ui.core.BusyIndicator.hide();
							viewModel.setProperty("/fromSaveDNCMessage",true);
							if(backAction){
								oController.onDiscard();
								setTimeout(function(){
									oController.onBackToSearch();
								}, 3000);													
							}else{
								var messageExists = oController.checkResponseForMessages(oData,response);
								if(messageExists){
									setTimeout(function(){
										oController.showMessagePopover(oController.messageButtonId);
										oController.onDiscard();
									}, 1000);
								}else{
									oController.onDiscard();
								}
							}
						},
						error : function(oData,response){
							sap.ui.core.BusyIndicator.hide();
							setTimeout(function(){
								oController.showMessagePopover(oController.messageButtonId);
							}, 1000);
						}
					});
				}
			}
		},
		onBacktoWorklist: function(oEvent){
			var oController = this;
			this.getOwnerComponent().getRouter().navTo("Worklist", {}, true);
		},
		setToolbarButtonVisibility: function(){
			var oController = this;
			var content, sections;
			var viewModel = oController.getView().getModel("viewModel");
			content = oController.getView();
			while(!content.getSections){
				content = content.getContent()[0];
			}
			sections = content.getSections();
			for(var i = 0 ;i < sections.length; i++){
				var oBlock = sections[i].getSubSections()[0].getBlocks()[0];
				var aContent = oBlock.getContent();
				for( var z = 0; z < aContent.length; z++){
					var oControl = aContent[z];
					if(oController.isControlOfType(oControl, "sap/ui/layout/ResponsiveSplitter")){
						var aMainContent = oControl.getRootPaneContainer().getPanes()[0].getContent().getContent()[0].getContent();
						for( var y = 0; y < aMainContent.length; y++){
							if(oController.isSmartTable(aMainContent[y])) {
								var data = aMainContent[y].data();
								if(data.drilldownTriggered){
									aMainContent[y].data("drilldownTriggered", false);
									if(aMainContent[y].getToolbar().getContent().length > 0){
										for(var i=0; i<aMainContent[y].getToolbar().getContent().length; i++){
											aMainContent[y].getToolbar().getContent()[i].removeStyleClass("vistex-display-none");
										}
									}
									if(data.selectionMode){
										aMainContent[y].getTable().setSelectionMode(data.selectionMode);
									}
									break;
								}
								
							}
						}
					}else if(oController.isSmartTable(oControl)) {
						var data = oControl.data();
						if(data.drilldownTriggered){
							oControl.data("drilldownTriggered", false);
							if(oControl.getToolbar().getContent().length > 0){
								for(var i=0; i<oControl.getToolbar().getContent().length; i++){
									oControl.getToolbar().getContent()[i].removeStyleClass("vistex-display-none");
								}
							}
							if(data.selectionMode){
								oControl.getTable().setSelectionMode(data.selectionMode);
							}
							break;
						}
						
					}
				}
			}
		},
		hidingToolbarContentOnDrilldow: function(oSmartTable){
			if(oSmartTable.getToolbar().getContent().length > 0){
				oSmartTable.data("drilldownTriggered", true);
				if(oSmartTable.getTable().getSelectionMode){
					oSmartTable.data("selectionMode", oSmartTable.getTable().getSelectionMode());
					oSmartTable.getTable().setSelectionMode("None");
				}
				for(var i=0; i<oSmartTable.getToolbar().getContent().length; i++){
					if(oSmartTable.getToolbar().getContent()[i] instanceof sap.m.Title){
						continue;
					}
					oSmartTable.getToolbar().getContent()[i].addStyleClass("vistex-display-none");
				}
				
				oSmartTable.$().find(".sapUiTableCtrlRowScroll tr").css("cursor","initial !important;");
				if(sap.ui.getCore().getElementById(oSmartTable.getToolbar().getId() + "-overflowButton")){
					sap.ui.getCore().getElementById(oSmartTable.getToolbar().getId() + "-overflowButton").addStyleClass("vistex-display-none");
				}
			}
		}
//		onFilterChange: function(oEvent){
//		var oController = this;

//		var sections = oController.getView().getContent()[0];
//		while(true){
//		if(sections.getSections){
//		sections = sections.getSections();
//		break;
//		}else{
//		sections = sections.getContent()[0];
//		}
//		}

//		if(oController.filterChanged) {
//		oController.filterChanged = false;
//		var oModel = oController.getOwnerComponent().getModel();
//		var viewModel = oController.getView().getModel("viewModel");
//		var bundle=oController.getView().getModel("i18n").getResourceBundle();
//		var modelChanged = viewModel.getProperty("/modelChanged");
//		if(modelChanged){
//		MessageBox.confirm(bundle.getText('SAVECHANGES'), {
//		title: bundle.getText('CONFIRM'),                                  
//		actions: [MessageBox.Action.YES, MessageBox.Action.NO],
//		onClose: function (oAction) {
//		if (oAction == 'YES'){
//		oController.onSave();
//		viewModel.setProperty("/modelChanged",false);
//		}else if(oAction == 'NO'){
//		oController.onDiscard();
//		viewModel.setProperty("/modelChanged",false);
//		}
//		}
//		});
//		}
//		}else{
//		oController.filterChanged = true;
//		}
//		}
	});

});